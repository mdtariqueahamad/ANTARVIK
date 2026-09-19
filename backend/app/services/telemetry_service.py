"""Telemetry ingestion service: store to DB, publish to Redis."""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models.station import Asset, TelemetryReading

class TelemetryService:
    """Handles telemetry data ingestion, storage, and retrieval."""

    def __init__(self, redis_client=None) -> None:
        self.redis = redis_client

    async def ingest(
        self,
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
        await reading.insert()

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
                await self.redis.set(
                    f"latest:{asset_id}:{metric}",
                    payload,
                    ex=3600,
                )
            except Exception:
                pass

        return reading

    async def get_latest(
        self,
        asset_id: uuid.UUID,
        metric: Optional[str] = None,
    ) -> List[TelemetryReading]:
        """Get the latest reading(s) for an asset."""
        query = TelemetryReading.find(TelemetryReading.asset_id == asset_id)
        if metric:
            query = query.find(TelemetryReading.metric == metric)
        return await query.sort("-timestamp").limit(1).to_list()

    async def get_history(
        self,
        asset_id: uuid.UUID,
        metric: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[TelemetryReading]:
        """Get historical telemetry readings."""
        query = TelemetryReading.find(TelemetryReading.asset_id == asset_id)
        if metric:
            query = query.find(TelemetryReading.metric == metric)
        if start:
            query = query.find(TelemetryReading.timestamp >= start)
        if end:
            query = query.find(TelemetryReading.timestamp <= end)
        return await query.sort("-timestamp").limit(limit).to_list()

    async def get_latest_per_asset(
        self,
        station_id: uuid.UUID,
    ) -> Dict[str, Dict[str, Any]]:
        """Get latest reading for every asset in a station."""
        assets = await Asset.find(Asset.station_id == station_id).to_list()

        result = {}
        for asset in assets:
            readings = await TelemetryReading.find(
                TelemetryReading.asset_id == asset.id
            ).sort("-timestamp").limit(10).to_list()
            
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
