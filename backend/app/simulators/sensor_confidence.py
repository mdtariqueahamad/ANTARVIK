"""Sensor Confidence Engine for ANTARVIK.

Computes a per-sensor confidence ratio [0.0 – 1.0] using FIVE independent
signal sources that already exist in the backend:

  1. Weibull failure probability    (equipment.py degradation model)
  2. Atmospheric model deviation    (environment.py physics model)
  3. Redundancy cross-check         (delta between primary & backup sensor)
  4. Sensor drift injection penalty (inject_sensor_drift wear-rate uplift)
  5. Sudden-change spike detection  (rate-of-change vs physical plausibility thresholds)

Final confidence:
    C = W_weibull*C_weibull + W_atm*C_atmospheric + W_cross*C_crosscheck
      + W_drift*C_drift + W_spike*C_spike

All weights sum to 1.0. Each component is independently clamped to [0, 1].

DIVERTED threshold: C < 0.55
DEGRADED threshold: 0.55 <= C < 0.80
NOMINAL:            C >= 0.80
FAILED:             sensor reports NaN / ERR / 0.00v on a sensor that should never read 0

Sudden-change history is stored in a module-level dict so it persists across
API calls within the same process lifetime (no external store needed).
"""

from __future__ import annotations

import math
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Sensor type physical ranges — used for atmospheric deviation scoring
# ---------------------------------------------------------------------------
SENSOR_RANGES: Dict[str, Dict] = {
    "Wind": {
        "min": 0.0,
        "max": 55.0,        # max_wind_gust for Maitri/Bharati
        "typical_max": 40.0,
        "unit": "km/h",
        "scale_factor": 3.6,  # m/s → km/h
    },
    "Temp": {
        "min": -55.0,
        "max": 5.0,
        "typical_max": 10.0,
        "unit": "°C",
        "scale_factor": 1.0,
    },
    "Pressure": {
        "min": 940.0,
        "max": 1020.0,
        "typical_max": 80.0,  # range width
        "unit": "hPa",
        "scale_factor": 1.0,
    },
    "Fluid": {
        "min": 0.0,
        "max": 10.0,
        "typical_max": 10.0,
        "unit": "bar",
        "scale_factor": 1.0,
    },
}

# Weibull shape parameter — same as equipment.py (β > 1 → increasing failure rate)
WEIBULL_BETA = 2.5

# Component weights — must sum to 1.0
W_WEIBULL = 0.25       # failure probability from operating hours + wear rate
W_ATMOSPHERIC = 0.30   # deviation from atmospheric model (physics-based expected value)
W_CROSSCHECK = 0.20    # redundancy delta between primary and backup sensor
W_DRIFT = 0.10         # drift penalty from inject_sensor_drift
W_SPIKE = 0.15         # sudden-change spike penalty (new — rate-of-change detection)


# ---------------------------------------------------------------------------
# Sudden-change plausibility thresholds
# Maximum physically plausible change per polling interval (~5 s) per type.
# Exceeding these is a strong indicator of a sensor glitch, not real physics.
#   Wind:     max katabatic ramp = ~15 km/h per 5 s (55 m/s gust event)
#   Temp:     polar air mass swap = ~3 °C per 5 s max (storm front)
#   Pressure: explosive decompression event = ~8 hPa per 5 s
#   Fluid:    glycol loop slam shut = ~3 bar per 5 s
# ---------------------------------------------------------------------------
SUDDEN_CHANGE_THRESHOLDS: Dict[str, float] = {
    "Wind":     15.0,   # km/h per interval
    "Temp":     3.0,    # °C per interval
    "Pressure": 8.0,    # hPa per interval
    "Fluid":    3.0,    # bar per interval
}

# How many historical readings to keep per sensor (rolling window)
HISTORY_WINDOW = 10

# Module-level history store: {station_key: {sensor_id: deque[(timestamp, value)]}}
_reading_history: Dict[str, Dict[str, Deque[Tuple[float, float]]]] = {}


@dataclass
class SuddenChange:
    """A detected sudden-change event on a single sensor."""
    sensor_id: str
    name: str
    sensor_type: str
    previous_value: float
    current_value: float
    delta: float
    threshold: float
    penalty: float          # confidence penalty applied [0–1], higher = worse
    timestamp: float        # unix time of detection
    description: str


@dataclass
class SensorSpec:
    """Defines one physical sensor's characteristics and current reading."""
    sensor_id: str
    name: str
    sensor_type: str               # Wind | Temp | Pressure | Fluid
    reported_numeric: Optional[float]   # parsed numeric value (None if ERR)
    raw_voltage: float             # e.g. 4.21 (volts)
    operating_hours: float         # total runtime hours
    wear_rate: float               # base wear rate (from DEFAULT_WEAR_RATES)
    drift_rate: float = 0.0        # injected drift (0 if none)
    redundant_sensor_value: Optional[float] = None   # backup sensor reading (same type)
    atmospheric_model_value: Optional[float] = None  # physics-based expected value


@dataclass
class ConfidenceResult:
    """Per-sensor confidence breakdown."""
    sensor_id: str
    name: str
    sensor_type: str

    # Component scores [0–1]
    c_weibull: float           # 1 - failure_probability
    c_atmospheric: float       # agreement with atmospheric model
    c_crosscheck: float        # agreement with redundant sensor
    c_drift: float             # penalty for injected drift
    c_spike: float             # penalty for sudden-change spike

    # Composite
    confidence: float          # weighted sum, clamped [0, 1]
    confidence_pct: float      # confidence * 100

    # Derived status
    status: str                # NOMINAL | DEGRADED | DIVERTED | FAILED

    # Sudden-change events detected this evaluation
    sudden_changes: List[SuddenChange] = field(default_factory=list)

    # Parameters used (for UI display)
    parameters_used: Dict[str, float] = field(default_factory=dict)

    # Explanation
    reason: str = ""


class SensorConfidenceEngine:
    """
    Computes confidence ratios for all sensors using backend physics.

    Usage:
        engine = SensorConfidenceEngine(station_code="MAITRI")
        results = engine.evaluate(sensor_specs, env_state)
    """

    def __init__(self, station_code: str) -> None:
        self.station_code = station_code.upper()

    # ------------------------------------------------------------------
    # Component 1: Weibull failure probability
    # ------------------------------------------------------------------
    def _c_weibull(self, operating_hours: float, wear_rate: float) -> Tuple[float, float]:
        """
        Returns (failure_prob, confidence_score).

        Uses the same Weibull formula as equipment.py:161
            eta = 10000 / wear_rate
            fp  = (beta/eta) * (t/eta)^(beta-1) * 0.001
        confidence = 1 - fp  (clamped to [0,1])
        """
        if wear_rate <= 0 or operating_hours <= 0:
            return 0.0, 1.0

        eta = 10000.0 / wear_rate
        t = operating_hours
        beta = WEIBULL_BETA

        failure_prob = min(1.0, (beta / eta) * (t / eta) ** (beta - 1) * 0.001)
        confidence = max(0.0, 1.0 - failure_prob)
        return round(failure_prob, 6), round(confidence, 4)

    # ------------------------------------------------------------------
    # Component 2: Atmospheric model deviation
    # ------------------------------------------------------------------
    def _c_atmospheric(
        self,
        sensor_type: str,
        reported_value: Optional[float],
        model_value: Optional[float],
    ) -> Tuple[float, str]:
        """
        Returns (confidence_score, reason).

        Compares reported sensor value against the atmospheric model's
        expected value (from EnvironmentSimulator output).

        confidence = 1 - (|reported - model| / max_plausible_range)
        clamped to [0, 1].
        """
        if reported_value is None:
            # ERR reading — worst case
            return 0.0, "Sensor reports ERR — no numeric value available"

        if model_value is None:
            # No atmospheric reference — neutral score
            return 0.75, "No atmospheric model reference available"

        spec = SENSOR_RANGES.get(sensor_type, {})
        range_width = spec.get("typical_max", 50.0)

        delta = abs(reported_value - model_value)
        confidence = max(0.0, 1.0 - (delta / range_width))

        reason = (
            f"Reported {reported_value:.1f} vs model {model_value:.1f} "
            f"(delta {delta:.1f}, range {range_width:.0f})"
        )
        return round(confidence, 4), reason

    # ------------------------------------------------------------------
    # Component 3: Redundancy cross-check
    # ------------------------------------------------------------------
    def _c_crosscheck(
        self,
        sensor_type: str,
        primary_value: Optional[float],
        redundant_value: Optional[float],
    ) -> Tuple[float, str]:
        """
        Returns (confidence_score, reason).

        Compares primary vs backup sensor reading.
        A large delta between them is the strongest DIVERTED signal.

        For S-ANM-01 (0 km/h) vs S-ANM-02 (84 km/h): delta = 84, range = 55
        → confidence ≈ 0.0 (full DIVERTED)
        """
        if redundant_value is None:
            return 0.80, "No redundant sensor available"

        if primary_value is None:
            return 0.0, "Primary sensor ERR; redundant reads normally"

        spec = SENSOR_RANGES.get(sensor_type, {})
        range_width = spec.get("max", 55.0) - spec.get("min", 0.0)
        range_width = max(range_width, 1.0)

        delta = abs(primary_value - redundant_value)
        confidence = max(0.0, 1.0 - (delta / range_width))

        reason = (
            f"Primary {primary_value:.1f} vs redundant {redundant_value:.1f} "
            f"(delta {delta:.1f}, sensor range {range_width:.0f})"
        )
        return round(confidence, 4), reason

    # ------------------------------------------------------------------
    # Component 4: Drift penalty
    # ------------------------------------------------------------------
    def _c_drift(self, drift_rate: float) -> float:
        """
        Returns confidence penalty for injected sensor drift.

        drift_rate=0.02 (default inject_sensor_drift) → 2% wear rate uplift.
        We map drift_rate linearly: 0.0 → 1.0, 0.10 → 0.0 (10% drift = fully unreliable)
        """
        penalty = min(1.0, drift_rate / 0.10)
        return round(max(0.0, 1.0 - penalty), 4)

    # ------------------------------------------------------------------
    # Component 5: Sudden-change spike detection
    # ------------------------------------------------------------------
    def _c_spike(
        self,
        station_code: str,
        spec: SensorSpec,
    ) -> Tuple[float, Optional[SuddenChange]]:
        """
        Detects sudden implausible value jumps and penalises confidence.

        Returns (confidence_score, SuddenChange|None).

        Algorithm:
          - Maintain a rolling deque of (timestamp, value) per sensor.
          - On each call: push current reading.
          - Compute delta = |current - previous|.
          - threshold = SUDDEN_CHANGE_THRESHOLDS[sensor_type]
          - If delta > threshold:
              penalty_ratio = min(1.0, delta / (threshold * 3))
              c_spike = 1.0 - penalty_ratio
          - Else: c_spike = 1.0 (no penalty)

        penalty_ratio saturates at 1.0 when delta >= 3× the threshold,
        meaning a 3× spike fully zeroes the spike component.
        """
        if spec.reported_numeric is None:
            # ERR — treat as maximum spike (transition to None is itself a sudden change)
            return 0.0, SuddenChange(
                sensor_id=spec.sensor_id,
                name=spec.name,
                sensor_type=spec.sensor_type,
                previous_value=-999.0,
                current_value=-999.0,
                delta=999.0,
                threshold=SUDDEN_CHANGE_THRESHOLDS.get(spec.sensor_type, 1.0),
                penalty=1.0,
                timestamp=time.time(),
                description=f"{spec.name} transitioned to ERR/OFFLINE state",
            )

        key = station_code.upper()
        if key not in _reading_history:
            _reading_history[key] = {}
        sensor_hist = _reading_history[key]
        if spec.sensor_id not in sensor_hist:
            sensor_hist[spec.sensor_id] = deque(maxlen=HISTORY_WINDOW)

        hist: Deque[Tuple[float, float]] = sensor_hist[spec.sensor_id]
        now = time.time()
        current_val = spec.reported_numeric

        sudden_change: Optional[SuddenChange] = None
        c_spike = 1.0

        if hist:
            prev_ts, prev_val = hist[-1]
            delta = abs(current_val - prev_val)
            threshold = SUDDEN_CHANGE_THRESHOLDS.get(spec.sensor_type, 10.0)

            if delta > threshold:
                penalty_ratio = min(1.0, delta / (threshold * 3.0))
                c_spike = round(max(0.0, 1.0 - penalty_ratio), 4)

                direction = "↑" if current_val > prev_val else "↓"
                sudden_change = SuddenChange(
                    sensor_id=spec.sensor_id,
                    name=spec.name,
                    sensor_type=spec.sensor_type,
                    previous_value=round(prev_val, 2),
                    current_value=round(current_val, 2),
                    delta=round(delta, 2),
                    threshold=threshold,
                    penalty=round(penalty_ratio, 4),
                    timestamp=now,
                    description=(
                        f"{spec.name} jumped {direction}{delta:.1f} "
                        f"(prev={prev_val:.1f}, now={current_val:.1f}, "
                        f"threshold=±{threshold})"
                    ),
                )

        hist.append((now, current_val))
        return c_spike, sudden_change

    # ------------------------------------------------------------------
    # Composite evaluator
    # ------------------------------------------------------------------
    def _derive_status(self, confidence: float, reported_value: Optional[float]) -> str:
        if reported_value is None:
            return "FAILED"
        if confidence < 0.55:
            return "DIVERTED"
        if confidence < 0.80:
            return "DEGRADED"
        return "NOMINAL"

    def evaluate_sensor(self, spec: SensorSpec) -> ConfidenceResult:
        """Evaluate confidence for a single sensor."""

        # Component 1 — Weibull
        fp, c_weibull = self._c_weibull(spec.operating_hours, spec.wear_rate)

        # Component 2 — Atmospheric model deviation
        c_atm, atm_reason = self._c_atmospheric(
            spec.sensor_type, spec.reported_numeric, spec.atmospheric_model_value
        )

        # Component 3 — Cross-check
        c_cross, cross_reason = self._c_crosscheck(
            spec.sensor_type, spec.reported_numeric, spec.redundant_sensor_value
        )

        # Component 4 — Drift penalty
        c_drift = self._c_drift(spec.drift_rate)

        # Component 5 — Sudden-change spike detection
        c_spike, sudden_change = self._c_spike(self.station_code, spec)
        sudden_changes = [sudden_change] if sudden_change else []

        # Weighted composite
        confidence = (
            W_WEIBULL * c_weibull
            + W_ATMOSPHERIC * c_atm
            + W_CROSSCHECK * c_cross
            + W_DRIFT * c_drift
            + W_SPIKE * c_spike
        )
        confidence = round(max(0.0, min(1.0, confidence)), 4)

        status = self._derive_status(confidence, spec.reported_numeric)

        # Human-readable reason
        spike_note = f" SPIKE: {sudden_change.description}." if sudden_change else ""
        if status == "DIVERTED":
            reason = f"Cross-check: {cross_reason}. Atm: {atm_reason}.{spike_note}"
        elif status == "DEGRADED":
            reason = f"Degraded health. Atm: {atm_reason}.{spike_note}"
        elif status == "FAILED":
            reason = "Sensor offline or returning ERR."
        else:
            reason = "All checks nominal." + spike_note

        parameters_used = {
            "operating_hours": spec.operating_hours,
            "wear_rate": spec.wear_rate,
            "weibull_beta": WEIBULL_BETA,
            "weibull_eta": round(10000.0 / spec.wear_rate, 1) if spec.wear_rate > 0 else 0,
            "failure_probability": fp,
            "drift_rate": spec.drift_rate,
            "atmospheric_model_value": spec.atmospheric_model_value if spec.atmospheric_model_value is not None else -1,
            "redundant_sensor_value": spec.redundant_sensor_value if spec.redundant_sensor_value is not None else -1,
            "w_weibull": W_WEIBULL,
            "w_atmospheric": W_ATMOSPHERIC,
            "w_crosscheck": W_CROSSCHECK,
            "w_drift": W_DRIFT,
            "w_spike": W_SPIKE,
            "c_weibull": c_weibull,
            "c_atmospheric": c_atm,
            "c_crosscheck": c_cross,
            "c_drift": c_drift,
            "c_spike": c_spike,
            "spike_delta": sudden_change.delta if sudden_change else 0.0,
            "spike_threshold": sudden_change.threshold if sudden_change else SUDDEN_CHANGE_THRESHOLDS.get(spec.sensor_type, 0.0),
        }

        return ConfidenceResult(
            sensor_id=spec.sensor_id,
            name=spec.name,
            sensor_type=spec.sensor_type,
            c_weibull=c_weibull,
            c_atmospheric=c_atm,
            c_crosscheck=c_cross,
            c_drift=c_drift,
            c_spike=c_spike,
            confidence=confidence,
            confidence_pct=round(confidence * 100, 1),
            status=status,
            sudden_changes=sudden_changes,
            parameters_used=parameters_used,
            reason=reason,
        )

    def evaluate(self, specs: List[SensorSpec]) -> List[ConfidenceResult]:
        """Evaluate confidence for a list of sensors."""
        return [self.evaluate_sensor(s) for s in specs]


# ---------------------------------------------------------------------------
# Station sensor registry — maps the hardcoded sensor IDs in the frontend
# to their physical parameters from the backend models.
# These values come from:
#   - wear_rate: DEFAULT_WEAR_RATES in equipment.py (wind_turbine class)
#   - operating_hours: typical deployed hours for Antarctic stations
#   - drift_rate: set by inject_sensor_drift() scenarios
# ---------------------------------------------------------------------------

STATION_SENSOR_REGISTRY: Dict[str, List[dict]] = {
    "MAITRI": [
        # S-ANM-01: Primary Anemometer — DIVERTED (icing, reads 0 km/h while backup reads 84)
        {
            "sensor_id": "S-ANM-01",
            "name": "Primary Anemometer",
            "sensor_type": "Wind",
            "reported_numeric": 0.0,          # 0 km/h — iced probe
            "raw_voltage": 0.00,
            "operating_hours": 8760.0,         # 1 full year deployed
            "wear_rate": 0.0008,               # wind_turbine class
            "drift_rate": 0.08,                # heavy icing = 8% drift injected
            "redundant_sensor_value": 84.0,    # S-ANM-02 backup reading
            "atmospheric_model_value": 43.2,   # env sim at this day/hour (m/s * 3.6)
        },
        # S-ANM-02: Secondary Anemometer — NOMINAL
        {
            "sensor_id": "S-ANM-02",
            "name": "Secondary Anemometer",
            "sensor_type": "Wind",
            "reported_numeric": 84.0,
            "raw_voltage": 4.21,
            "operating_hours": 4380.0,
            "wear_rate": 0.0008,
            "drift_rate": 0.0,
            "redundant_sensor_value": None,
            "atmospheric_model_value": 43.2,
        },
        # S-TMP-A: Ambient Temp Probe A — NOMINAL
        {
            "sensor_id": "S-TMP-A",
            "name": "Ambient Temp Probe A",
            "sensor_type": "Temp",
            "reported_numeric": -32.4,
            "raw_voltage": 1.42,
            "operating_hours": 8760.0,
            "wear_rate": 0.001,               # hvac-class sensor
            "drift_rate": 0.0,
            "redundant_sensor_value": -29.1,  # Probe B
            "atmospheric_model_value": -31.0, # seasonal model output
        },
        # S-TMP-B: Ambient Temp Probe B — DEGRADED (3.3°C delta from Probe A)
        {
            "sensor_id": "S-TMP-B",
            "name": "Ambient Temp Probe B",
            "sensor_type": "Temp",
            "reported_numeric": -29.1,
            "raw_voltage": 1.55,
            "operating_hours": 12000.0,       # older probe, more wear
            "wear_rate": 0.001,
            "drift_rate": 0.03,               # minor drift
            "redundant_sensor_value": -32.4,
            "atmospheric_model_value": -31.0,
        },
        # S-PRS-01: Barometric Sensor — NOMINAL
        {
            "sensor_id": "S-PRS-01",
            "name": "Barometric Sensor",
            "sensor_type": "Pressure",
            "reported_numeric": 962.0,
            "raw_voltage": 2.84,
            "operating_hours": 6000.0,
            "wear_rate": 0.0005,
            "drift_rate": 0.0,
            "redundant_sensor_value": None,
            "atmospheric_model_value": 970.0,  # rng.normal(980, 10) -> plausible
        },
        # S-GLY-01: Glycol Loop Pressure — FAILED
        {
            "sensor_id": "S-GLY-01",
            "name": "Glycol Loop Pressure",
            "sensor_type": "Fluid",
            "reported_numeric": None,          # ERR
            "raw_voltage": 0.00,
            "operating_hours": 15000.0,
            "wear_rate": 0.0015,              # pump class
            "drift_rate": 0.0,
            "redundant_sensor_value": None,
            "atmospheric_model_value": None,
        },
    ],
    "BHARATI": [
        {
            "sensor_id": "S-ANM-01",
            "name": "Primary Anemometer",
            "sensor_type": "Wind",
            "reported_numeric": 38.0,
            "raw_voltage": 1.90,
            "operating_hours": 6000.0,
            "wear_rate": 0.0008,
            "drift_rate": 0.0,
            "redundant_sensor_value": None,
            "atmospheric_model_value": 39.6,
        },
        {
            "sensor_id": "S-TMP-A",
            "name": "Ambient Temp Probe A",
            "sensor_type": "Temp",
            "reported_numeric": -28.5,
            "raw_voltage": 1.50,
            "operating_hours": 6000.0,
            "wear_rate": 0.001,
            "drift_rate": 0.0,
            "redundant_sensor_value": None,
            "atmospheric_model_value": -29.0,
        },
        {
            "sensor_id": "S-PRS-01",
            "name": "Barometric Sensor",
            "sensor_type": "Pressure",
            "reported_numeric": 975.0,
            "raw_voltage": 2.95,
            "operating_hours": 4000.0,
            "wear_rate": 0.0005,
            "drift_rate": 0.0,
            "redundant_sensor_value": None,
            "atmospheric_model_value": 978.0,
        },
    ],
}
