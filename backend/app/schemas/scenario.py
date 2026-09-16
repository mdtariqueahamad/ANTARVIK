"""Pydantic schemas for Scenario runs and fault injection."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ScenarioInject(BaseModel):
    """Request body for POST /api/scenarios/inject"""
    station_id: uuid.UUID
    scenario_type: str = Field(
        description="One of: polar_storm, generator_failure, resupply_delay, sensor_drift"
    )
    parameters: Optional[Dict[str, Any]] = None
    # Example parameters:
    # polar_storm: {duration_hours: 72, wind_speed_ms: 45, temp_drop_c: 15}
    # generator_failure: {generator_id: "...", failure_mode: "coolant_leak"}
    # resupply_delay: {delay_days: 30}
    # sensor_drift: {asset_id: "...", drift_rate: 0.02, metric: "temperature"}


class ScenarioRunRead(BaseModel):
    id: uuid.UUID
    station_id: uuid.UUID
    scenario_type: str
    parameters: Optional[Dict[str, Any]]
    status: str
    results: Optional[Dict[str, Any]]
    risk_score_before: Optional[float]
    risk_score_after: Optional[float]
    triggered_by: Optional[uuid.UUID]
    started_at: datetime
    completed_at: Optional[datetime]
    summary: Optional[str]

    model_config = {"from_attributes": True}
