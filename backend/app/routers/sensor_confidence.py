"""Sensor Confidence API router.

GET  /sensor-confidence/{station_code}
     Returns per-sensor confidence ratios with sudden-change events.

GET  /sensor-confidence/{station_code}/{sensor_id}
     Returns confidence breakdown for a single sensor.

POST /sensor-confidence/{station_code}/{sensor_id}/inject-change
     Simulate a sudden reading change (injects a value into the history buffer
     so the spike detector picks it up on next poll). Used for demo/testing.
     Body: { "value": <float> }
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException

from app.simulators.sensor_confidence import (
    SensorConfidenceEngine,
    SensorSpec,
    SuddenChange,
    STATION_SENSOR_REGISTRY,
    SUDDEN_CHANGE_THRESHOLDS,
    _reading_history,
)
from collections import deque
import time

router = APIRouter(prefix="/sensor-confidence", tags=["sensor-confidence"])


def _registry_to_specs(station_code: str) -> List[SensorSpec]:
    registry = STATION_SENSOR_REGISTRY.get(station_code.upper())
    if not registry:
        raise HTTPException(status_code=404, detail=f"Station '{station_code}' not found")
    return [SensorSpec(**entry) for entry in registry]


def _sudden_change_to_dict(sc: SuddenChange) -> Dict[str, Any]:
    return {
        "sensor_id": sc.sensor_id,
        "name": sc.name,
        "sensor_type": sc.sensor_type,
        "previous_value": sc.previous_value,
        "current_value": sc.current_value,
        "delta": sc.delta,
        "threshold": sc.threshold,
        "penalty_applied": sc.penalty,
        "confidence_penalty_pct": round(sc.penalty * 100, 1),
        "timestamp": sc.timestamp,
        "timestamp_iso": __import__("datetime").datetime.fromtimestamp(sc.timestamp).isoformat(),
        "description": sc.description,
    }


def _result_to_dict(r) -> Dict[str, Any]:
    return {
        "sensor_id": r.sensor_id,
        "name": r.name,
        "sensor_type": r.sensor_type,
        "confidence": r.confidence,
        "confidence_pct": r.confidence_pct,
        "status": r.status,
        "reason": r.reason,
        "sudden_changes": [_sudden_change_to_dict(sc) for sc in r.sudden_changes],
        "components": {
            "weibull": {
                "score": r.c_weibull,
                "weight": r.parameters_used.get("w_weibull"),
                "description": "1 - Weibull failure probability (operating hours + wear rate)",
            },
            "atmospheric": {
                "score": r.c_atmospheric,
                "weight": r.parameters_used.get("w_atmospheric"),
                "description": "Agreement with physics-based atmospheric model",
            },
            "crosscheck": {
                "score": r.c_crosscheck,
                "weight": r.parameters_used.get("w_crosscheck"),
                "description": "Primary vs redundant sensor delta",
            },
            "drift": {
                "score": r.c_drift,
                "weight": r.parameters_used.get("w_drift"),
                "description": "Penalty for injected sensor drift rate",
            },
            "spike": {
                "score": r.c_spike,
                "weight": r.parameters_used.get("w_spike"),
                "description": "Sudden-change rate-of-change penalty",
                "spike_delta": r.parameters_used.get("spike_delta", 0.0),
                "spike_threshold": r.parameters_used.get("spike_threshold", 0.0),
            },
        },
        "parameters_used": r.parameters_used,
    }


@router.get("/{station_code}", response_model=None)
async def get_station_confidence(station_code: str) -> Dict[str, Any]:
    """
    Compute confidence ratios for all sensors at a station.
    Includes sudden-change events detected since the last reading.

    Parameters that drive the calculation:
    - operating_hours  : total sensor runtime (Weibull input)
    - wear_rate        : asset-type degradation rate (equipment.py)
    - drift_rate       : injected sensor drift (inject_sensor_drift)
    - reported_numeric : parsed numeric reading from sensor
    - atmospheric_model_value : expected value from EnvironmentSimulator
    - redundant_sensor_value  : reading from backup sensor (cross-check)
    - reading history  : rolling 10-reading window for spike detection
    """
    specs = _registry_to_specs(station_code)
    engine = SensorConfidenceEngine(station_code)
    results = engine.evaluate(specs)

    station_confidence = sum(r.confidence for r in results) / len(results)
    diverted_count = sum(1 for r in results if r.status == "DIVERTED")
    failed_count = sum(1 for r in results if r.status == "FAILED")

    # Collect all sudden changes across all sensors
    all_sudden_changes = []
    for r in results:
        all_sudden_changes.extend([_sudden_change_to_dict(sc) for sc in r.sudden_changes])

    return {
        "station": station_code.upper(),
        "station_confidence_pct": round(station_confidence * 100, 1),
        "sensor_count": len(results),
        "diverted_count": diverted_count,
        "failed_count": failed_count,
        "sudden_change_count": len(all_sudden_changes),
        "sudden_changes": all_sudden_changes,
        "formula": (
            "C = 0.25*C_weibull + 0.30*C_atmospheric + 0.20*C_crosscheck "
            "+ 0.10*C_drift + 0.15*C_spike"
        ),
        "thresholds": {
            "NOMINAL": "C >= 0.80",
            "DEGRADED": "0.55 <= C < 0.80",
            "DIVERTED": "C < 0.55  (values severely deviate from atmospheric model or redundant sensor)",
            "FAILED": "sensor reports ERR / None",
        },
        "spike_thresholds": {
            k: f"±{v} per interval" for k, v in SUDDEN_CHANGE_THRESHOLDS.items()
        },
        "sensors": [_result_to_dict(r) for r in results],
    }


@router.get("/{station_code}/{sensor_id}", response_model=None)
async def get_sensor_confidence(station_code: str, sensor_id: str) -> Dict[str, Any]:
    """Confidence breakdown for a single sensor."""
    specs = _registry_to_specs(station_code)
    matched = [s for s in specs if s.sensor_id == sensor_id.upper()]
    if not matched:
        raise HTTPException(
            status_code=404,
            detail=f"Sensor '{sensor_id}' not found in station '{station_code}'",
        )
    engine = SensorConfidenceEngine(station_code)
    result = engine.evaluate_sensor(matched[0])
    return _result_to_dict(result)


@router.post("/{station_code}/{sensor_id}/inject-change", response_model=None)
async def inject_sudden_change(
    station_code: str,
    sensor_id: str,
    value: float = Body(..., embed=True),
) -> Dict[str, Any]:
    """
    Inject a sudden reading into a sensor's history buffer to trigger
    spike detection on the next confidence evaluation.

    This simulates what happens when a sensor reading jumps abruptly
    (e.g. icing event, probe failure, electrical glitch).

    Body: { "value": <float> }

    After calling this, GET /sensor-confidence/{station_code} will show
    the spike in the sudden_changes list and a lowered confidence score.
    """
    station_key = station_code.upper()
    sensor_key = sensor_id.upper()

    specs = _registry_to_specs(station_code)
    matched = [s for s in specs if s.sensor_id == sensor_key]
    if not matched:
        raise HTTPException(
            status_code=404,
            detail=f"Sensor '{sensor_id}' not found in station '{station_code}'",
        )
    spec = matched[0]

    # Get or create history buffer
    if station_key not in _reading_history:
        _reading_history[station_key] = {}
    if sensor_key not in _reading_history[station_key]:
        _reading_history[station_key][sensor_key] = deque(maxlen=10)

    hist = _reading_history[station_key][sensor_key]
    previous = hist[-1][1] if hist else spec.reported_numeric
    hist.append((time.time(), value))

    threshold = SUDDEN_CHANGE_THRESHOLDS.get(spec.sensor_type, 10.0)
    delta = abs(value - previous) if previous is not None else 0.0

    return {
        "injected": True,
        "sensor_id": sensor_key,
        "station": station_key,
        "previous_value": previous,
        "injected_value": value,
        "delta": round(delta, 2),
        "threshold": threshold,
        "spike_detected": delta > threshold,
        "message": (
            f"Value {value} injected into {sensor_key} history. "
            f"Delta={delta:.1f} vs threshold={threshold}. "
            + ("SPIKE will be detected on next GET." if delta > threshold
               else "No spike — delta within threshold.")
        ),
    }
