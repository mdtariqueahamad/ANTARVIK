"""Pydantic schemas for Inventory and ResupplyWindow."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── InventoryItem ──────────────────────────────────────────────────────
class InventoryItemCreate(BaseModel):
    station_id: uuid.UUID
    category: str
    name: str
    unit: str
    quantity: float
    min_threshold: float = 0.0
    critical_threshold: float = 0.0
    daily_consumption_rate: float = 0.0
    notes: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class InventoryItemRead(BaseModel):
    id: uuid.UUID
    station_id: uuid.UUID
    category: str
    name: str
    unit: str
    quantity: float
    min_threshold: float
    critical_threshold: float
    daily_consumption_rate: float
    last_resupply: Optional[datetime]
    notes: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryItemUpdate(BaseModel):
    quantity: Optional[float] = None
    daily_consumption_rate: Optional[float] = None
    min_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    notes: Optional[str] = None


# ── ResupplyWindow ─────────────────────────────────────────────────────
class ResupplyWindowCreate(BaseModel):
    station_id: uuid.UUID
    window_name: str
    earliest_date: date
    latest_date: date
    expected_date: Optional[date] = None
    transport_mode: str = "ship"
    cargo_capacity_kg: Optional[float] = None
    status: str = "scheduled"
    metadata_json: Optional[Dict[str, Any]] = None


class ResupplyWindowRead(BaseModel):
    id: uuid.UUID
    station_id: uuid.UUID
    window_name: str
    earliest_date: date
    latest_date: date
    expected_date: Optional[date]
    transport_mode: str
    cargo_capacity_kg: Optional[float]
    status: str
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Depletion Forecast ─────────────────────────────────────────────────
class DepletionForecastItem(BaseModel):
    item_id: uuid.UUID
    name: str
    category: str
    current_quantity: float
    daily_rate: float
    days_remaining: Optional[float]
    exhaustion_date: Optional[date]
    status: str  # ok | warning | critical


class DepletionForecast(BaseModel):
    station_id: uuid.UUID
    computed_at: datetime
    items: List[DepletionForecastItem]
    next_resupply: Optional[date]
    items_at_risk: int
