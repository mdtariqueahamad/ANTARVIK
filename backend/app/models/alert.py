"""Alert Document models."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from beanie import Document
from pydantic import Field

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Alert(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    station_id: uuid.UUID
    asset_id: Optional[uuid.UUID] = None
    severity: str
    category: str = "system"
    title: str
    message: str
    status: str = "active"
    is_acknowledged: bool = False
    acknowledged_by: Optional[uuid.UUID] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    metadata_json: Optional[dict] = None
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "alerts"
