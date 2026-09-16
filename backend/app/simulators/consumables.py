"""Consumables depletion simulator.

Models fuel, water, food, medical supplies, and spare parts consumption
adjusted by crew size and environmental heating load.

References:
  - Maitri: ~25 winter crew, ~65 summer
  - Bharati: ~47 capacity, ~24 winter
  - Typical Antarctic fuel: 300-400 kL/year for medium station
  - Fuel density: ~0.84 kg/L (AN-8 / JP-8 arctic diesel)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional

import numpy as np


@dataclass
class ConsumableState:
    """State of a single consumable category."""
    name: str
    category: str  # fuel, food, water, medical, spares
    quantity: float
    unit: str
    daily_rate: float  # base consumption rate per day
    min_threshold: float
    critical_threshold: float

    @property
    def days_remaining(self) -> Optional[float]:
        if self.daily_rate <= 0:
            return None
        return self.quantity / self.daily_rate

    @property
    def status(self) -> str:
        if self.quantity <= self.critical_threshold:
            return "critical"
        elif self.quantity <= self.min_threshold:
            return "warning"
        return "ok"


@dataclass
class ConsumablesSnapshot:
    """Full consumables snapshot for a station."""
    items: Dict[str, ConsumableState] = field(default_factory=dict)
    total_fuel_litres: float = 0.0
    total_fuel_burn_lph: float = 0.0
    crew_size: int = 25


class ConsumablesSimulator:
    """Deterministic consumables depletion model.

    fuel burn = f(heating_load + electrical_load)
    food/water/medical = linear depletion × crew_size
    """

    # Per-person daily consumption rates
    FOOD_KG_PER_PERSON_DAY = 2.5       # ~2.5 kg/day including packaging
    WATER_L_PER_PERSON_DAY = 80.0      # includes domestic + technical use
    MEDICAL_UNITS_PER_PERSON_DAY = 0.1  # normalized medical supply units

    # Fuel parameters
    FUEL_DENSITY_KG_PER_L = 0.84       # AN-8 arctic diesel
    HEATING_FUEL_FACTOR = 0.12         # L/kW·h for heating contribution

    def __init__(
        self,
        station_code: str,
        seed: int = 42,
        crew_size: int = 25,
        initial_fuel_litres: float = 150000.0,
        initial_food_kg: float = 25000.0,
        initial_water_litres: float = 200000.0,
        initial_medical_units: float = 1000.0,
        initial_spares_count: int = 500,
    ) -> None:
        self.station_code = station_code.upper()
        self.rng = np.random.default_rng(seed)
        self.crew_size = crew_size

        self.consumables: Dict[str, ConsumableState] = {
            "diesel_fuel": ConsumableState(
                name="Diesel Fuel (AN-8)",
                category="fuel",
                quantity=initial_fuel_litres,
                unit="litres",
                daily_rate=0.0,  # computed dynamically
                min_threshold=initial_fuel_litres * 0.25,
                critical_threshold=initial_fuel_litres * 0.10,
            ),
            "food_supplies": ConsumableState(
                name="Food Supplies",
                category="food",
                quantity=initial_food_kg,
                unit="kg",
                daily_rate=self.FOOD_KG_PER_PERSON_DAY * crew_size,
                min_threshold=initial_food_kg * 0.20,
                critical_threshold=initial_food_kg * 0.08,
            ),
            "fresh_water": ConsumableState(
                name="Fresh Water",
                category="water",
                quantity=initial_water_litres,
                unit="litres",
                daily_rate=self.WATER_L_PER_PERSON_DAY * crew_size,
                min_threshold=initial_water_litres * 0.20,
                critical_threshold=initial_water_litres * 0.08,
            ),
            "medical_supplies": ConsumableState(
                name="Medical Supplies",
                category="medical",
                quantity=initial_medical_units,
                unit="units",
                daily_rate=self.MEDICAL_UNITS_PER_PERSON_DAY * crew_size,
                min_threshold=200.0,
                critical_threshold=50.0,
            ),
            "spare_parts": ConsumableState(
                name="Mechanical Spare Parts",
                category="spares",
                quantity=float(initial_spares_count),
                unit="items",
                daily_rate=0.5,  # ~1 part every 2 days on average
                min_threshold=100.0,
                critical_threshold=30.0,
            ),
        }

    def step(
        self,
        fuel_burn_lph: float,
        heating_load_kw: float,
        hours: float = 1.0,
    ) -> ConsumablesSnapshot:
        """Advance consumables depletion by `hours`.

        Args:
            fuel_burn_lph: Genset fuel burn in litres/hour (from energy sim)
            heating_load_kw: Heating electrical load in kW (affects fuel via boilers)
            hours: Time step in hours (default 1)

        Returns:
            ConsumablesSnapshot with updated quantities
        """
        # ── Fuel ───────────────────────────────────────────────────────
        # Total fuel = genset consumption + heating fuel (separate diesel boilers)
        heating_fuel_lph = heating_load_kw * self.HEATING_FUEL_FACTOR
        total_fuel_lph = fuel_burn_lph + heating_fuel_lph
        fuel_consumed = total_fuel_lph * hours

        fuel = self.consumables["diesel_fuel"]
        fuel.quantity = max(0.0, fuel.quantity - fuel_consumed)
        fuel.daily_rate = total_fuel_lph * 24  # project to daily

        # ── Food ───────────────────────────────────────────────────────
        food = self.consumables["food_supplies"]
        food.daily_rate = self.FOOD_KG_PER_PERSON_DAY * self.crew_size
        food_consumed = (food.daily_rate / 24.0) * hours
        food.quantity = max(0.0, food.quantity - food_consumed)

        # ── Water ──────────────────────────────────────────────────────
        water = self.consumables["fresh_water"]
        water.daily_rate = self.WATER_L_PER_PERSON_DAY * self.crew_size
        water_consumed = (water.daily_rate / 24.0) * hours
        # Water can be replenished via snow melting (partial)
        snow_melt_recovery = self.rng.uniform(0.3, 0.6)  # 30-60% recovery
        water.quantity = max(0.0, water.quantity - water_consumed * (1 - snow_melt_recovery))

        # ── Medical ────────────────────────────────────────────────────
        medical = self.consumables["medical_supplies"]
        medical.daily_rate = self.MEDICAL_UNITS_PER_PERSON_DAY * self.crew_size
        medical_consumed = (medical.daily_rate / 24.0) * hours
        medical.quantity = max(0.0, medical.quantity - medical_consumed)

        # ── Spares ─────────────────────────────────────────────────────
        spares = self.consumables["spare_parts"]
        spares_consumed = (spares.daily_rate / 24.0) * hours * self.rng.uniform(0.5, 1.5)
        spares.quantity = max(0.0, spares.quantity - spares_consumed)

        return ConsumablesSnapshot(
            items={k: ConsumableState(**v.__dict__) for k, v in self.consumables.items()},
            total_fuel_litres=fuel.quantity,
            total_fuel_burn_lph=total_fuel_lph,
            crew_size=self.crew_size,
        )

    def update_crew_size(self, new_crew: int) -> None:
        """Update crew size (e.g., summer→winter transition)."""
        self.crew_size = new_crew

    def resupply(self, category: str, quantity: float) -> None:
        """Add supplies to a category."""
        if category in self.consumables:
            self.consumables[category].quantity += quantity

    def get_forecast(self, days_ahead: int = 90) -> Dict[str, dict]:
        """Project depletion for each consumable."""
        forecasts = {}
        for key, item in self.consumables.items():
            days_left = item.days_remaining
            exhaustion = None
            if days_left is not None and days_left < days_ahead:
                exhaustion = (date.today() + timedelta(days=int(days_left))).isoformat()
            forecasts[key] = {
                "name": item.name,
                "category": item.category,
                "quantity": round(item.quantity, 2),
                "unit": item.unit,
                "daily_rate": round(item.daily_rate, 2),
                "days_remaining": round(days_left, 1) if days_left else None,
                "exhaustion_date": exhaustion,
                "status": item.status,
            }
        return forecasts
