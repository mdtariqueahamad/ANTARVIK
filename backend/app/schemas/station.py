"""Pydantic schemas for Station, Asset, TelemetryReading."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Station ────────────────────────────────────────────────────────────
class StationCreate(BaseModel):
    name: str
    code: str = Field(max_length=16)
    latitude: float
    longitude: float
    altitude_m: float = 0.0
    crew_capacity: int
    current_crew: int = 0
    status: str = "operational"
    commissioned_year: Optional[int] = None
    description: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class StationRead(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    latitude: float
    longitude: float
    altitude_m: float
    crew_capacity: int
    current_crew: int
    status: str
    commissioned_year: Optional[int]
    description: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StationUpdate(BaseModel):
    name: Optional[str] = None
    current_crew: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


# ── Asset ──────────────────────────────────────────────────────────────
class AssetCreate(BaseModel):
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
    metadata_json: Optional[Dict[str, Any]] = None


class AssetRead(BaseModel):
    id: uuid.UUID
    station_id: uuid.UUID
    name: str
    asset_type: str
    subsystem: str
    model_number: Optional[str]
    manufacturer: Optional[str]
    installed_date: Optional[datetime]
    rated_capacity: Optional[float]
    rated_capacity_unit: Optional[str]
    health_score: float
    is_active: bool
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime

    model_config = {"from_attributes": True}


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    health_score: Optional[float] = None
    is_active: Optional[bool] = None
    metadata_json: Optional[Dict[str, Any]] = None


# ── Telemetry ──────────────────────────────────────────────────────────
class TelemetryReadingCreate(BaseModel):
    asset_id: uuid.UUID
    timestamp: Optional[datetime] = None
    metric: str
    value: float
    unit: Optional[str] = None
    quality: str = "good"
    metadata_json: Optional[Dict[str, Any]] = None


class TelemetryReadingRead(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    timestamp: datetime
    metric: str
    value: float
    unit: Optional[str]
    quality: str
    metadata_json: Optional[Dict[str, Any]]

    model_config = {"from_attributes": True}
