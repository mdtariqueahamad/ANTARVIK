import asyncio
import json
import logging
from datetime import datetime
from dataclasses import asdict
import httpx
import os
import pandas as pd

from app.config import settings
from app.simulators.environment import EnvironmentSimulator
from app.simulators.energy import EnergySimulator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("simulator")

# Load real datasets
try:
    df_bharati = pd.read_excel("/app/data/Bharati - AWS_2025_filtered_data.xlsx")
    df_maitri = pd.read_excel("/app/data/Maitri - AWS_2016_filtered_data.xlsx")
    logger.info(f"Loaded real datasets. Bharati: {len(df_bharati)} rows. Maitri: {len(df_maitri)} rows.")
except Exception as e:
    logger.error(f"Failed to load datasets: {e}")
    df_bharati = pd.DataFrame()
    df_maitri = pd.DataFrame()

class DataDrivenSimulationRunner:
    def __init__(self, station_code: str, df: pd.DataFrame):
        self.station_code = station_code
        self.df = df
        self.data_index = 0
        self.max_index = len(df) if not df.empty else 0
        
        # Bharati has PV and Wind
        pv_cap = 50.0 if station_code == "BHARATI" else 0.0
        wind_cap = 100.0 if station_code == "BHARATI" else 0.0
        
        # We still use the energy simulator to calculate fake power math based on real temp/wind
        self.energy_sim = EnergySimulator(
            station_code=station_code,
            seed=settings.sim_seed,
            pv_capacity_kwp=pv_cap,
            wind_capacity_kw=wind_cap
        )
        
    def step(self):
        # Default mock values if data is missing
        temp, ws, wd, pressure, rh = -20.0, 15.0, 180, 980.0, 50.0
        
        if self.max_index > 0:
            row = self.df.iloc[self.data_index]
            
            # Extract real data safely
            temp = float(row.get('tempr', temp))
            ws = float(row.get('ws', ws))
            wd = float(row.get('wd', wd))
            pressure = float(row.get('ap', pressure))
            rh = float(row.get('rh', rh))
            
            # Loop data
            self.data_index = (self.data_index + 1) % self.max_index
            
        # We mock an environment state wrapper for the Energy Simulator
        from app.simulators.environment import EnvironmentState
        env_state = EnvironmentState(
            temperature_c=temp,
            wind_speed_ms=ws,
            wind_direction_deg=wd,
            solar_irradiance_wm2=150.0, # Mocked solar
            pressure_hpa=pressure
        )
        
        grid_state = self.energy_sim.step(env_state, 12)
        
        # Inject the real RH and pressure into the returned payload so the UI can see it
        output_state = asdict(grid_state)
        output_state['real_weather'] = {
            'temp': round(temp, 1),
            'ws': round(ws, 1),
            'wd': round(wd, 0),
            'pressure': round(pressure, 1),
            'rh': round(rh, 1)
        }
        
        return output_state

async def publish_loop(broker: str, port: int, runners: list):
    # In a real app we'd use aiomqtt. For this quick update to the frontend, 
    # we can actually just push it to a Redis key or let the frontend poll.
    # We will use the existing mqtt logic.
    import aiomqtt
    client = aiomqtt.Client(hostname=broker, port=port)
    
    while True:
        try:
            logger.info(f"Connecting to MQTT broker at {broker}:{port}...")
            async with client:
                logger.info("Connected to MQTT broker.")
                while True:
                    await run_step(runners, client)
                    await asyncio.sleep(5) # 5 Second interval as requested
        except aiomqtt.MqttError as e:
            logger.warning(f"MQTT connection failed ({e}). Running simulation locally...")
            for _ in range(5):
                await run_step(runners, None)
                await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            await asyncio.sleep(5)

async def run_step(runners, client):
    for runner in runners:
        state = runner.step()
        topic = f"antarvik/telemetry/{runner.station_code}/data"
        payload = json.dumps(state)
        
        if client:
            await client.publish(topic, payload)
            logger.info(f"[{runner.station_code}] Published real dataset frame")

async def main():
    runners = [
        DataDrivenSimulationRunner("MAITRI", df_maitri),
        DataDrivenSimulationRunner("BHARATI", df_bharati)
    ]
    
    broker = settings.mqtt_host
    if broker == "mqtt":
        broker = "localhost" # Fallback removed in previous fix, but let's keep it clean
        
    await publish_loop('mqtt', settings.mqtt_port, runners)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
