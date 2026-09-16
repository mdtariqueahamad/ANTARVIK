import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, close_db
from app.routers import alerts, inventory, stations, telemetry, rag

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    logger.info("Starting up ANTARVIK API...")
    try:
        # Initialize database tables
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
    
    yield
    
    logger.info("Shutting down ANTARVIK API...")
    try:
        # Close database connections
        await close_db()
        logger.info("Database connections closed.")
    except Exception as e:
        logger.error(f"Error closing database: {e}")

app = FastAPI(
    title="ANTARVIK API",
    description="Backend API for ANTARVIK",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS (Allow all for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(alerts.router)
app.include_router(rag.router)
app.include_router(inventory.router)
app.include_router(stations.router)
app.include_router(telemetry.router)

@app.get("/health", tags=["system"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}
