"""
Telemetry Confidence API Router
================================

POST /telemetry-confidence/score
    Score a single telemetry packet.

POST /telemetry-confidence/score/batch
    Score up to 100 packets at once (preserves ordering; useful for replaying
    delayed or out-of-order Antarctic link buffers).

GET  /telemetry-confidence/weights
    Return the active default weights and thresholds.

POST /telemetry-confidence/reset-history
    Clear in-process history (test/demo use only).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException

from app.telemetry_confidence.engine import reset_history, score_packet
from app.telemetry_confidence.models import (
    CommThresholds,
    ConfidenceReport,
    ConfidenceThresholds,
    ConfidenceWeights,
    StalenessThresholds,
    TelemetryPacket,
)

router = APIRouter(prefix="/telemetry-confidence", tags=["telemetry-confidence"])


def _report_to_dict(r: ConfidenceReport) -> Dict[str, Any]:
    return {
        "device_id":        r.device_id,
        "parameter":        r.parameter,
        "value":            r.value,
        "unit":             r.unit,
        "timestamp":        r.timestamp.isoformat(),
        "received_at":      r.received_at.isoformat(),
        "confidence_score": r.confidence_score,
        "confidence_level": r.confidence_level.value,
        "quality_flags":    [f.value for f in r.quality_flags],
        "components": {
            "sensor":           r.components.sensor,
            "temporal":         r.components.temporal,
            "integrity":        r.components.integrity,
            "timestamp":        r.components.timestamp,
            "communication":    r.components.communication,
            "device_health":    r.components.device_health,
            "cross_validation": r.components.cross_validation,
        },
        "transmission": {
            "action":          r.transmission.action.value,
            "priority":        r.transmission.priority,
            "reason":          r.transmission.reason,
            "retry_suggested": r.transmission.retry_suggested,
            "store_locally":   r.transmission.store_locally,
        },
        "weights_used": r.weights_used,
        "notes": r.notes,
    }


@router.post("/score", response_model=None)
async def score_single(
    packet: TelemetryPacket = Body(...),
) -> Dict[str, Any]:
    """
    Score one telemetry packet.

    The request body is a TelemetryPacket JSON object.
    All fields beyond device_id / parameter / value / timestamp are optional —
    absent fields are scored neutrally (0.80) rather than penalised.
    """
    report = score_packet(packet)
    return _report_to_dict(report)


@router.post("/score/batch", response_model=None)
async def score_batch(
    packets: List[TelemetryPacket] = Body(...),
) -> List[Dict[str, Any]]:
    """
    Score up to 100 telemetry packets in submission order.

    Useful for replaying a buffered store-and-forward queue after an
    Antarctic communication blackout.  Each packet is scored in sequence
    so temporal history is correctly maintained across the batch.
    """
    if len(packets) > 100:
        raise HTTPException(status_code=400, detail="Batch limit is 100 packets")
    return [_report_to_dict(score_packet(p)) for p in packets]


@router.get("/weights", response_model=None)
async def get_defaults() -> Dict[str, Any]:
    """Return active default weights, thresholds, and physical range config."""
    from app.telemetry_confidence.models import PARAMETER_RANGES

    w  = ConfidenceWeights()
    th = ConfidenceThresholds()
    st = StalenessThresholds()
    ct = CommThresholds()

    return {
        "formula": (
            "confidence = w_sensor*s_sensor + w_temporal*s_temporal + "
            "w_integrity*s_integrity + w_timestamp*s_timestamp + "
            "w_comm*s_comm + w_device*s_device + w_cross_val*s_cross_val"
        ),
        "weights": {
            "sensor":           w.w_sensor,
            "temporal":         w.w_temporal,
            "integrity":        w.w_integrity,
            "timestamp":        w.w_timestamp,
            "communication":    w.w_comm,
            "device_health":    w.w_device,
            "cross_validation": w.w_cross_val,
            "sum":              round(
                w.w_sensor + w.w_temporal + w.w_integrity +
                w.w_timestamp + w.w_comm + w.w_device + w.w_cross_val, 6
            ),
        },
        "confidence_levels": {
            "HIGH":     f">= {th.high}",
            "MEDIUM":   f"{th.medium} – {th.high}",
            "LOW":      f"{th.low} – {th.medium}",
            "VERY_LOW": f"< {th.low}",
            "note":     "Initial engineering thresholds — calibrate with real Antarctic data",
        },
        "staleness_thresholds_s": {
            "delayed":    st.delayed,
            "stale":      st.stale,
            "very_stale": st.very_stale,
        },
        "communication_thresholds": {
            "rssi_good_dbm":      ct.rssi_good,
            "rssi_poor_dbm":      ct.rssi_poor,
            "packet_loss_ok":     ct.packet_loss_ok,
            "packet_loss_bad":    ct.packet_loss_bad,
            "latency_ok_ms":      ct.latency_ok_ms,
            "latency_bad_ms":     ct.latency_bad_ms,
            "retransmit_ok":      ct.retransmit_ok,
            "retransmit_bad":     ct.retransmit_bad,
        },
        "parameter_ranges": {
            k: {
                "hard_min": v.hard_min,
                "hard_max": v.hard_max,
                "soft_min": v.soft_min,
                "soft_max": v.soft_max,
                "max_rate_per_second": v.max_rate_per_second,
            }
            for k, v in PARAMETER_RANGES.items()
        },
    }


@router.post("/reset-history", response_model=None)
async def reset() -> Dict[str, str]:
    """
    Clear all in-process sensor history, sequence counters, and packet-ID cache.
    Use between test scenarios or on application restart.
    """
    reset_history()
    return {"status": "ok", "message": "History cleared"}
