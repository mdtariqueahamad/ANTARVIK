"""Station, Asset, and TelemetryReading Document models."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from beanie import Document, Link
from pydantic import Field

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Station(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    code: str
    latitude: float
    longitude: float
    altitude_m: float = 0.0
    crew_capacity: int
    current_crew: int = 0
    status: str = "operational"
    commissioned_year: Optional[int] = None
    description: Optional[str] = None
    metadata_json: Optional[dict] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "stations"

class Asset(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    station_id: uuid.UUID
    name: str
    asset_type: str
    subsystem: str = "power"
    model_number: Optional[str] = None
    manufacturer: Optional[str] = None
    installed_date: Optional[datetime] = None
    rated_capacity: Optional[float] = None
    rated_capacity_unit: Optional[str] = None
    health_score: float = 100.0
    is_active: bool = True
    metadata_json: Optional[dict] = None
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "assets"

class TelemetryReading(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    asset_id: uuid.UUID
    timestamp: datetime = Field(default_factory=_utcnow)
    metric: str
    value: float
    unit: Optional[str] = None
    quality: str = "good"
    metadata_json: Optional[dict] = None

    class Settings:
        name = "telemetry_readings"

class ChatLog(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    station_code: str
    sender: str
    content: str
    timestamp: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "chat_logs"
