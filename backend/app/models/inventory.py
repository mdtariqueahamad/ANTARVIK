"""InventoryItem and ResupplyWindow ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    station_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stations.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    # category: fuel, food, water, medical, spares, scientific
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    min_threshold: Mapped[float] = mapped_column(Float, default=0.0)
    critical_threshold: Mapped[float] = mapped_column(Float, default=0.0)
    daily_consumption_rate: Mapped[float] = mapped_column(Float, default=0.0)
    last_resupply: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class ResupplyWindow(Base):
    __tablename__ = "resupply_windows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    station_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stations.id", ondelete="CASCADE"), nullable=False
    )
    window_name: Mapped[str] = mapped_column(String(128), nullable=False)
    # e.g. "44th ISEA Summer Resupply"
    earliest_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    latest_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    expected_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    transport_mode: Mapped[str] = mapped_column(String(64), default="ship")
    # transport_mode: ship | air | helicopter
    cargo_capacity_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="scheduled")
    # status: scheduled | in_transit | arrived | delayed | cancelled
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
