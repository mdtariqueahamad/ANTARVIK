"""User Document model."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from beanie import Document
from pydantic import Field

VALID_ROLES = ("controller", "logistics", "engineer", "admin")

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class User(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    username: str
    email: str
    hashed_password: str
    full_name: Optional[str] = None
    role: str = "engineer"
    station_id: Optional[uuid.UUID] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=_utcnow)
    last_login: Optional[datetime] = None

    class Settings:
        name = "users"
