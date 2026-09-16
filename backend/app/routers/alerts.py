"""Alert endpoints: list, acknowledge, resolve."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.schemas.alert import AlertAcknowledge, AlertRead, AlertResolve
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])
alert_service = AlertService()


@router.get("", response_model=List[AlertRead])
async def list_alerts(
    station_id: Optional[uuid.UUID] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="active|acknowledged|resolved"),
    category: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """List alerts with optional filters."""
    return await alert_service.get_alerts(
        db, station_id, severity, status, category, limit, offset
    )


@router.get("/{alert_id}", response_model=AlertRead)
async def get_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single alert."""
    from sqlalchemy import select
    from app.models.alert import Alert

    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertRead)
async def acknowledge_alert(
    alert_id: uuid.UUID,
    body: AlertAcknowledge,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Acknowledge an alert."""
    alert = await alert_service.acknowledge(db, alert_id, body.acknowledged_by)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertRead)
async def resolve_alert(
    alert_id: uuid.UUID,
    body: AlertResolve,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Resolve an alert."""
    alert = await alert_service.resolve(db, alert_id, body.resolution_note)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/station/{station_id}/counts")
async def alert_counts(
    station_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get active alert counts by severity for a station."""
    return await alert_service.get_active_count(db, station_id)
