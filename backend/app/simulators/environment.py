"""Antarctic environment simulator.

Models temperature, wind, and solar irradiance for Maitri and Bharati stations
with realistic polar day/night cycles and katabatic storm events.

References:
  - Maitri station: 70°46'S, 11°44'E, ~123 m a.s.l., Schirmacher Oasis
  - Bharati station: 69°24'S, 76°12'E, ~50 m a.s.l., Larsemann Hills
  - Antarctic climatology data from published expedition reports
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple

import numpy as np


@dataclass
class StationClimate:
    """Climate calibration for a single station."""
    latitude: float             # degrees south (negative)
    longitude: float
    altitude_m: float
    summer_temp_range: Tuple[float, float]   # (min, max) °C, Dec-Feb
    winter_temp_range: Tuple[float, float]   # (min, max) °C, Jun-Aug
    mean_wind_speed: float      # m/s annual mean
    max_wind_gust: float        # m/s, extreme katabatic
    katabatic_probability: float  # daily probability of katabatic event
    pv_tilt_deg: float          # panel tilt
    albedo: float               # surface albedo (snow/ice ~0.8)


STATION_CLIMATES: Dict[str, StationClimate] = {
    "MAITRI": StationClimate(
        latitude=-70.77,
        longitude=11.73,
        altitude_m=123.0,
        summer_temp_range=(-20.0, 0.0),
        winter_temp_range=(-40.0, -15.0),
        mean_wind_speed=12.0,
        max_wind_gust=55.0,
        katabatic_probability=0.08,
        pv_tilt_deg=70.0,
        albedo=0.80,
    ),
    "BHARATI": StationClimate(
        latitude=-69.41,
        longitude=76.19,
        altitude_m=50.0,
        summer_temp_range=(-18.0, 2.0),
        winter_temp_range=(-38.0, -12.0),
        mean_wind_speed=11.0,
        max_wind_gust=50.0,
        katabatic_probability=0.06,
        pv_tilt_deg=65.0,
        albedo=0.78,
    ),
}


@dataclass
class EnvironmentState:
    """Snapshot of environmental conditions."""
    temperature_c: float = -20.0
    wind_speed_ms: float = 10.0
    wind_direction_deg: float = 180.0
    solar_irradiance_wm2: float = 0.0
    is_polar_day: bool = False
    is_polar_night: bool = False
    is_katabatic_storm: bool = False
    storm_hours_remaining: float = 0.0
    humidity_pct: float = 30.0
    pressure_hpa: float = 980.0
    visibility_km: float = 20.0


class EnvironmentSimulator:
    """Deterministic Antarctic environment simulator.

    Produces temperature, wind, and irradiance time-series based on
    day-of-year, with katabatic storm injection capability.
    """

    def __init__(self, station_code: str, seed: int = 42) -> None:
        self.station_code = station_code.upper()
        self.climate = STATION_CLIMATES.get(self.station_code, STATION_CLIMATES["MAITRI"])
        self.rng = np.random.default_rng(seed)
        self.state = EnvironmentState()
        self._storm_remaining_hours: float = 0.0

    # ── Core physics ───────────────────────────────────────────────────
    def _seasonal_temperature(self, day_of_year: int, hour: int) -> float:
        """Temperature model: sinusoidal annual + diurnal cycle.

        Southern hemisphere: summer ≈ day 335-60 (Dec-Feb), winter ≈ day 152-244 (Jun-Aug).
        Uses a shifted cosine so day 0 (Jan 1) is mid-summer.
        """
        # Annual cycle: peak warmth at day ~15 (mid-Jan in SH)
        annual_phase = 2.0 * math.pi * (day_of_year - 15) / 365.0
        annual_factor = math.cos(annual_phase)  # +1 at summer, -1 at winter

        c = self.climate
        summer_mean = (c.summer_temp_range[0] + c.summer_temp_range[1]) / 2.0
        winter_mean = (c.winter_temp_range[0] + c.winter_temp_range[1]) / 2.0
        annual_mean = (summer_mean + winter_mean) / 2.0
        annual_amplitude = (summer_mean - winter_mean) / 2.0

        temp = annual_mean + annual_amplitude * annual_factor

        # Diurnal cycle (small in polar regions, absent during polar night)
        solar_elevation = self._solar_elevation(day_of_year, hour)
        if solar_elevation > 0:
            diurnal_amp = 2.0  # °C
            diurnal = diurnal_amp * math.sin(math.pi * (hour - 6) / 12.0)
            temp += diurnal

        # Random noise
        temp += self.rng.normal(0, 1.5)

        return round(temp, 2)

    def _solar_elevation(self, day_of_year: int, hour: int) -> float:
        """Approximate solar elevation angle (degrees)."""
        lat_rad = math.radians(self.climate.latitude)
        # Solar declination
        decl = 23.45 * math.sin(math.radians(360 / 365.0 * (day_of_year - 81)))
        decl_rad = math.radians(decl)
        # Hour angle
        hour_angle = math.radians(15.0 * (hour - 12))
        sin_elev = (math.sin(lat_rad) * math.sin(decl_rad) +
                    math.cos(lat_rad) * math.cos(decl_rad) * math.cos(hour_angle))
        return math.degrees(math.asin(max(-1.0, min(1.0, sin_elev))))

    def _solar_irradiance(self, day_of_year: int, hour: int) -> float:
        """GHI at surface (W/m²), accounting for polar day/night and albedo boost."""
        elevation = self._solar_elevation(day_of_year, hour)
        if elevation <= 0:
            return 0.0

        # Extraterrestrial irradiance ≈ 1361 W/m²
        # Atmospheric transmittance in clear Antarctic air ≈ 0.75
        # Plus albedo reflected component
        air_mass = 1.0 / max(math.sin(math.radians(elevation)), 0.05)
        transmittance = 0.75 ** min(air_mass, 10.0)
        direct = 1361.0 * math.sin(math.radians(elevation)) * transmittance

        # Albedo boost (reflected from snow)
        albedo_boost = direct * self.climate.albedo * 0.3
        ghi = direct + albedo_boost

        # Cloud cover reduction (stochastic)
        cloud_factor = 1.0 - self.rng.uniform(0.0, 0.3)
        return round(max(0.0, ghi * cloud_factor), 2)

    def _wind_speed(self, day_of_year: int, hour: int) -> float:
        """Wind speed with diurnal/seasonal variation and katabatic events."""
        base = self.climate.mean_wind_speed

        # Seasonal: slightly windier in winter
        annual_phase = 2.0 * math.pi * (day_of_year - 15) / 365.0
        seasonal_mod = 1.0 - 0.15 * math.cos(annual_phase)
        wind = base * seasonal_mod

        # Random gusts
        wind += self.rng.exponential(2.0)

        if self._storm_remaining_hours > 0:
            # Katabatic storm: extreme winds
            storm_intensity = min(1.0, self._storm_remaining_hours / 6.0)  # ramp up/down
            wind = max(wind, self.climate.max_wind_gust * (0.6 + 0.4 * storm_intensity))
            wind += self.rng.normal(0, 3.0)

        return round(max(0.0, min(wind, self.climate.max_wind_gust)), 2)

    def _check_polar_daynight(self, day_of_year: int) -> Tuple[bool, bool]:
        """Determine if it's polar day or polar night."""
        lat = abs(self.climate.latitude)
        # Solar declination
        decl = 23.45 * math.sin(math.radians(360 / 365.0 * (day_of_year - 81)))
        # Polar day: sun never sets (|lat| + decl >= 90 for SH winter solstice)
        # For southern hemisphere, polar day when -decl > 90 - lat
        is_polar_day = (-decl) > (90.0 - lat)
        is_polar_night = decl > (90.0 - lat)
        return is_polar_day, is_polar_night

    # ── Public API ─────────────────────────────────────────────────────
    def step(self, day_of_year: int, hour: int) -> EnvironmentState:
        """Advance the simulation by one time step.

        Args:
            day_of_year: 1-366
            hour: 0-23

        Returns:
            Updated EnvironmentState snapshot.
        """
        # Storm management
        if self._storm_remaining_hours > 0:
            self._storm_remaining_hours = max(0, self._storm_remaining_hours - 1)
        elif self.rng.random() < self.climate.katabatic_probability / 24.0:
            # Trigger new storm: 12-72 hours
            self._storm_remaining_hours = float(self.rng.integers(12, 73))

        is_polar_day, is_polar_night = self._check_polar_daynight(day_of_year)

        temp = self._seasonal_temperature(day_of_year, hour)
        wind = self._wind_speed(day_of_year, hour)
        irradiance = self._solar_irradiance(day_of_year, hour)

        if self._storm_remaining_hours > 0:
            temp -= self.rng.uniform(5.0, 15.0)  # storms bring cold
            irradiance *= 0.1  # near-zero visibility

        self.state = EnvironmentState(
            temperature_c=round(temp, 2),
            wind_speed_ms=round(wind, 2),
            wind_direction_deg=round(self.rng.uniform(90, 270), 1),
            solar_irradiance_wm2=round(max(0, irradiance), 2),
            is_polar_day=is_polar_day,
            is_polar_night=is_polar_night,
            is_katabatic_storm=self._storm_remaining_hours > 0,
            storm_hours_remaining=self._storm_remaining_hours,
            humidity_pct=round(self.rng.uniform(20, 60), 1),
            pressure_hpa=round(self.rng.normal(980, 10), 1),
            visibility_km=round(
                max(0.1, 0.5 if self._storm_remaining_hours > 0 else self.rng.uniform(10, 40)),
                1,
            ),
        )
        return self.state

    def inject_storm(self, duration_hours: float, wind_speed_ms: float, temp_drop_c: float) -> None:
        """Inject a katabatic storm event."""
        self._storm_remaining_hours = duration_hours
        # Temporarily boost max wind for this storm
        self.climate = StationClimate(
            **{
                **self.climate.__dict__,
                "max_wind_gust": max(self.climate.max_wind_gust, wind_speed_ms),
            }
        )

    def get_state(self) -> EnvironmentState:
        return self.state
