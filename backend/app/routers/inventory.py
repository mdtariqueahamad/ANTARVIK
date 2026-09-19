"""Inventory CRUD and depletion forecast endpoints."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user, require_roles
from app.models.inventory import InventoryItem, InventoryTransaction

# ResupplyWindow removed since we didn't define it in beanie models, skipping or mock
from app.schemas.inventory import (
    DepletionForecast,
    InventoryItemCreate,
    InventoryItemRead,
    InventoryItemUpdate,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])

# ── Inventory Items ────────────────────────────────────────────────────
@router.get("/{station_id}/items", response_model=List[InventoryItemRead])
async def list_inventory(
    station_id: uuid.UUID,
    category: Optional[str] = Query(None),
):
    """List inventory items for a station."""
    query = InventoryItem.find(InventoryItem.station_id == station_id)
    if category:
        query = query.find(InventoryItem.category == category)
    return await query.sort("category", "name").to_list()


@router.post("/{station_id}/items", response_model=InventoryItemRead, status_code=201)
async def create_inventory_item(
    station_id: uuid.UUID,
    body: InventoryItemCreate,
    user=Depends(require_roles(["admin", "logistics"])),
):
    """Create an inventory item."""
    item = InventoryItem(**body.model_dump())
    item.station_id = station_id
    await item.insert()
    return item


@router.patch("/{station_id}/items/{item_id}", response_model=InventoryItemRead)
async def update_inventory_item(
    station_id: uuid.UUID,
    item_id: uuid.UUID,
    body: InventoryItemUpdate,
    user=Depends(require_roles(["admin", "logistics"])),
):
    """Update an inventory item."""
    item = await InventoryItem.find_one(
        InventoryItem.id == item_id,
        InventoryItem.station_id == station_id
    )
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await item.save()
    return item


@router.delete("/{station_id}/items/{item_id}", status_code=204)
async def delete_inventory_item(
    station_id: uuid.UUID,
    item_id: uuid.UUID,
    user=Depends(require_roles(["admin"])),
):
    """Delete an inventory item."""
    item = await InventoryItem.find_one(
        InventoryItem.id == item_id,
        InventoryItem.station_id == station_id
    )
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await item.delete()
