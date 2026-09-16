"""Pydantic schemas for User, auth requests/responses."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: str  # EmailStr requires email-validator; keep simple
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    role: str = "engineer"
    station_id: Optional[uuid.UUID] = None


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    full_name: Optional[str]
    role: str
    station_id: Optional[uuid.UUID]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
