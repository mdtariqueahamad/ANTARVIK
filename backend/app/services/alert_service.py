"""Cascading alert engine with severity levels.

Implements the signature cascade alert system:
  environmental → thermal → power → fuel → logistics
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert


class AlertService:
    """Alert management with cascade tracking."""

    SEVERITY_ORDER = {"info": 0, "warning": 1, "critical": 2, "emergency": 3}

    def __init__(self, redis_client=None) -> None:
        self.redis = redis_client

    async def create_alert(
        self,
        db: AsyncSession,
        station_id: uuid.UUID,
        severity: str,
        category: str,
        title: str,
        description: Optional[str] = None,
        asset_id: Optional[uuid.UUID] = None,
        parent_alert_id: Optional[uuid.UUID] = None,
        risk_score_impact: Optional[float] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> Alert:
        """Create a new alert."""
        alert = Alert(
            station_id=station_id,
            asset_id=asset_id,
            severity=severity,
            category=category,
            title=title,
            description=description,
            parent_alert_id=parent_alert_id,
            risk_score_impact=risk_score_impact,
            metadata_json=metadata_json,
        )
        db.add(alert)
        await db.flush()

        # Publish to Redis
        if self.redis:
            import json
            try:
                await self.redis.publish(
                    f"alerts:{station_id}",
                    json.dumps({
                        "id": str(alert.id),
                        "severity": severity,
                        "category": category,
                        "title": title,
                        "station_id": str(station_id),
                    }),
                )
            except Exception:
                pass

        return alert

    async def create_cascade(
        self,
        db: AsyncSession,
        station_id: uuid.UUID,
        chain: List[Dict[str, Any]],
    ) -> List[Alert]:
        """Create a cascade of linked alerts.

        Each alert in the chain references the previous as parent_alert_id.
        """
        alerts = []
        parent_id = None
        for step in chain:
            alert = await self.create_alert(
                db=db,
                station_id=station_id,
                severity=step.get("severity", "warning"),
                category=step.get("category", "cascade"),
                title=step.get("title", "Cascade Alert"),
                description=step.get("description"),
                asset_id=step.get("asset_id"),
                parent_alert_id=parent_id,
                risk_score_impact=step.get("risk_score_impact"),
                metadata_json=step.get("metadata_json"),
            )
            parent_id = alert.id
            alerts.append(alert)
        return alerts

    async def get_alerts(
        self,
        db: AsyncSession,
        station_id: Optional[uuid.UUID] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Alert]:
        """Get alerts with optional filters."""
        query = select(Alert)
        if station_id:
            query = query.where(Alert.station_id == station_id)
        if severity:
            query = query.where(Alert.severity == severity)
        if status:
            query = query.where(Alert.status == status)
        if category:
            query = query.where(Alert.category == category)
        query = query.order_by(desc(Alert.triggered_at)).offset(offset).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def acknowledge(
        self,
        db: AsyncSession,
        alert_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Alert]:
        """Acknowledge an alert."""
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalar_one_or_none()
        if alert:
            alert.status = "acknowledged"
            alert.acknowledged_at = datetime.now(timezone.utc)
            alert.acknowledged_by = user_id
            await db.flush()
        return alert

    async def resolve(
        self,
        db: AsyncSession,
        alert_id: uuid.UUID,
        resolution_note: Optional[str] = None,
    ) -> Optional[Alert]:
        """Resolve an alert."""
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalar_one_or_none()
        if alert:
            alert.status = "resolved"
            alert.resolved_at = datetime.now(timezone.utc)
            if resolution_note and alert.metadata_json:
                alert.metadata_json["resolution_note"] = resolution_note
            elif resolution_note:
                alert.metadata_json = {"resolution_note": resolution_note}
            await db.flush()
        return alert

    async def get_active_count(
        self,
        db: AsyncSession,
        station_id: uuid.UUID,
    ) -> Dict[str, int]:
        """Count active alerts by severity for a station."""
        result = await db.execute(
            select(Alert)
            .where(Alert.station_id == station_id)
            .where(Alert.status == "active")
        )
        alerts = result.scalars().all()
        counts = {"info": 0, "warning": 0, "critical": 0, "emergency": 0, "total": 0}
        for a in alerts:
            counts[a.severity] = counts.get(a.severity, 0) + 1
            counts["total"] += 1
        return counts
