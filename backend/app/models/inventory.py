"""Inventory Document models."""
import uuid
from datetime import date, datetime, timezone
from typing import Optional
from beanie import Document
from pydantic import Field

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class InventoryItem(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    station_id: uuid.UUID
    name: str
    category: str
    sku: Optional[str] = None
    quantity: float = 0.0
    unit: str = "unit"
    minimum_threshold: float = 0.0
    critical_threshold: float = 0.0
    location_details: Optional[str] = None
    supplier: Optional[str] = None
    last_restock_date: Optional[date] = None
    expiry_date: Optional[date] = None
    metadata_json: Optional[dict] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "inventory_items"

class InventoryTransaction(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    item_id: uuid.UUID
    transaction_type: str
    quantity_change: float
    user_id: Optional[uuid.UUID] = None
    timestamp: datetime = Field(default_factory=_utcnow)
    reference_id: Optional[str] = None
    notes: Optional[str] = None

    class Settings:
        name = "inventory_transactions"
