"""Equipment degradation, wear model, RUL estimation, and failure injection.

Models the health degradation of station assets over time, estimates
Remaining Useful Life (RUL), and supports fault injection for scenarios.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np


@dataclass
class EquipmentHealth:
    """Health state of a single piece of equipment."""
    asset_id: str
    asset_type: str
    health_pct: float = 100.0
    rul_hours: Optional[float] = None  # Remaining Useful Life in hours
    wear_rate: float = 0.001  # health% lost per operating hour
    failure_probability: float = 0.0  # instantaneous failure probability
    operating_hours: float = 0.0
    maintenance_due_hours: float = 500.0  # hours until next scheduled maintenance
    last_maintenance_hours: float = 0.0
    failure_mode: Optional[str] = None
    is_failed: bool = False
    degradation_factors: Dict[str, float] = field(default_factory=dict)


# Wear rates by asset type (health% per operating hour)
DEFAULT_WEAR_RATES = {
    "generator": 0.0012,       # ~8300 hours to 90% health
    "pv_panel": 0.00005,       # ~200,000 hours (25+ years)
    "wind_turbine": 0.0008,    # ~12,500 hours
    "battery_bank": 0.0003,    # ~33,000 hours
    "hvac": 0.0010,            # ~10,000 hours
    "water_treatment": 0.0008, # ~12,500 hours
    "boiler": 0.0009,          # ~11,000 hours
    "pump": 0.0015,            # ~6,600 hours
    "compressor": 0.0013,      # ~7,700 hours
}

# Maintenance intervals (operating hours)
MAINTENANCE_INTERVALS = {
    "generator": 500,
    "pv_panel": 2000,
    "wind_turbine": 1000,
    "battery_bank": 1500,
    "hvac": 750,
    "water_treatment": 600,
    "boiler": 500,
    "pump": 400,
    "compressor": 500,
}

# Failure modes by asset type
FAILURE_MODES = {
    "generator": [
        "coolant_leak", "oil_pressure_drop", "injector_failure",
        "alternator_fault", "governor_malfunction", "fuel_pump_failure",
    ],
    "pv_panel": ["cell_degradation", "bypass_diode_failure", "connector_corrosion"],
    "wind_turbine": ["blade_icing", "bearing_failure", "yaw_motor_failure", "gearbox_fault"],
    "battery_bank": ["cell_imbalance", "thermal_runaway_risk", "bms_fault"],
    "hvac": ["compressor_failure", "refrigerant_leak", "fan_motor_failure"],
    "water_treatment": ["membrane_fouling", "pump_failure", "uv_lamp_failure"],
}


class EquipmentSimulator:
    """Deterministic equipment degradation and RUL estimator.

    Uses a Weibull-inspired wear model with environmental stress factors.
    """

    def __init__(self, seed: int = 42) -> None:
        self.rng = np.random.default_rng(seed)
        self.equipment: Dict[str, EquipmentHealth] = {}

    def register_asset(
        self,
        asset_id: str,
        asset_type: str,
        initial_health: float = 100.0,
        operating_hours: float = 0.0,
    ) -> EquipmentHealth:
        """Register an asset for tracking."""
        wear_rate = DEFAULT_WEAR_RATES.get(asset_type, 0.001)
        maint_interval = MAINTENANCE_INTERVALS.get(asset_type, 500)

        eq = EquipmentHealth(
            asset_id=asset_id,
            asset_type=asset_type,
            health_pct=initial_health,
            wear_rate=wear_rate,
            operating_hours=operating_hours,
            maintenance_due_hours=maint_interval - (operating_hours % maint_interval),
        )
        self.equipment[asset_id] = eq
        return eq

    def step(
        self,
        asset_id: str,
        operating_hours_delta: float = 1.0,
        temperature_c: float = -20.0,
        load_fraction: float = 0.5,
        vibration_factor: float = 1.0,
    ) -> EquipmentHealth:
        """Advance equipment degradation by one time step.

        Args:
            asset_id: Equipment identifier
            operating_hours_delta: Hours of operation in this step
            temperature_c: Ambient temperature (cold stress factor)
            load_fraction: Load as fraction of rated capacity
            vibration_factor: Vibration multiplier (1.0 = normal)

        Returns:
            Updated EquipmentHealth
        """
        eq = self.equipment.get(asset_id)
        if eq is None or eq.is_failed:
            return eq

        # Environmental stress multipliers
        cold_stress = 1.0 + max(0.0, (-temperature_c - 20.0)) * 0.01  # +1% per °C below -20
        load_stress = 0.5 + load_fraction  # higher load = faster wear
        overdue_maintenance = max(0.0, eq.operating_hours - eq.last_maintenance_hours -
                                   MAINTENANCE_INTERVALS.get(eq.asset_type, 500))
        maintenance_stress = 1.0 + overdue_maintenance * 0.001

        # Combined degradation
        stress_multiplier = cold_stress * load_stress * vibration_factor * maintenance_stress
        degradation = eq.wear_rate * operating_hours_delta * stress_multiplier

        # Add stochastic noise
        degradation *= (1.0 + self.rng.normal(0, 0.1))

        eq.health_pct = max(0.0, eq.health_pct - degradation)
        eq.operating_hours += operating_hours_delta
        eq.maintenance_due_hours -= operating_hours_delta

        # Store factors for explainability
        eq.degradation_factors = {
            "cold_stress": round(cold_stress, 3),
            "load_stress": round(load_stress, 3),
            "maintenance_stress": round(maintenance_stress, 3),
            "vibration_factor": round(vibration_factor, 3),
            "total_multiplier": round(stress_multiplier, 3),
        }

        # Failure probability (bathtub curve: Weibull)
        # Shape parameter β > 1 means increasing failure rate
        beta = 2.5
        eta = 10000.0 / eq.wear_rate  # characteristic life
        t = eq.operating_hours
        eq.failure_probability = min(1.0, (beta / eta) * (t / eta) ** (beta - 1) * 0.001)

        # Stochastic failure check
        if eq.health_pct < 30 or self.rng.random() < eq.failure_probability:
            if self.rng.random() < 0.02 * (100 - eq.health_pct) / 100:
                modes = FAILURE_MODES.get(eq.asset_type, ["unknown_failure"])
                eq.failure_mode = self.rng.choice(modes)
                eq.is_failed = True
                eq.health_pct = 0.0

        # RUL estimation
        if eq.wear_rate > 0 and not eq.is_failed:
            # Simple linear projection to 0% health
            avg_degradation_per_hour = degradation / max(operating_hours_delta, 0.01)
            if avg_degradation_per_hour > 0:
                eq.rul_hours = round(eq.health_pct / avg_degradation_per_hour, 1)
            else:
                eq.rul_hours = None
        else:
            eq.rul_hours = 0.0

        return eq

    def perform_maintenance(self, asset_id: str) -> Optional[EquipmentHealth]:
        """Perform maintenance on equipment, restoring health."""
        eq = self.equipment.get(asset_id)
        if eq is None:
            return None

        # Maintenance restores health (but not to 100% for aged equipment)
        age_factor = max(0.7, 1.0 - eq.operating_hours / 50000.0)
        eq.health_pct = min(100.0, eq.health_pct + 30.0 * age_factor)
        eq.maintenance_due_hours = MAINTENANCE_INTERVALS.get(eq.asset_type, 500)
        eq.last_maintenance_hours = eq.operating_hours
        eq.is_failed = False
        eq.failure_mode = None
        return eq

    def inject_failure(self, asset_id: str, failure_mode: str = "injected") -> Optional[EquipmentHealth]:
        """Inject a failure into equipment for scenario testing."""
        eq = self.equipment.get(asset_id)
        if eq is None:
            return None
        eq.is_failed = True
        eq.failure_mode = failure_mode
        eq.health_pct = 0.0
        eq.rul_hours = 0.0
        return eq

    def inject_sensor_drift(
        self,
        asset_id: str,
        drift_rate: float = 0.02,
    ) -> Optional[EquipmentHealth]:
        """Inject sensor drift, gradually degrading reading quality."""
        eq = self.equipment.get(asset_id)
        if eq is None:
            return None
        # Sensor drift increases wear rate (simulates misreadings)
        eq.wear_rate *= (1.0 + drift_rate)
        eq.degradation_factors["sensor_drift"] = drift_rate
        return eq

    def get_fleet_summary(self) -> Dict[str, dict]:
        """Summary of all tracked equipment."""
        return {
            aid: {
                "asset_type": eq.asset_type,
                "health_pct": round(eq.health_pct, 2),
                "rul_hours": eq.rul_hours,
                "operating_hours": round(eq.operating_hours, 1),
                "is_failed": eq.is_failed,
                "failure_mode": eq.failure_mode,
                "maintenance_due_hours": round(eq.maintenance_due_hours, 1),
            }
            for aid, eq in self.equipment.items()
        }
