"""Telemetry ingestion service: store to DB, publish to Redis."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.station import Asset, TelemetryReading


class TelemetryService:
    """Handles telemetry data ingestion, storage, and retrieval."""

    def __init__(self, redis_client=None) -> None:
        self.redis = redis_client

    async def ingest(
        self,
        db: AsyncSession,
        asset_id: uuid.UUID,
        metric: str,
        value: float,
        unit: Optional[str] = None,
        quality: str = "good",
        timestamp: Optional[datetime] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> TelemetryReading:
        """Ingest a single telemetry reading."""
        reading = TelemetryReading(
            asset_id=asset_id,
            metric=metric,
            value=value,
            unit=unit,
            quality=quality,
            timestamp=timestamp or datetime.now(timezone.utc),
            metadata_json=metadata_json,
        )
        db.add(reading)
        await db.flush()

        # Publish to Redis for real-time consumers
        if self.redis:
            channel = f"telemetry:{asset_id}:{metric}"
            payload = json.dumps({
                "id": str(reading.id),
                "asset_id": str(asset_id),
                "metric": metric,
                "value": value,
                "unit": unit,
                "quality": quality,
                "timestamp": reading.timestamp.isoformat(),
            })
            try:
                await self.redis.publish(channel, payload)
                # Also store latest value
                await self.redis.set(
                    f"latest:{asset_id}:{metric}",
                    payload,
                    ex=3600,  # 1 hour TTL
                )
            except Exception:
                pass  # Redis failure shouldn't block ingestion

        return reading

    async def ingest_batch(
        self,
        db: AsyncSession,
        readings: List[Dict[str, Any]],
    ) -> List[TelemetryReading]:
        """Ingest multiple telemetry readings."""
        result = []
        for r in readings:
            reading = await self.ingest(db, **r)
            result.append(reading)
        return result

    async def get_latest(
        self,
        db: AsyncSession,
        asset_id: uuid.UUID,
        metric: Optional[str] = None,
    ) -> List[TelemetryReading]:
        """Get the latest reading(s) for an asset."""
        query = select(TelemetryReading).where(
            TelemetryReading.asset_id == asset_id
        )
        if metric:
            query = query.where(TelemetryReading.metric == metric)
        query = query.order_by(desc(TelemetryReading.timestamp)).limit(1)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_history(
        self,
        db: AsyncSession,
        asset_id: uuid.UUID,
        metric: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[TelemetryReading]:
        """Get historical telemetry readings."""
        query = select(TelemetryReading).where(
            TelemetryReading.asset_id == asset_id
        )
        if metric:
            query = query.where(TelemetryReading.metric == metric)
        if start:
            query = query.where(TelemetryReading.timestamp >= start)
        if end:
            query = query.where(TelemetryReading.timestamp <= end)
        query = query.order_by(desc(TelemetryReading.timestamp)).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_latest_per_asset(
        self,
        db: AsyncSession,
        station_id: uuid.UUID,
    ) -> Dict[str, Dict[str, Any]]:
        """Get latest reading for every asset in a station."""
        # Get all assets for station
        assets_result = await db.execute(
            select(Asset).where(Asset.station_id == station_id)
        )
        assets = assets_result.scalars().all()

        result = {}
        for asset in assets:
            readings_result = await db.execute(
                select(TelemetryReading)
                .where(TelemetryReading.asset_id == asset.id)
                .order_by(desc(TelemetryReading.timestamp))
                .limit(10)
            )
            readings = readings_result.scalars().all()
            if readings:
                result[str(asset.id)] = {
                    "asset_name": asset.name,
                    "asset_type": asset.asset_type,
                    "readings": [
                        {
                            "metric": r.metric,
                            "value": r.value,
                            "unit": r.unit,
                            "quality": r.quality,
                            "timestamp": r.timestamp.isoformat(),
                        }
                        for r in readings
                    ],
                }
        return result
