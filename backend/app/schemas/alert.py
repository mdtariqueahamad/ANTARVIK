"""Pydantic schemas for Alerts."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class AlertRead(BaseModel):
    id: uuid.UUID
    station_id: uuid.UUID
    asset_id: Optional[uuid.UUID]
    severity: str
    category: str
    title: str
    description: Optional[str]
    status: str
    triggered_at: datetime
    acknowledged_at: Optional[datetime]
    acknowledged_by: Optional[uuid.UUID]
    resolved_at: Optional[datetime]
    parent_alert_id: Optional[uuid.UUID]
    risk_score_impact: Optional[float]
    metadata_json: Optional[Dict[str, Any]]

    model_config = {"from_attributes": True}


class AlertAcknowledge(BaseModel):
    acknowledged_by: uuid.UUID


class AlertResolve(BaseModel):
    resolution_note: Optional[str] = None
