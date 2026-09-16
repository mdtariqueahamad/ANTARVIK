"""Inventory CRUD and depletion forecast endpoints."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models.inventory import InventoryItem, ResupplyWindow
from app.schemas.inventory import (
    DepletionForecast,
    InventoryItemCreate,
    InventoryItemRead,
    InventoryItemUpdate,
    ResupplyWindowCreate,
    ResupplyWindowRead,
)
from app.services.forecast_service import ForecastService

router = APIRouter(prefix="/inventory", tags=["inventory"])
forecast_service = ForecastService()


# ── Inventory Items ────────────────────────────────────────────────────
@router.get("/{station_id}/items", response_model=List[InventoryItemRead])
async def list_inventory(
    station_id: uuid.UUID,
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List inventory items for a station."""
    query = select(InventoryItem).where(InventoryItem.station_id == station_id)
    if category:
        query = query.where(InventoryItem.category == category)
    query = query.order_by(InventoryItem.category, InventoryItem.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{station_id}/items", response_model=InventoryItemRead, status_code=201)
async def create_inventory_item(
    station_id: uuid.UUID,
    body: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin", "logistics"])),
):
    """Create an inventory item."""
    item = InventoryItem(**body.model_dump())
    item.station_id = station_id
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.patch("/{station_id}/items/{item_id}", response_model=InventoryItemRead)
async def update_inventory_item(
    station_id: uuid.UUID,
    item_id: uuid.UUID,
    body: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin", "logistics"])),
):
    """Update an inventory item."""
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.station_id == station_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{station_id}/items/{item_id}", status_code=204)
async def delete_inventory_item(
    station_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin"])),
):
    """Delete an inventory item."""
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.station_id == station_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await db.delete(item)


# ── Depletion Forecast ─────────────────────────────────────────────────
@router.get("/{station_id}/forecast", response_model=DepletionForecast)
async def get_depletion_forecast(
    station_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Compute and return depletion forecast for a station."""
    return await forecast_service.compute_forecast(db, station_id)


# ── Resupply Windows ──────────────────────────────────────────────────
@router.get("/{station_id}/resupply", response_model=List[ResupplyWindowRead])
async def list_resupply_windows(
    station_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List resupply windows for a station."""
    result = await db.execute(
        select(ResupplyWindow)
        .where(ResupplyWindow.station_id == station_id)
        .order_by(ResupplyWindow.earliest_date)
    )
    return result.scalars().all()


@router.post("/{station_id}/resupply", response_model=ResupplyWindowRead, status_code=201)
async def create_resupply_window(
    station_id: uuid.UUID,
    body: ResupplyWindowCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin", "logistics"])),
):
    """Create a resupply window."""
    window = ResupplyWindow(**body.model_dump())
    window.station_id = station_id
    db.add(window)
    await db.flush()
    await db.refresh(window)
    return window
