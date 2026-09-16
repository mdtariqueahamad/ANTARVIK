import asyncio
import json
import logging
from dataclasses import asdict

import aiomqtt

from app.config import settings
from app.simulators.environment import EnvironmentSimulator
from app.simulators.energy import EnergySimulator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("simulator")

class SimulationRunner:
    def __init__(self, station_code: str):
        self.station_code = station_code
        self.env_sim = EnvironmentSimulator(station_code=station_code, seed=settings.sim_seed)
        
        # Bharati has PV and Wind
        pv_cap = 50.0 if station_code == "BHARATI" else 0.0
        wind_cap = 100.0 if station_code == "BHARATI" else 0.0
        
        self.energy_sim = EnergySimulator(
            station_code=station_code,
            seed=settings.sim_seed,
            pv_capacity_kwp=pv_cap,
            wind_capacity_kw=wind_cap
        )
        
        self.day = 1
        self.hour = 0
        
    def step(self):
        env_state = self.env_sim.step(self.day, self.hour)
        grid_state = self.energy_sim.step(env_state, self.hour)
        
        prev_hour = self.hour
        self.hour += 1
        if self.hour >= 24:
            self.hour = 0
            self.day += 1
            if self.day > 365:
                self.day = 1
                
        return prev_hour, env_state, grid_state

async def publish_loop(broker: str, port: int, runners: list):
    """Attempt to publish if MQTT is available, otherwise log output and retry later."""
    client = aiomqtt.Client(hostname=broker, port=port)
    
    while True:
        try:
            logger.info(f"Connecting to MQTT broker at {broker}:{port}...")
            async with client:
                logger.info("Connected to MQTT broker.")
                while True:
                    await run_step(runners, client)
                    await asyncio.sleep(2)
        except aiomqtt.MqttError as e:
            logger.warning(f"MQTT connection failed ({e}). Running simulation locally...")
            # Fallback loop without publishing
            for _ in range(5):
                await run_step(runners, None)
                await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            await asyncio.sleep(5)

async def run_step(runners, client: aiomqtt.Client | None):
    for runner in runners:
        hour, env_state, grid_state = runner.step()
        
        env_topic = f"antarvik/telemetry/{runner.station_code}/environment/current"
        grid_topic = f"antarvik/telemetry/{runner.station_code}/energy/current"
        
        env_payload = json.dumps(asdict(env_state))
        grid_payload = json.dumps(asdict(grid_state))
        
        if client:
            await client.publish(env_topic, env_payload)
            await client.publish(grid_topic, grid_payload)
            logger.info(f"[{runner.station_code}] Published telemetry for Day {runner.day} Hour {hour}")
        else:
            logger.info(f"[{runner.station_code}] Simulated Day {runner.day} Hour {hour} (MQTT skipped)")

async def main():
    runners = [
        SimulationRunner("MAITRI"),
        SimulationRunner("BHARATI")
    ]
    
    # Fallback to localhost if default docker-compose host is used but we're running locally
    broker = settings.mqtt_host
    # removed localhost fallback
        
    await publish_loop(broker, settings.mqtt_port, runners)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Simulation stopped by user.")
