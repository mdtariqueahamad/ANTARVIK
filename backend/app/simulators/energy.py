"""Microgrid energy simulator.

Models:
  - 3 × 240 kVA diesel gensets (duty / standby / emergency)
  - PV arrays (Bharati) and wind turbines
  - Battery bank with SOC/SOH and cold derating

References:
  - Brazilian Antarctic Station Comandante Ferraz hybrid study:
    3×240 kVA gensets, ~117 kW mean electrical load
  - NREL REopt South Pole study: PV+wind+battery, 96% fuel-savings potential
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

from app.simulators.environment import EnvironmentState


@dataclass
class GensetState:
    """State of a single diesel generator."""
    id: str
    rated_kva: float = 240.0
    power_factor: float = 0.8
    rated_kw: float = 192.0  # 240 * 0.8
    current_load_kw: float = 0.0
    fuel_rate_lph: float = 0.0  # litres per hour
    runtime_hours: float = 0.0
    status: str = "standby"  # duty | standby | emergency | maintenance | failed
    health_pct: float = 100.0
    coolant_temp_c: float = 80.0
    oil_pressure_kpa: float = 400.0

    @property
    def rated_kw_actual(self) -> float:
        return self.rated_kva * self.power_factor


@dataclass
class PVArrayState:
    """Photovoltaic array state."""
    capacity_kwp: float = 0.0
    output_kw: float = 0.0
    temperature_derate: float = 1.0
    snow_cover_pct: float = 0.0
    efficiency: float = 0.18  # panel efficiency


@dataclass
class WindTurbineState:
    """Wind turbine state."""
    rated_kw: float = 10.0
    output_kw: float = 0.0
    cut_in_ms: float = 3.0
    rated_ms: float = 12.0
    cut_out_ms: float = 25.0
    status: str = "operating"


@dataclass
class BatteryState:
    """Battery bank state with SOC and SOH."""
    capacity_kwh: float = 200.0
    soc_pct: float = 80.0  # State of Charge (%)
    soh_pct: float = 100.0  # State of Health (%)
    charge_rate_kw: float = 0.0
    discharge_rate_kw: float = 0.0
    temperature_c: float = 20.0
    cold_derate_factor: float = 1.0
    max_charge_kw: float = 50.0
    max_discharge_kw: float = 50.0
    cycle_count: int = 0

    @property
    def usable_kwh(self) -> float:
        return self.capacity_kwh * (self.soh_pct / 100.0) * self.cold_derate_factor

    @property
    def energy_stored_kwh(self) -> float:
        return self.usable_kwh * (self.soc_pct / 100.0)


@dataclass
class MicrogridState:
    """Full microgrid snapshot."""
    gensets: List[GensetState] = field(default_factory=list)
    pv: PVArrayState = field(default_factory=PVArrayState)
    wind_turbines: List[WindTurbineState] = field(default_factory=list)
    battery: BatteryState = field(default_factory=BatteryState)
    total_load_kw: float = 0.0
    total_generation_kw: float = 0.0
    renewable_fraction: float = 0.0
    frequency_hz: float = 50.0
    voltage_v: float = 400.0
    fuel_consumed_litres: float = 0.0  # cumulative this session


class EnergySimulator:
    """Deterministic microgrid energy simulator.

    Models the electrical and thermal energy system of an Antarctic station.
    Calibrated against the Brazilian Antarctic Station hybrid study.
    """

    # Diesel specific fuel consumption curve (litres/kWh) vs load fraction
    # Typical: ~0.30 L/kWh at full load, ~0.45 L/kWh at 25% load
    SFC_CURVE = {0.0: 0.60, 0.25: 0.45, 0.50: 0.35, 0.75: 0.31, 1.0: 0.30}

    def __init__(
        self,
        station_code: str,
        seed: int = 42,
        mean_load_kw: float = 117.0,
        pv_capacity_kwp: float = 0.0,
        wind_capacity_kw: float = 0.0,
        battery_capacity_kwh: float = 200.0,
    ) -> None:
        self.station_code = station_code.upper()
        self.rng = np.random.default_rng(seed)
        self.mean_load_kw = mean_load_kw

        # Initialize gensets (3 × 240 kVA)
        self.gensets = [
            GensetState(id=f"GEN-{i+1}", status="duty" if i == 0 else "standby")
            for i in range(3)
        ]

        # PV (primarily Bharati)
        self.pv = PVArrayState(capacity_kwp=pv_capacity_kwp)

        # Wind turbines
        n_turbines = max(1, int(wind_capacity_kw / 10.0)) if wind_capacity_kw > 0 else 0
        self.wind_turbines = [
            WindTurbineState(rated_kw=wind_capacity_kw / max(n_turbines, 1))
            for _ in range(n_turbines)
        ]

        # Battery
        self.battery = BatteryState(
            capacity_kwh=battery_capacity_kwh,
            max_charge_kw=battery_capacity_kwh * 0.25,
            max_discharge_kw=battery_capacity_kwh * 0.25,
        )

        self._cumulative_fuel = 0.0
        self._total_runtime = {g.id: 0.0 for g in self.gensets}

    def _interpolate_sfc(self, load_fraction: float) -> float:
        """Interpolate specific fuel consumption from curve."""
        points = sorted(self.SFC_CURVE.items())
        lf = max(0.0, min(1.0, load_fraction))
        for i in range(len(points) - 1):
            x0, y0 = points[i]
            x1, y1 = points[i + 1]
            if x0 <= lf <= x1:
                t = (lf - x0) / (x1 - x0)
                return y0 + t * (y1 - y0)
        return points[-1][1]

    def _compute_heating_load(self, env: EnvironmentState) -> float:
        """Electrical heating load as function of outside temperature.

        Antarctic stations use electric trace heating and HVAC.
        Below -20°C, heating load dominates.
        """
        # Base heating at 0°C: ~20 kW, increases linearly with cold
        base_heating_kw = 20.0
        temp_factor = max(0.0, -env.temperature_c) / 40.0  # normalize to 0-1 over -40°C range
        wind_chill_factor = 1.0 + 0.01 * max(0, env.wind_speed_ms - 10)
        heating = base_heating_kw + 60.0 * temp_factor * wind_chill_factor
        return round(heating, 2)

    def _compute_base_load(self, hour: int) -> float:
        """Electrical load profile (excluding heating)."""
        # Typical daily load profile: higher during working hours
        if 7 <= hour <= 22:
            load_factor = 1.0 + 0.15 * math.sin(math.pi * (hour - 7) / 15)
        else:
            load_factor = 0.85  # nighttime baseload
        base = self.mean_load_kw * load_factor
        base += self.rng.normal(0, 5)  # noise
        return max(30.0, round(base, 2))

    def _pv_output(self, env: EnvironmentState) -> float:
        """PV generation based on irradiance and temperature."""
        if self.pv.capacity_kwp <= 0:
            return 0.0

        irradiance_factor = env.solar_irradiance_wm2 / 1000.0  # STC = 1000 W/m²

        # Temperature derating: panels perform better in cold
        # +0.4%/°C below 25°C
        temp_derate = 1.0 + 0.004 * (25.0 - env.temperature_c)
        temp_derate = min(1.15, max(0.7, temp_derate))

        # Snow cover (stochastic, based on recent conditions)
        snow_cover = 0.0
        if env.temperature_c < -5 and env.wind_speed_ms < 8:
            snow_cover = self.rng.uniform(0, 0.3)

        output = self.pv.capacity_kwp * irradiance_factor * temp_derate * (1 - snow_cover)
        self.pv.output_kw = round(max(0.0, output), 2)
        self.pv.temperature_derate = temp_derate
        self.pv.snow_cover_pct = round(snow_cover * 100, 1)
        return self.pv.output_kw

    def _wind_output(self, env: EnvironmentState) -> float:
        """Wind turbine generation using cubic power curve with cut-in/out."""
        total = 0.0
        for wt in self.wind_turbines:
            ws = env.wind_speed_ms
            if ws < wt.cut_in_ms or ws > wt.cut_out_ms:
                wt.output_kw = 0.0
                wt.status = "stopped" if ws > wt.cut_out_ms else "idle"
            elif ws >= wt.rated_ms:
                wt.output_kw = wt.rated_kw
                wt.status = "operating"
            else:
                # Cubic interpolation between cut-in and rated
                fraction = ((ws - wt.cut_in_ms) / (wt.rated_ms - wt.cut_in_ms)) ** 3
                wt.output_kw = round(wt.rated_kw * fraction, 2)
                wt.status = "operating"

            # Cold weather derate (icing above -25°C with humidity)
            if env.temperature_c < -25:
                wt.output_kw *= 0.85

            total += wt.output_kw
        return round(total, 2)

    def _battery_cold_derate(self, env: EnvironmentState) -> float:
        """Battery capacity derating for cold temperatures.

        Li-ion batteries lose ~20% capacity at -20°C, ~40% at -40°C.
        Station batteries are in heated enclosures but still affected.
        """
        # Assume enclosure keeps battery 30°C above ambient, minimum 5°C
        battery_temp = max(5.0, env.temperature_c + 30.0)
        self.battery.temperature_c = battery_temp

        if battery_temp >= 20.0:
            derate = 1.0
        elif battery_temp >= 0:
            derate = 0.85 + 0.15 * (battery_temp / 20.0)
        else:
            derate = max(0.5, 0.85 + 0.15 * (battery_temp / 20.0))

        self.battery.cold_derate_factor = round(derate, 3)
        return derate

    def _dispatch_gensets(self, net_load_kw: float) -> float:
        """Dispatch gensets to meet load. Returns fuel consumed (litres/hour)."""
        fuel_total = 0.0

        # Sort: duty first, then standby, then emergency
        status_order = {"duty": 0, "standby": 1, "emergency": 2}
        active_gensets = [g for g in self.gensets if g.status not in ("maintenance", "failed")]
        active_gensets.sort(key=lambda g: status_order.get(g.status, 3))

        remaining_load = net_load_kw
        for g in active_gensets:
            if remaining_load <= 0:
                g.current_load_kw = 0.0
                g.fuel_rate_lph = 0.0
                continue

            # Load this genset
            genset_load = min(remaining_load, g.rated_kw_actual)
            load_fraction = genset_load / g.rated_kw_actual
            sfc = self._interpolate_sfc(load_fraction)
            fuel = genset_load * sfc  # L/h

            g.current_load_kw = round(genset_load, 2)
            g.fuel_rate_lph = round(fuel, 2)
            g.runtime_hours += 1.0
            g.status = "duty"

            # Engine health affects output
            g.coolant_temp_c = round(80 + 15 * load_fraction + self.rng.normal(0, 2), 1)
            g.oil_pressure_kpa = round(400 - 50 * load_fraction + self.rng.normal(0, 10), 1)

            fuel_total += fuel
            remaining_load -= genset_load

        return round(fuel_total, 2)

    # ── Public API ─────────────────────────────────────────────────────
    def step(self, env: EnvironmentState, hour: int) -> MicrogridState:
        """Advance the microgrid simulation by one hour.

        Args:
            env: Current environment state
            hour: Hour of day (0-23)

        Returns:
            Updated MicrogridState snapshot
        """
        # Compute loads
        heating_load = self._compute_heating_load(env)
        base_load = self._compute_base_load(hour)
        total_load = heating_load + base_load

        # Renewable generation
        pv_gen = self._pv_output(env)
        wind_gen = self._wind_output(env)
        renewable_total = pv_gen + wind_gen

        # Battery cold derating
        self._battery_cold_derate(env)

        # Net load after renewables
        net_load = total_load - renewable_total

        # Battery dispatch
        if net_load < 0:
            # Surplus renewable → charge battery
            charge_kw = min(-net_load, self.battery.max_charge_kw)
            energy_kwh = charge_kw * 1.0  # 1 hour step
            max_energy = self.battery.usable_kwh * (1 - self.soc_fraction)
            actual_energy = min(energy_kwh, max_energy)
            self.battery.soc_pct = min(100.0, self.battery.soc_pct +
                                       (actual_energy / self.battery.usable_kwh) * 100)
            self.battery.charge_rate_kw = round(actual_energy, 2)
            self.battery.discharge_rate_kw = 0.0
            net_load = 0.0
        elif net_load > 0 and self.battery.soc_pct > 10:
            # Discharge battery to reduce genset load
            discharge_kw = min(net_load, self.battery.max_discharge_kw)
            energy_kwh = discharge_kw * 1.0
            available = self.battery.energy_stored_kwh - (self.battery.usable_kwh * 0.1)
            actual_energy = min(energy_kwh, max(0, available))
            self.battery.soc_pct = max(10.0, self.battery.soc_pct -
                                       (actual_energy / self.battery.usable_kwh) * 100)
            self.battery.discharge_rate_kw = round(actual_energy, 2)
            self.battery.charge_rate_kw = 0.0
            net_load -= actual_energy
            if actual_energy > 0:
                self.battery.cycle_count += 1
        else:
            self.battery.charge_rate_kw = 0.0
            self.battery.discharge_rate_kw = 0.0

        # Dispatch gensets for remaining load
        fuel_lph = self._dispatch_gensets(max(0, net_load))
        self._cumulative_fuel += fuel_lph

        # Compute totals
        genset_total = sum(g.current_load_kw for g in self.gensets)
        total_gen = renewable_total + genset_total + self.battery.discharge_rate_kw
        renewable_frac = renewable_total / max(total_gen, 1.0)

        return MicrogridState(
            gensets=[GensetState(**g.__dict__) for g in self.gensets],
            pv=PVArrayState(**self.pv.__dict__),
            wind_turbines=[WindTurbineState(**w.__dict__) for w in self.wind_turbines],
            battery=BatteryState(**self.battery.__dict__),
            total_load_kw=round(total_load, 2),
            total_generation_kw=round(total_gen, 2),
            renewable_fraction=round(renewable_frac, 4),
            frequency_hz=round(50.0 + self.rng.normal(0, 0.05), 2),
            voltage_v=round(400.0 + self.rng.normal(0, 2), 1),
            fuel_consumed_litres=round(self._cumulative_fuel, 2),
        )

    @property
    def soc_fraction(self) -> float:
        return self.battery.soc_pct / 100.0

    def fail_genset(self, genset_id: str) -> bool:
        """Inject a generator failure."""
        for g in self.gensets:
            if g.id == genset_id or genset_id in g.id:
                g.status = "failed"
                g.current_load_kw = 0.0
                g.fuel_rate_lph = 0.0
                g.health_pct = 0.0
                return True
        return False

    def get_fuel_rate_total(self) -> float:
        """Current total fuel consumption in litres/hour."""
        return sum(g.fuel_rate_lph for g in self.gensets)

    def get_genset_summary(self) -> List[Dict]:
        return [
            {
                "id": g.id,
                "status": g.status,
                "load_kw": g.current_load_kw,
                "fuel_lph": g.fuel_rate_lph,
                "health": g.health_pct,
                "runtime_h": g.runtime_hours,
            }
            for g in self.gensets
        ]
