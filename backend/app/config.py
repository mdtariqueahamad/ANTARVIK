"""Application settings via pydantic-settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ANTARVIK_", env_file=".env", extra="ignore")

    # ── Database (MongoDB) ──────────────────────────────
    mongodb_url: str = "mongodb://antarvik:antarvik@db:27017"
    mongodb_db_name: str = "antarvik"

    # ── Redis ──────────────────────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── MQTT ───────────────────────────────────────────────────────────
    mqtt_host: str = "mqtt"
    mqtt_port: int = 1883

    # ── JWT ─────────────────────────────────────────────────────────────
    jwt_secret: str = "antarvik-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # ── Simulation ─────────────────────────────────────────────────────
    sim_seed: int = 42
    sim_tick_seconds: float = 60.0  # 1 simulated minute per tick

    # ── App ─────────────────────────────────────────────────────────────
    debug: bool = True
    api_prefix: str = "/api"


settings = Settings()
