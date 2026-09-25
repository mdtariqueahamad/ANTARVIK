import asyncio
import time
import sqlite3
import httpx
import logging
from datetime import datetime, timezone
import json
import uuid

import sys
import os
# Ensure app modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.schemas import telemetry_pb2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] DTN-Node: %(message)s")
logger = logging.getLogger("dtn_node")

HQ_URL = "http://localhost:8000/telemetry/dtn-sync"
STATION_CODE = os.environ.get("STATION_CODE", "MAITRI")
SYNC_INTERVAL = 10 # Seconds between DTN flush attempts

# Local Store-and-Forward Buffer Database
DB_FILE = f"dtn_buffer_{STATION_CODE}.sqlite"

def init_dtn_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS dtn_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id TEXT,
            metric TEXT,
            value REAL,
            unit TEXT,
            quality TEXT,
            timestamp_ms INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS dtn_chat_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            content TEXT,
            timestamp_ms INTEGER
        )
    ''')
    conn.commit()
    conn.close()

def queue_reading(asset_id, metric, value, unit, quality, timestamp_ms):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO dtn_queue (asset_id, metric, value, unit, quality, timestamp_ms) VALUES (?, ?, ?, ?, ?, ?)",
        (asset_id, metric, value, unit, quality, timestamp_ms)
    )
    conn.commit()
    conn.close()

def queue_chat(sender, content, timestamp_ms):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO dtn_chat_queue (sender, content, timestamp_ms) VALUES (?, ?, ?)",
        (sender, content, timestamp_ms)
    )
    conn.commit()
    conn.close()

def fetch_queued_readings(limit=1000):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, asset_id, metric, value, unit, quality, timestamp_ms FROM dtn_queue LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return rows

def fetch_queued_chats(limit=100):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, sender, content, timestamp_ms FROM dtn_chat_queue LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return rows

def clear_synced_readings(row_ids):
    if not row_ids: return
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    placeholders = ",".join(["?"] * len(row_ids))
    c.execute(f"DELETE FROM dtn_queue WHERE id IN ({placeholders})", row_ids)
    conn.commit()
    conn.close()

def clear_synced_chats(row_ids):
    if not row_ids: return
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    placeholders = ",".join(["?"] * len(row_ids))
    c.execute(f"DELETE FROM dtn_chat_queue WHERE id IN ({placeholders})", row_ids)
    conn.commit()
    conn.close()

async def sensor_simulator():
    """Generates fake data directly into the DTN queue."""
    # Using deterministic mock UUIDs for station assets to prevent unique constraint errors
    asset_temp = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{STATION_CODE}_temp"))
    asset_wind = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{STATION_CODE}_wind"))
    
    while True:
        now_ms = int(time.time() * 1000)
        # Fake temp
        queue_reading(asset_temp, "temperature", -25.5, "C", "good", now_ms)
        # Fake wind
        queue_reading(asset_wind, "wind_speed", 18.2, "m/s", "good", now_ms)
        
        logger.info(f"Buffered 2 readings to local DTN queue (Total queued).")
        await asyncio.sleep(5)

async def dtn_flush_worker():
    """Reads from local queue and sends Protobuf to HQ."""
    async with httpx.AsyncClient() as client:
        while True:
            readings = fetch_queued_readings(limit=500)
            chats = fetch_queued_chats(limit=100)
            
            if not readings and not chats:
                await asyncio.sleep(SYNC_INTERVAL)
                continue
                
            logger.info(f"Attempting to transmit {len(readings)} readings and {len(chats)} chats to HQ via Protobuf...")
            
            # Serialize to Protobuf
            batch = telemetry_pb2.TelemetryBatch()
            batch.station_code = STATION_CODE
            
            reading_ids = []
            for row in readings:
                r_id, asset_id, metric, value, unit, quality, ts_ms = row
                reading_ids.append(r_id)
                
                pb_reading = batch.readings.add()
                pb_reading.asset_id = asset_id
                pb_reading.metric = metric
                pb_reading.value = value
                pb_reading.unit = unit
                pb_reading.quality = quality
                pb_reading.timestamp_ms = ts_ms

            chat_ids = []
            for row in chats:
                c_id, sender, content, ts_ms = row
                chat_ids.append(c_id)
                
                pb_chat = batch.chat_messages.add()
                pb_chat.sender = sender
                pb_chat.content = content
                pb_chat.timestamp_ms = ts_ms
                
            binary_payload = batch.SerializeToString()
            
            try:
                response = await client.post(
                    HQ_URL,
                    content=binary_payload,
                    headers={"Content-Type": "application/x-protobuf"},
                    timeout=10.0
                )
                
                if response.status_code == 201 or response.status_code == 200:
                    clear_synced_readings(reading_ids)
                    clear_synced_chats(chat_ids)
                    logger.info(f"Successfully transmitted and cleared {len(readings)} readings and {len(chats)} chats. Network Stable.")
                else:
                    logger.warning(f"HQ rejected payload (Status {response.status_code}): {response.text}")
                    
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                logger.error(f"DTN Network Disruption! HQ unreachable. Keeping data in local buffer. Retrying in {SYNC_INTERVAL}s")
                
            await asyncio.sleep(SYNC_INTERVAL)

async def main():
    logger.info(f"Starting Antarctic Edge DTN Node for {STATION_CODE}")
    init_dtn_db()
    
    # Run simulator and DTN flush concurrently
    await asyncio.gather(
        sensor_simulator(),
        dtn_flush_worker()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down DTN Node.")
