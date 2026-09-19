"""Station and Asset CRUD endpoints."""
from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user, require_roles
from app.models.station import Asset, Station
from app.schemas.station import (
    AssetCreate,
    AssetRead,
    AssetUpdate,
    StationCreate,
    StationRead,
    StationUpdate,
)

router = APIRouter(prefix="/stations", tags=["stations"])

@router.get("", response_model=List[StationRead])
async def list_stations():
    """List all stations."""
    return await Station.find_all().sort("name").to_list()

@router.get("/{station_id}", response_model=StationRead)
async def get_station(station_id: uuid.UUID):
    """Get a single station by ID."""
    station = await Station.find_one(Station.id == station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return station

@router.post("", response_model=StationRead, status_code=201)
async def create_station(
    body: StationCreate,
    user=Depends(require_roles(["admin"])),
):
    """Create a new station (admin only)."""
    station = Station(**body.model_dump())
    await station.insert()
    return station

@router.patch("/{station_id}", response_model=StationRead)
async def update_station(
    station_id: uuid.UUID,
    body: StationUpdate,
    user=Depends(require_roles(["admin", "controller"])),
):
    """Update a station."""
    station = await Station.find_one(Station.id == station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(station, key, value)
    await station.save()
    return station

@router.delete("/{station_id}", status_code=204)
async def delete_station(
    station_id: uuid.UUID,
    user=Depends(require_roles(["admin"])),
):
    """Delete a station (admin only)."""
    station = await Station.find_one(Station.id == station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    await station.delete()

@router.get("/{station_id}/assets", response_model=List[AssetRead])
async def list_assets(
    station_id: uuid.UUID,
    asset_type: Optional[str] = Query(None),
    subsystem: Optional[str] = Query(None),
):
    """List assets for a station, with optional filters."""
    query = Asset.find(Asset.station_id == station_id)
    if asset_type:
        query = query.find(Asset.asset_type == asset_type)
    if subsystem:
        query = query.find(Asset.subsystem == subsystem)
    return await query.sort("name").to_list()

@router.get("/{station_id}/assets/{asset_id}", response_model=AssetRead)
async def get_asset(
    station_id: uuid.UUID,
    asset_id: uuid.UUID,
):
    """Get a single asset."""
    asset = await Asset.find_one(Asset.id == asset_id, Asset.station_id == station_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.post("/{station_id}/assets", response_model=AssetRead, status_code=201)
async def create_asset(
    station_id: uuid.UUID,
    body: AssetCreate,
    user=Depends(require_roles(["admin", "engineer"])),
):
    """Create a new asset."""
    asset = Asset(**body.model_dump())
    asset.station_id = station_id
    await asset.insert()
    return asset

@router.patch("/{station_id}/assets/{asset_id}", response_model=AssetRead)
async def update_asset(
    station_id: uuid.UUID,
    asset_id: uuid.UUID,
    body: AssetUpdate,
    user=Depends(require_roles(["admin", "engineer"])),
):
    """Update an asset."""
    asset = await Asset.find_one(Asset.id == asset_id, Asset.station_id == station_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)
    await asset.save()
    return asset
