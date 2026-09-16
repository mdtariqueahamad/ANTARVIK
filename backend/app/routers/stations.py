"""Station and Asset CRUD endpoints."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, require_roles
from app.database import get_db
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


# ── Stations ───────────────────────────────────────────────────────────
@router.get("", response_model=List[StationRead])
async def list_stations(
    db: AsyncSession = Depends(get_db),
):
    """List all stations."""
    result = await db.execute(select(Station).order_by(Station.name))
    return result.scalars().all()


@router.get("/{station_id}", response_model=StationRead)
async def get_station(
    station_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single station by ID."""
    result = await db.execute(select(Station).where(Station.id == station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return station


@router.post("", response_model=StationRead, status_code=201)
async def create_station(
    body: StationCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin"])),
):
    """Create a new station (admin only)."""
    station = Station(**body.model_dump())
    db.add(station)
    await db.flush()
    await db.refresh(station)
    return station


@router.patch("/{station_id}", response_model=StationRead)
async def update_station(
    station_id: uuid.UUID,
    body: StationUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin", "controller"])),
):
    """Update a station."""
    result = await db.execute(select(Station).where(Station.id == station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(station, key, value)
    await db.flush()
    await db.refresh(station)
    return station


@router.delete("/{station_id}", status_code=204)
async def delete_station(
    station_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin"])),
):
    """Delete a station (admin only)."""
    result = await db.execute(select(Station).where(Station.id == station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    await db.delete(station)


# ── Assets ─────────────────────────────────────────────────────────────
@router.get("/{station_id}/assets", response_model=List[AssetRead])
async def list_assets(
    station_id: uuid.UUID,
    asset_type: Optional[str] = Query(None),
    subsystem: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List assets for a station, with optional filters."""
    query = select(Asset).where(Asset.station_id == station_id)
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    if subsystem:
        query = query.where(Asset.subsystem == subsystem)
    query = query.order_by(Asset.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{station_id}/assets/{asset_id}", response_model=AssetRead)
async def get_asset(
    station_id: uuid.UUID,
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single asset."""
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.station_id == station_id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.post("/{station_id}/assets", response_model=AssetRead, status_code=201)
async def create_asset(
    station_id: uuid.UUID,
    body: AssetCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin", "engineer"])),
):
    """Create a new asset."""
    asset = Asset(**body.model_dump())
    asset.station_id = station_id
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return asset


@router.patch("/{station_id}/assets/{asset_id}", response_model=AssetRead)
async def update_asset(
    station_id: uuid.UUID,
    asset_id: uuid.UUID,
    body: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_roles(["admin", "engineer"])),
):
    """Update an asset."""
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.station_id == station_id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)
    await db.flush()
    await db.refresh(asset)
    return asset
