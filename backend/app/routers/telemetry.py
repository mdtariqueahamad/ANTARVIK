"""Telemetry reading endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from datetime import datetime, timezone
from app.auth import get_current_user
from app.models.station import Asset, TelemetryReading
from app.schemas.station import TelemetryReadingCreate, TelemetryReadingRead
from app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/telemetry", tags=["telemetry"])
telemetry_service = TelemetryService()


@router.post("", response_model=TelemetryReadingRead, status_code=201)
async def ingest_reading(
    body: TelemetryReadingCreate,
):
    """Ingest a single telemetry reading."""
    reading = await telemetry_service.ingest(
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
):
    """Ingest a batch of telemetry readings."""
    results = []
    for r in readings:
        reading = await telemetry_service.ingest(
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
):
    """Get the latest telemetry reading(s) for an asset."""
    readings = await telemetry_service.get_latest(asset_id, metric)
    return readings


@router.get("/history/{asset_id}", response_model=List[TelemetryReadingRead])
async def get_history(
    asset_id: uuid.UUID,
    metric: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(1000, le=10000),
):
    """Get historical telemetry readings for an asset."""
    readings = await telemetry_service.get_history(asset_id, metric, start, end, limit
    )
    return readings


@router.get("/station/{station_id}/latest")
async def get_latest_per_station(
    station_id: uuid.UUID,
) -> Dict[str, Any]:
    """Get latest readings for all assets in a station."""
    return await telemetry_service.get_latest_per_asset(station_id)


@router.post("/dtn-sync", status_code=201)
async def dtn_sync(request: Request):
    """
    Delay-Tolerant Network (DTN) Protobuf Sync Endpoint.
    Receives compressed binary telemetry packets from edge nodes.
    """
    from app.schemas import telemetry_pb2
    
    # Read raw binary data
    payload = await request.body()
    
    # Deserialize protobuf
    batch = telemetry_pb2.TelemetryBatch()
    try:
        batch.ParseFromString(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid protobuf payload: {e}")
        
    station_code = batch.station_code
    
    results = []
    # Save the batch using our standard TelemetryService
    for pb_reading in batch.readings:
        try:
            asset_uuid = uuid.UUID(pb_reading.asset_id)
        except ValueError:
            continue # Skip invalid UUIDs safely
            
        reading = await telemetry_service.ingest(
            asset_id=asset_uuid,
            metric=pb_reading.metric,
            value=pb_reading.value,
            unit=pb_reading.unit,
            quality=pb_reading.quality,
            timestamp=datetime.fromtimestamp(pb_reading.timestamp_ms / 1000.0, tz=timezone.utc),
            metadata_json={"source": "dtn_sync", "station": station_code}
        )
        results.append(str(reading.id))
        
    return {"status": "ok", "synced_records": len(results), "station_code": station_code}
