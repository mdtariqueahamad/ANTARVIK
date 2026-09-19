"""MongoDB database connection and initialization using Motor and Beanie."""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from pydantic import BaseModel

from app.config import settings
import logging

logger = logging.getLogger(__name__)

# This will hold the client
db_client = None

async def init_db() -> None:
    """Initialize MongoDB connection and Beanie models."""
    global db_client
    logger.info(f"Connecting to MongoDB at {settings.mongodb_url}")
    db_client = AsyncIOMotorClient(settings.mongodb_url)
    
    # Import all models here to avoid circular imports
    from app.models.user import User
    from app.models.station import Station, Asset, TelemetryReading
    from app.models.alert import Alert
    from app.models.inventory import InventoryItem, InventoryTransaction
    from app.models.scenario import Scenario, ScenarioAction
    
    await init_beanie(
        database=db_client[settings.mongodb_db_name],
        document_models=[
            User,
            Station,
            Asset,
            TelemetryReading,
            Alert,
            InventoryItem,
            InventoryTransaction,
            Scenario,
            ScenarioAction,
        ],
    )
    logger.info("MongoDB and Beanie initialized successfully.")

async def close_db() -> None:
    """Close MongoDB connection."""
    global db_client
    if db_client:
        db_client.close()
        logger.info("MongoDB connection closed.")

# Dependency for routes, although Beanie models can be queried globally without a session
async def get_db():
    yield db_client[settings.mongodb_db_name]
