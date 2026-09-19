"""Scenario Document models."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from beanie import Document
from pydantic import Field

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Scenario(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    description: Optional[str] = None
    status: str = "draft"
    duration_minutes: int = 60
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime = Field(default_factory=_utcnow)
    metadata_json: Optional[dict] = None

    class Settings:
        name = "scenarios"

class ScenarioAction(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    scenario_id: uuid.UUID
    trigger_time_offset_sec: int = 0
    action_type: str
    target_entity_type: str
    target_entity_id: uuid.UUID
    payload: dict
    status: str = "pending"
    executed_at: Optional[datetime] = None
    result_json: Optional[dict] = None

    class Settings:
        name = "scenario_actions"
