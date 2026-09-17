"""
Telemetry Confidence Engine — Full Test Suite
=============================================

Covers all 13 failure scenarios specified in the design brief.
Run with: python -m pytest backend/tests/test_telemetry_confidence.py -v
Or standalone: cd backend && python tests/test_telemetry_confidence.py
"""

from __future__ import annotations

import hashlib
import json
import struct
import zlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.telemetry_confidence.engine import reset_history, score_packet
from app.telemetry_confidence.models import (
    ConfidenceLevel,
    QualityFlag,
    TelemetryPacket,
    TransmissionAction,
)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_payload(value: float, parameter: str) -> bytes:
    """Minimal deterministic payload: parameter name + float64."""
    return parameter.encode() + struct.pack(">d", value)


def _make_packet(**kwargs) -> TelemetryPacket:
    data: Dict[str, Any] = dict(
        device_id="ANT-001",
        parameter="temperature",
        value=-28.4,
        unit="°C",
        timestamp=_now(),
    )
    data.update(kwargs)
    return TelemetryPacket.model_validate(data)


def _score(packet: TelemetryPacket):
    return score_packet(packet)


def _print_result(scenario: str, report) -> None:
    print(f"\n{'='*70}")
    print(f"  SCENARIO: {scenario}")
    print(f"{'='*70}")
    print(f"  device_id       : {report.device_id}")
    print(f"  parameter       : {report.parameter}")
    print(f"  value           : {report.value}")
    print(f"  confidence      : {report.confidence_score:.4f}  [{report.confidence_level.value}]")
    print(f"  quality_flags   : {[f.value for f in report.quality_flags]}")
    print(f"  transmission    : {report.transmission.action.value}  (priority={report.transmission.priority})")
    print(f"  tx_reason       : {report.transmission.reason}")
    print(f"  components:")
    c = report.components
    print(f"    sensor={c.sensor:.3f}  temporal={c.temporal:.3f}  integrity={c.integrity:.3f}")
    print(f"    timestamp={c.timestamp:.3f}  comm={c.communication:.3f}")
    print(f"    device_health={c.device_health:.3f}  cross_val={c.cross_validation:.3f}")
    if report.notes:
        print(f"  notes:")
        for n in report.notes:
            print(f"    • {n}")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario helpers
# ──────────────────────────────────────────────────────────────────────────────

def _assert(condition: bool, msg: str) -> None:
    if not condition:
        raise AssertionError(msg)


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 1: Normal telemetry
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_01_normal():
    reset_history()
    payload = _make_payload(-28.4, "temperature")
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    sha = hashlib.sha256(payload).hexdigest()[:8]

    packet = _make_packet(
        value=-28.4,
        payload_bytes=payload,
        crc32=crc,
        sha256_truncated=sha,
        rssi_dbm=-65.0,
        packet_loss_rate=0.02,
        latency_ms=200.0,
        retransmit_count=0,
        battery_pct=85.0,
        device_uptime_s=86400.0,
        hardware_error_flags=0,
        calibration_ok=True,
        sequence_number=1,
        packet_id="pkt-001",
        criticality="normal",
    )
    r = _score(packet)
    _print_result("01 — Normal telemetry", r)

    _assert(r.confidence_score >= 0.85, f"Expected HIGH/MEDIUM, got {r.confidence_score}")
    _assert(r.quality_flags == [], f"Expected no flags, got {r.quality_flags}")
    _assert(r.transmission.action == TransmissionAction.TRANSMIT, "Should transmit")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 2: Sensor producing impossible values
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_02_impossible_value():
    reset_history()
    packet = _make_packet(value=999.9, criticality="high")  # 999.9°C impossible
    r = _score(packet)
    _print_result("02 — Impossible sensor value (999.9°C)", r)

    _assert(QualityFlag.IMPOSSIBLE_VALUE in r.quality_flags, "Expected IMPOSSIBLE_VALUE flag")
    _assert(r.components.sensor == 0.0, f"Sensor score should be 0, got {r.components.sensor}")
    _assert(r.confidence_score < 0.75, f"Expected LOW or lower when sensor=0, got {r.confidence_score}")
    _assert(r.transmission.action in (
        TransmissionAction.ESCALATE, TransmissionAction.RETRANSMIT
    ), f"Critical impossible value should escalate, got {r.transmission.action}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 3: Sudden unrealistic temperature change
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_03_sudden_temp_change():
    reset_history()
    # Seed history with a normal reading
    p1 = _make_packet(value=-28.4, timestamp=_now() - timedelta(seconds=5))
    score_packet(p1)

    # Second reading: +40°C in 5 seconds — impossible rate
    p2 = _make_packet(value=11.6, timestamp=_now())
    r = _score(p2)
    _print_result("03 — Sudden temperature change (+40°C in 5s)", r)

    _assert(QualityFlag.SUDDEN_CHANGE in r.quality_flags, "Expected SUDDEN_CHANGE flag")
    _assert(r.components.temporal < 0.5, f"Temporal score should be low, got {r.components.temporal}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 4: Corrupted packet (CRC fail)
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_04_corrupted_packet():
    reset_history()
    payload = _make_payload(-28.4, "temperature")
    bad_crc = 0xDEADBEEF  # deliberately wrong

    packet = _make_packet(
        value=-28.4,
        payload_bytes=payload,
        crc32=bad_crc,
        criticality="normal",
    )
    r = _score(packet)
    _print_result("04 — Corrupted packet (CRC mismatch)", r)

    _assert(QualityFlag.CRC_FAIL in r.quality_flags, "Expected CRC_FAIL flag")
    _assert(r.components.integrity == 0.0, f"Integrity should be 0, got {r.components.integrity}")
    _assert(r.transmission.action == TransmissionAction.DISCARD, "Non-critical corrupted should be discarded")
    print("  ✓ PASS")


def test_scenario_04b_corrupted_critical():
    reset_history()
    payload = _make_payload(-28.4, "temperature")
    packet = _make_packet(
        value=-28.4,
        payload_bytes=payload,
        crc32=0xDEADBEEF,
        criticality="critical",
    )
    r = _score(packet)
    _print_result("04b — Corrupted critical packet", r)

    _assert(r.transmission.action == TransmissionAction.RETRANSMIT,
            f"Critical corrupted should RETRANSMIT, got {r.transmission.action}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 5: High packet loss
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_05_high_packet_loss():
    reset_history()
    packet = _make_packet(
        value=-28.4,
        packet_loss_rate=0.45,   # 45% loss
        rssi_dbm=-95.0,
        criticality="normal",
    )
    r = _score(packet)
    _print_result("05 — High packet loss (45%)", r)

    _assert(QualityFlag.HIGH_PACKET_LOSS in r.quality_flags, "Expected HIGH_PACKET_LOSS")
    _assert(r.components.communication < 0.5, f"Comm score should be low, got {r.components.communication}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 6: Very high latency
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_06_high_latency():
    reset_history()
    packet = _make_packet(
        value=-28.4,
        latency_ms=8000.0,   # 8 second RTT
        criticality="high",
    )
    r = _score(packet)
    _print_result("06 — Very high latency (8000 ms)", r)

    _assert(QualityFlag.HIGH_LATENCY in r.quality_flags, "Expected HIGH_LATENCY")
    _assert(r.components.communication < 0.5, f"Comm score should be low, got {r.components.communication}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 7: Stale telemetry
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_07_stale_data():
    reset_history()
    old_ts = _now() - timedelta(minutes=15)  # 15 minutes old
    packet = _make_packet(value=-28.4, timestamp=old_ts, criticality="normal")
    r = _score(packet)
    _print_result("07 — Stale data (15 min old)", r)

    _assert(QualityFlag.STALE_DATA in r.quality_flags, "Expected STALE_DATA flag")
    _assert(r.components.timestamp == 0.0, f"Timestamp score should be 0, got {r.components.timestamp}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 8: Low battery
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_08_low_battery():
    reset_history()
    packet = _make_packet(value=-28.4, battery_pct=4.0, criticality="critical")
    r = _score(packet)
    _print_result("08 — Low battery (4%)", r)

    _assert(QualityFlag.LOW_BATTERY in r.quality_flags, "Expected LOW_BATTERY flag")
    _assert(r.components.device_health < 0.3, f"Device health should be very low, got {r.components.device_health}")
    _assert(r.transmission.action in (
        TransmissionAction.ESCALATE, TransmissionAction.TRANSMIT
    ), "Critical low-battery reading should still be escalated/transmitted")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 9: Sensor disagreement (cross-validation failure)
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_09_sensor_disagreement():
    reset_history()
    # This sensor reads -28.4, peers read +12.0 — severe disagreement
    packet = _make_packet(
        value=-28.4,
        peer_readings=[
            {"value": 12.0},
            {"value": 11.5},
        ],
        criticality="normal",
    )
    r = _score(packet)
    _print_result("09 — Sensor disagreement (this=-28.4, peers=+12.0)", r)

    _assert(QualityFlag.SENSOR_DISAGREEMENT in r.quality_flags, "Expected SENSOR_DISAGREEMENT")
    _assert(r.components.cross_validation < 0.5,
            f"Cross-val should be low, got {r.components.cross_validation}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 10: Intermittent connection
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_10_intermittent_connection():
    reset_history()
    packet = _make_packet(
        value=-28.4,
        link_uptime_s=8.0,    # only 8 s since last dropout
        packet_loss_rate=0.20,
        rssi_dbm=-98.0,
        criticality="normal",
    )
    r = _score(packet)
    _print_result("10 — Intermittent connection (link_uptime=8s, loss=20%)", r)

    _assert(QualityFlag.INTERMITTENT_LINK in r.quality_flags, "Expected INTERMITTENT_LINK")
    _assert(r.components.communication < 0.6,
            f"Comm score should be degraded, got {r.components.communication}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 11: Duplicate packet
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_11_duplicate_packet():
    reset_history()
    packet_id = "pkt-dup-001"

    # First transmission
    p1 = _make_packet(value=-28.4, packet_id=packet_id, sequence_number=5)
    r1 = _score(p1)

    # Exact retransmission
    p2 = _make_packet(value=-28.4, packet_id=packet_id, sequence_number=5)
    r2 = _score(p2)
    _print_result("11 — Duplicate packet (same packet_id)", r2)

    _assert(QualityFlag.DUPLICATE_PACKET in r2.quality_flags, "Expected DUPLICATE_PACKET")
    _assert(r2.transmission.action == TransmissionAction.DISCARD,
            f"Duplicate should be discarded, got {r2.transmission.action}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 12: Out-of-order packets
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_12_out_of_order():
    reset_history()
    # Send seq 10 first, then seq 3 arrives late
    p1 = _make_packet(value=-28.4, sequence_number=10, timestamp=_now() - timedelta(seconds=2))
    r1 = _score(p1)

    p2 = _make_packet(value=-29.0, sequence_number=3, timestamp=_now() - timedelta(seconds=5))
    r2 = _score(p2)
    _print_result("12 — Out-of-order packet (seq=3 after seq=10)", r2)

    _assert(QualityFlag.OUT_OF_ORDER_PACKET in r2.quality_flags, "Expected OUT_OF_ORDER_PACKET")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Scenario 13: Reconnection after communication loss
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_13_reconnection():
    reset_history()
    # Simulate 20 packets, then a gap, then reconnection
    for i in range(5):
        p = _make_packet(
            value=-28.0 - i * 0.1,
            timestamp=_now() - timedelta(minutes=30 - i),
            sequence_number=i,
        )
        score_packet(p)

    # Reconnection packet: large sequence gap + is_reconnection flag
    p_recon = _make_packet(
        value=-30.5,
        sequence_number=150,       # 145 packets missing
        is_reconnection=True,
        link_uptime_s=2.0,
        criticality="high",
    )
    r = _score(p_recon)
    _print_result("13 — Reconnection after 145-packet dropout", r)

    _assert(QualityFlag.RECONNECTION_EVENT in r.quality_flags, "Expected RECONNECTION_EVENT")
    _assert(QualityFlag.HIGH_PACKET_LOSS in r.quality_flags, "Expected HIGH_PACKET_LOSS from seq gap")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Bonus: Future timestamp (clock drift / spoofed)
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_bonus_future_timestamp():
    reset_history()
    future_ts = _now() + timedelta(hours=2)
    packet = _make_packet(value=-28.4, timestamp=future_ts, criticality="normal")
    r = _score(packet)
    _print_result("BONUS — Future timestamp (+2h)", r)

    _assert(QualityFlag.FUTURE_TIMESTAMP in r.quality_flags, "Expected FUTURE_TIMESTAMP")
    _assert(r.components.timestamp == 0.0, f"Timestamp score should be 0, got {r.components.timestamp}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Bonus: Frozen sensor (same value 5 readings in a row)
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_bonus_frozen_sensor():
    reset_history()
    for i in range(6):
        p = _make_packet(
            value=-28.4,  # frozen value
            timestamp=_now() - timedelta(seconds=30 - i * 5),
            sequence_number=i,
        )
        score_packet(p)

    r = _score(_make_packet(value=-28.4, sequence_number=6))
    _print_result("BONUS — Frozen sensor (same value 7 readings)", r)

    _assert(QualityFlag.FROZEN_VALUE in r.quality_flags, "Expected FROZEN_VALUE")
    _assert(r.components.temporal <= 0.3, f"Temporal score should be low, got {r.components.temporal}")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Bonus: Custom weights (storm scenario — upweight comm, downweight cross_val)
# ──────────────────────────────────────────────────────────────────────────────

def test_scenario_bonus_custom_weights():
    from app.telemetry_confidence.models import ConfidenceWeights
    reset_history()

    # During a katabatic storm: comm quality dominates, cross-val less important
    storm_weights = ConfidenceWeights(
        w_sensor=0.20,
        w_temporal=0.15,
        w_integrity=0.15,
        w_timestamp=0.10,
        w_comm=0.25,      # ↑ comm weight
        w_device=0.10,
        w_cross_val=0.05, # ↓ cross-val (fewer redundant sensors reachable)
    )
    packet = _make_packet(
        value=-28.4,
        rssi_dbm=-88.0,
        packet_loss_rate=0.12,
        latency_ms=1200.0,
        criticality="high",
    )
    r = score_packet(packet, weights=storm_weights)
    _print_result("BONUS — Custom weights (katabatic storm profile)", r)

    _assert(r.weights_used["communication"] == 0.25, "Custom weight not applied")
    print("  ✓ PASS")


# ──────────────────────────────────────────────────────────────────────────────
# Run all
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    scenarios = [
        test_scenario_01_normal,
        test_scenario_02_impossible_value,
        test_scenario_03_sudden_temp_change,
        test_scenario_04_corrupted_packet,
        test_scenario_04b_corrupted_critical,
        test_scenario_05_high_packet_loss,
        test_scenario_06_high_latency,
        test_scenario_07_stale_data,
        test_scenario_08_low_battery,
        test_scenario_09_sensor_disagreement,
        test_scenario_10_intermittent_connection,
        test_scenario_11_duplicate_packet,
        test_scenario_12_out_of_order,
        test_scenario_13_reconnection,
        test_scenario_bonus_future_timestamp,
        test_scenario_bonus_frozen_sensor,
        test_scenario_bonus_custom_weights,
    ]

    passed = failed = 0
    for fn in scenarios:
        try:
            fn()
            passed += 1
        except AssertionError as e:
            print(f"\n  ✗ FAIL: {e}")
            failed += 1
        except Exception as e:
            print(f"\n  ✗ ERROR in {fn.__name__}: {e}")
            import traceback; traceback.print_exc()
            failed += 1

    print(f"\n{'='*70}")
    print(f"  Results: {passed} passed, {failed} failed / {len(scenarios)} total")
    print(f"{'='*70}")
    sys.exit(0 if failed == 0 else 1)
