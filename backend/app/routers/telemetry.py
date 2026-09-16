"""Telemetry reading endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.station import Asset, TelemetryReading
from app.schemas.station import TelemetryReadingCreate, TelemetryReadingRead
from app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/telemetry", tags=["telemetry"])
telemetry_service = TelemetryService()


@router.post("", response_model=TelemetryReadingRead, status_code=201)
async def ingest_reading(
    body: TelemetryReadingCreate,
    db: AsyncSession = Depends(get_db),
):
    """Ingest a single telemetry reading."""
    reading = await telemetry_service.ingest(
        db=db,
        asset_id=body.asset_id,
        metric=body.metric,
        value=body.value,
        unit=body.unit,
        quality=body.quality,
        timestamp=body.timestamp,
        metadata_json=body.metadata_json,
    )
    return reading


@router.post("/batch", response_model=List[TelemetryReadingRead], status_code=201)
async def ingest_batch(
    readings: List[TelemetryReadingCreate],
    db: AsyncSession = Depends(get_db),
):
    """Ingest a batch of telemetry readings."""
    results = []
    for r in readings:
        reading = await telemetry_service.ingest(
            db=db,
            asset_id=r.asset_id,
            metric=r.metric,
            value=r.value,
            unit=r.unit,
            quality=r.quality,
            timestamp=r.timestamp,
            metadata_json=r.metadata_json,
        )
        results.append(reading)
    return results


@router.get("/latest/{asset_id}", response_model=List[TelemetryReadingRead])
async def get_latest(
    asset_id: uuid.UUID,
    metric: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest telemetry reading(s) for an asset."""
    readings = await telemetry_service.get_latest(db, asset_id, metric)
    return readings


@router.get("/history/{asset_id}", response_model=List[TelemetryReadingRead])
async def get_history(
    asset_id: uuid.UUID,
    metric: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(1000, le=10000),
    db: AsyncSession = Depends(get_db),
):
    """Get historical telemetry readings for an asset."""
    readings = await telemetry_service.get_history(
        db, asset_id, metric, start, end, limit
    )
    return readings


@router.get("/station/{station_id}/latest")
async def get_latest_per_station(
    station_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get latest readings for all assets in a station."""
    return await telemetry_service.get_latest_per_asset(db, station_id)
