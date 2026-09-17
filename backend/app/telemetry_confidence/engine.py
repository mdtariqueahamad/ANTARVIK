"""
Telemetry Confidence Engine
===========================

Core scoring logic.  Pure Python — no I/O, no DB, no async.
All inputs arrive via TelemetryPacket; outputs are ConfidenceReport.

Mathematical formulation
------------------------

  confidence = Σ wᵢ · sᵢ       where Σ wᵢ = 1.0,  sᵢ ∈ [0, 1]

Sub-scores
  s_sensor      — physical plausibility of the measured value
  s_temporal    — rate-of-change consistency vs. prior readings
  s_integrity   — CRC / hash / truncation checks
  s_timestamp   — data age, future-timestamp, clock drift
  s_comm        — RSSI, packet loss, latency, retransmit count
  s_device      — battery, uptime, hardware errors, calibration
  s_cross_val   — agreement with peer sensors measuring same param

Each sub-score is independently clamped to [0, 1].  Missing optional
fields return a configurable "neutral" score (default 0.80) rather
than penalising the sender for not implementing a feature.

CRC-32 verification
  We compute crc32(payload_bytes) and compare to packet.crc32.
  If payload_bytes is absent, integrity = neutral (0.80).

Staleness model (timestamp sub-score)
  age_s  = (received_at - timestamp).total_seconds()

  if age_s < 0:          future timestamp → s = 0.0
  if age_s < delayed:    s = 1.0
  if age_s < stale:      s = linear 1.0 → 0.5 over [delayed, stale]
  if age_s < very_stale: s = linear 0.5 → 0.1 over [stale, very_stale]
  if age_s >= very_stale: s = 0.0

Rate-of-change model (temporal sub-score)
  delta_per_s  = |value - prev_value| / max(elapsed_s, 0.1)
  ratio        = delta_per_s / max_rate_per_second
  if ratio ≤ 1:  s = 1.0
  if ratio ≤ 3:  s = linear 1.0 → 0.3 over [1, 3]
  if ratio > 3:  s = 0.0

RSSI model (comm sub-score component)
  s_rssi = clamp( (rssi - rssi_poor) / (rssi_good - rssi_poor), 0, 1 )

Packet-loss model
  s_loss = clamp( 1 - (loss - loss_ok) / (loss_bad - loss_ok), 0, 1 )

Cross-validation model
  For N peer readings {p₁ … pN} + own value v:
    mean = mean({v, p₁, …, pN})
    range = get_range(parameter).hard_max - hard_min
    max_deviation = max( |v - pᵢ| )
    ratio = max_deviation / (range * 0.1)    (10% of physical range = normaliser)
    s = clamp(1 - ratio, 0, 1)

Transmission priority matrix
  (confidence_level, criticality) → (action, priority 1-5)
  See _decide_transmission() for the full table.
"""

from __future__ import annotations

import hashlib
import struct
import zlib
from collections import deque
from datetime import datetime, timezone
from typing import Deque, Dict, List, Optional, Set, Tuple

from app.telemetry_confidence.models import (
    CommThresholds,
    ComponentScores,
    ConfidenceLevel,
    ConfidenceReport,
    ConfidenceThresholds,
    ConfidenceWeights,
    PhysicalRange,
    QualityFlag,
    StalenessThresholds,
    TelemetryPacket,
    TransmissionAction,
    TransmissionDecision,
    get_range,
)


# ──────────────────────────────────────────────────────────────────────────────
# Per-device history  (in-process, rolling window)
# In production this would be backed by Redis or TimescaleDB.
# ──────────────────────────────────────────────────────────────────────────────

HISTORY_WINDOW = 20   # readings kept per (device, parameter) pair

# {(device_id, parameter): deque[(timestamp, value)]}
_history: Dict[Tuple[str, str], Deque[Tuple[datetime, float]]] = {}

# {(device_id, parameter): last sequence number seen}
_last_seq: Dict[Tuple[str, str], int] = {}

# {packet_id} — seen packet IDs for duplicate detection (capped at 10000)
_seen_packet_ids: Set[str] = set()
_packet_id_order: Deque[str] = deque(maxlen=10000)

NEUTRAL_SCORE = 0.80   # returned when an optional field is absent


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _lerp(v: float, v0: float, v1: float, s0: float, s1: float) -> float:
    """Linear interpolation of score between two value anchors."""
    if v1 == v0:
        return s0
    t = (v - v0) / (v1 - v0)
    return _clamp(s0 + t * (s1 - s0))


# ──────────────────────────────────────────────────────────────────────────────
# Sub-scorer 1: Sensor validity
# ──────────────────────────────────────────────────────────────────────────────

def _score_sensor(
    packet: TelemetryPacket,
    flags: List[QualityFlag],
    notes: List[str],
) -> float:
    pr = get_range(packet.parameter)
    v  = packet.value

    # Hard limits — physically impossible
    if v < pr.hard_min or v > pr.hard_max:
        flags.append(QualityFlag.IMPOSSIBLE_VALUE)
        notes.append(
            f"Value {v} outside hard physical limits "
            f"[{pr.hard_min}, {pr.hard_max}] for '{packet.parameter}'"
        )
        return 0.0

    # Sensor fault flag from device
    score = 1.0
    if packet.sensor_fault:
        flags.append(QualityFlag.SENSOR_FAULT)
        notes.append("Device reported sensor fault flag")
        score *= 0.1

    # Calibration unknown or failed
    if packet.calibration_ok is False:
        flags.append(QualityFlag.UNCALIBRATED)
        notes.append("Sensor calibration failed or not completed")
        score *= 0.6
    elif packet.calibration_ok is None:
        score *= NEUTRAL_SCORE  # neutral — not reported

    # Soft limits — unusual but possible
    if v < pr.soft_min or v > pr.soft_max:
        flags.append(QualityFlag.OUT_OF_RANGE)
        notes.append(
            f"Value {v} outside soft expected range "
            f"[{pr.soft_min}, {pr.soft_max}] — plausible but unusual"
        )
        score *= 0.65

    return _clamp(score)


# ──────────────────────────────────────────────────────────────────────────────
# Sub-scorer 2: Temporal consistency
# ──────────────────────────────────────────────────────────────────────────────

def _score_temporal(
    packet: TelemetryPacket,
    flags: List[QualityFlag],
    notes: List[str],
) -> float:
    key = (packet.device_id, packet.parameter)
    hist = _history.get(key)

    if not hist:
        # First reading for this device/parameter — no history, neutral score
        return NEUTRAL_SCORE

    prev_ts, prev_val = hist[-1]
    pr = get_range(packet.parameter)

    # Frozen value check (last N readings identical)
    if len(hist) >= 3:
        unique_vals = set(v for _, v in hist)
        if len(unique_vals) == 1 and packet.value == prev_val:
            flags.append(QualityFlag.FROZEN_VALUE)
            notes.append(
                f"'{packet.parameter}' has been frozen at {prev_val} "
                f"for {len(hist)+1} consecutive readings"
            )
            return 0.3

    if pr.max_rate_per_second is None:
        # No rate check for this parameter (e.g. wind direction)
        return 1.0

    elapsed_s = (packet.timestamp - prev_ts).total_seconds()
    if elapsed_s <= 0:
        # Same or earlier timestamp vs history → possible out-of-order
        return NEUTRAL_SCORE

    delta = abs(packet.value - prev_val)
    delta_per_s = delta / max(elapsed_s, 0.1)
    ratio = delta_per_s / pr.max_rate_per_second

    if ratio <= 1.0:
        return 1.0
    elif ratio <= 3.0:
        flags.append(QualityFlag.SUDDEN_CHANGE)
        notes.append(
            f"'{packet.parameter}' changed {delta:.2f} units in {elapsed_s:.1f}s "
            f"({delta_per_s:.3f}/s vs max {pr.max_rate_per_second}/s, ratio={ratio:.2f})"
        )
        return _lerp(ratio, 1.0, 3.0, 1.0, 0.3)
    else:
        flags.append(QualityFlag.SUDDEN_CHANGE)
        notes.append(
            f"'{packet.parameter}' changed {delta:.2f} units in {elapsed_s:.1f}s — "
            f"ratio {ratio:.1f}x max plausible rate"
        )
        return 0.0


# ──────────────────────────────────────────────────────────────────────────────
# Sub-scorer 3: Packet integrity (CRC-32 + SHA-256 truncated)
# ──────────────────────────────────────────────────────────────────────────────

def _score_integrity(
    packet: TelemetryPacket,
    flags: List[QualityFlag],
    notes: List[str],
) -> float:
    if packet.payload_bytes is None:
        # No raw bytes supplied — cannot verify; neutral score
        return NEUTRAL_SCORE

    score = 1.0

    # CRC-32
    if packet.crc32 is not None:
        computed = zlib.crc32(packet.payload_bytes) & 0xFFFFFFFF
        if computed != (packet.crc32 & 0xFFFFFFFF):
            flags.append(QualityFlag.CRC_FAIL)
            notes.append(
                f"CRC-32 mismatch: expected {packet.crc32:#010x}, "
                f"computed {computed:#010x}"
            )
            score = 0.0
            return score  # hard fail — no point checking SHA

    # SHA-256 truncated (first 8 hex chars = 32-bit equivalent)
    if packet.sha256_truncated is not None:
        computed_hash = hashlib.sha256(packet.payload_bytes).hexdigest()[:8]
        if computed_hash != packet.sha256_truncated.lower():
            flags.append(QualityFlag.HASH_MISMATCH)
            notes.append(
                f"SHA-256 prefix mismatch: expected {packet.sha256_truncated}, "
                f"computed {computed_hash}"
            )
            score = 0.0

    return _clamp(score)


# ──────────────────────────────────────────────────────────────────────────────
# Sub-scorer 4: Timestamp validity
# ──────────────────────────────────────────────────────────────────────────────

def _score_timestamp(
    packet: TelemetryPacket,
    thresholds: StalenessThresholds,
    flags: List[QualityFlag],
    notes: List[str],
) -> float:
    now = packet.received_at or datetime.now(timezone.utc)

    # Ensure both are timezone-aware for comparison
    ts = packet.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    age_s = (now - ts).total_seconds()

    if age_s < 0:
        flags.append(QualityFlag.FUTURE_TIMESTAMP)
        notes.append(
            f"Timestamp is {-age_s:.1f}s in the future — "
            "possible clock drift or spoofed packet"
        )
        return 0.0

    if age_s < thresholds.delayed:
        return 1.0

    if age_s < thresholds.stale:
        flags.append(QualityFlag.DELAYED_PACKET)
        notes.append(f"Packet age {age_s:.0f}s — delayed but usable")
        return _lerp(age_s, thresholds.delayed, thresholds.stale, 1.0, 0.5)

    if age_s < thresholds.very_stale:
        flags.append(QualityFlag.STALE_DATA)
        notes.append(f"Packet age {age_s:.0f}s — stale data")
        return _lerp(age_s, thresholds.stale, thresholds.very_stale, 0.5, 0.1)

    flags.append(QualityFlag.STALE_DATA)
    notes.append(f"Packet age {age_s:.0f}s — data too old to be actionable")
    return 0.0


# ──────────────────────────────────────────────────────────────────────────────
# Sub-scorer 5: Communication quality
# ──────────────────────────────────────────────────────────────────────────────

def _score_communication(
    packet: TelemetryPacket,
    thresholds: CommThresholds,
    flags: List[QualityFlag],
    notes: List[str],
) -> float:
    scores: List[float] = []

    # RSSI
    if packet.rssi_dbm is not None:
        if packet.rssi_dbm >= thresholds.rssi_good:
            s_rssi = 1.0
        elif packet.rssi_dbm <= thresholds.rssi_poor:
            s_rssi = 0.0
            flags.append(QualityFlag.WEAK_SIGNAL)
            notes.append(f"RSSI {packet.rssi_dbm:.0f} dBm — very weak signal")
        else:
            s_rssi = _lerp(
                packet.rssi_dbm,
                thresholds.rssi_poor, thresholds.rssi_good,
                0.0, 1.0
            )
            if s_rssi < 0.4:
                flags.append(QualityFlag.WEAK_SIGNAL)
                notes.append(f"RSSI {packet.rssi_dbm:.0f} dBm — weak signal")
        scores.append(s_rssi)

    # Packet loss rate
    if packet.packet_loss_rate is not None:
        loss = packet.packet_loss_rate
        if loss <= thresholds.packet_loss_ok:
            s_loss = 1.0
        elif loss >= thresholds.packet_loss_bad:
            s_loss = 0.0
            flags.append(QualityFlag.HIGH_PACKET_LOSS)
            notes.append(f"Packet loss {loss*100:.0f}% — very high")
        else:
            s_loss = _lerp(
                loss,
                thresholds.packet_loss_ok, thresholds.packet_loss_bad,
                1.0, 0.0
            )
            if loss > 0.15:
                flags.append(QualityFlag.HIGH_PACKET_LOSS)
                notes.append(f"Packet loss {loss*100:.0f}%")
        scores.append(s_loss)

    # Latency
    if packet.latency_ms is not None:
        lat = packet.latency_ms
        if lat <= thresholds.latency_ok_ms:
            s_lat = 1.0
        elif lat >= thresholds.latency_bad_ms:
            s_lat = 0.0
            flags.append(QualityFlag.HIGH_LATENCY)
            notes.append(f"Latency {lat:.0f} ms — very high")
        else:
            s_lat = _lerp(
                lat,
                thresholds.latency_ok_ms, thresholds.latency_bad_ms,
                1.0, 0.0
            )
            if s_lat < 0.5:
                flags.append(QualityFlag.HIGH_LATENCY)
                notes.append(f"Latency {lat:.0f} ms — elevated")
        scores.append(s_lat)

    # Retransmit count
    if packet.retransmit_count is not None:
        rtx = packet.retransmit_count
        if rtx <= thresholds.retransmit_ok:
            s_rtx = 1.0
        elif rtx >= thresholds.retransmit_bad:
            s_rtx = 0.0
            flags.append(QualityFlag.EXCESSIVE_RETRANSMIT)
            notes.append(f"Retransmit count {rtx} — excessive")
        else:
            s_rtx = _lerp(
                float(rtx),
                float(thresholds.retransmit_ok), float(thresholds.retransmit_bad),
                1.0, 0.0
            )
        scores.append(s_rtx)

    # Reconnection event
    if packet.is_reconnection:
        flags.append(QualityFlag.RECONNECTION_EVENT)
        notes.append("First packet after communication loss — history gap possible")
        scores.append(0.5)

    # Link uptime (short uptime = recently reconnected = less trust)
    if packet.link_uptime_s is not None and packet.link_uptime_s < 30:
        flags.append(QualityFlag.INTERMITTENT_LINK)
        notes.append(f"Link uptime only {packet.link_uptime_s:.0f}s — intermittent connection")
        scores.append(_lerp(packet.link_uptime_s, 0.0, 30.0, 0.3, 0.9))

    return _clamp(sum(scores) / len(scores)) if scores else NEUTRAL_SCORE


# ──────────────────────────────────────────────────────────────────────────────
# Sub-scorer 6: Device health
# ──────────────────────────────────────────────────────────────────────────────

def _score_device_health(
    packet: TelemetryPacket,
    flags: List[QualityFlag],
    notes: List[str],
) -> float:
    scores: List[float] = []

    # Battery
    if packet.battery_pct is not None:
        b = packet.battery_pct
        if b >= 30:
            s_bat = 1.0
        elif b <= 5:
            s_bat = 0.0
            flags.append(QualityFlag.LOW_BATTERY)
            notes.append(f"Battery at {b:.0f}% — critically low")
        else:
            s_bat = _lerp(b, 5.0, 30.0, 0.0, 1.0)
            if b < 15:
                flags.append(QualityFlag.LOW_BATTERY)
                notes.append(f"Battery at {b:.0f}% — low")
        scores.append(s_bat)

    # Device uptime (very short = just rebooted)
    if packet.device_uptime_s is not None:
        up = packet.device_uptime_s
        if up < 30:
            flags.append(QualityFlag.SHORT_UPTIME)
            notes.append(f"Device uptime {up:.0f}s — recently rebooted, readings may be unreliable")
            scores.append(_lerp(up, 0.0, 30.0, 0.2, 0.8))
        elif up < 120:
            scores.append(_lerp(up, 30.0, 120.0, 0.8, 1.0))
        else:
            scores.append(1.0)

    # Hardware error bitmask (any bit set = penalty proportional to count)
    if packet.hardware_error_flags != 0:
        error_bits = bin(packet.hardware_error_flags).count("1")
        flags.append(QualityFlag.HARDWARE_ERROR)
        notes.append(f"Hardware error flags set: 0b{packet.hardware_error_flags:08b} ({error_bits} errors)")
        scores.append(_clamp(1.0 - error_bits * 0.2))  # each error = -20%

    return _clamp(sum(scores) / len(scores)) if scores else NEUTRAL_SCORE


# ──────────────────────────────────────────────────────────────────────────────
# Sub-scorer 7: Cross-validation
# ──────────────────────────────────────────────────────────────────────────────

def _score_cross_validation(
    packet: TelemetryPacket,
    flags: List[QualityFlag],
    notes: List[str],
) -> float:
    if not packet.peer_readings:
        return NEUTRAL_SCORE

    pr = get_range(packet.parameter)
    full_range = pr.hard_max - pr.hard_min
    if full_range <= 0:
        return NEUTRAL_SCORE

    all_vals = [packet.value] + [r["value"] for r in packet.peer_readings]
    mean_val = sum(all_vals) / len(all_vals)
    max_dev = max(abs(packet.value - p["value"]) for p in packet.peer_readings)

    # Normalise deviation against 10% of physical range
    normaliser = full_range * 0.10
    ratio = max_dev / max(normaliser, 1e-9)

    if ratio <= 1.0:
        return 1.0
    elif ratio <= 3.0:
        flags.append(QualityFlag.SENSOR_DISAGREEMENT)
        notes.append(
            f"Cross-validation: this sensor reads {packet.value:.2f}, "
            f"peers read {[r['value'] for r in packet.peer_readings]}. "
            f"Max deviation {max_dev:.2f} ({ratio:.1f}× tolerance)"
        )
        return _lerp(ratio, 1.0, 3.0, 1.0, 0.2)
    else:
        flags.append(QualityFlag.SENSOR_DISAGREEMENT)
        notes.append(
            f"Severe sensor disagreement: deviation {max_dev:.2f} "
            f"({ratio:.1f}× tolerance) vs peers {[r['value'] for r in packet.peer_readings]}"
        )
        return 0.0


# ──────────────────────────────────────────────────────────────────────────────
# Sequence / duplicate / out-of-order checks
# (augment flags before sub-scoring)
# ──────────────────────────────────────────────────────────────────────────────

def _check_sequence(
    packet: TelemetryPacket,
    flags: List[QualityFlag],
    notes: List[str],
) -> None:
    # Duplicate detection
    if packet.packet_id:
        if packet.packet_id in _seen_packet_ids:
            flags.append(QualityFlag.DUPLICATE_PACKET)
            notes.append(f"Duplicate packet_id {packet.packet_id} — already processed")
        else:
            _seen_packet_ids.add(packet.packet_id)
            _packet_id_order.append(packet.packet_id)
            # Trim oldest if deque is full (maxlen handles this)

    # Out-of-order detection
    if packet.sequence_number is not None:
        key = (packet.device_id, packet.parameter)
        last = _last_seq.get(key)
        if last is not None:
            if packet.sequence_number <= last:
                flags.append(QualityFlag.OUT_OF_ORDER_PACKET)
                notes.append(
                    f"Sequence {packet.sequence_number} ≤ last seen {last} "
                    "— out-of-order or duplicate"
                )
            elif packet.sequence_number > last + 10:
                flags.append(QualityFlag.HIGH_PACKET_LOSS)
                notes.append(
                    f"Sequence gap: expected ~{last+1}, got {packet.sequence_number} "
                    f"— {packet.sequence_number - last - 1} packets likely lost"
                )
        _last_seq[key] = max(_last_seq.get(key, -1), packet.sequence_number)


# ──────────────────────────────────────────────────────────────────────────────
# Confidence level classification
# ──────────────────────────────────────────────────────────────────────────────

def _classify(score: float, thresholds: ConfidenceThresholds) -> ConfidenceLevel:
    if score >= thresholds.high:
        return ConfidenceLevel.HIGH
    elif score >= thresholds.medium:
        return ConfidenceLevel.MEDIUM
    elif score >= thresholds.low:
        return ConfidenceLevel.LOW
    else:
        return ConfidenceLevel.VERY_LOW


# ──────────────────────────────────────────────────────────────────────────────
# Transmission priority decision  (second layer)
# ──────────────────────────────────────────────────────────────────────────────

def _decide_transmission(
    packet: TelemetryPacket,
    level: ConfidenceLevel,
    flags: List[QualityFlag],
) -> TransmissionDecision:
    """
    Confidence × criticality → action + priority.

    Priority scale: 1 = transmit immediately, 5 = defer/discard.

    Key design principle: a CRITICAL reading with LOW confidence should
    trigger ESCALATE + RETRANSMIT, not silent discard.
    """
    crit = packet.criticality.lower()
    is_critical = crit in ("critical", "high")

    # Unrecoverable data: CRC fail + not critical
    if QualityFlag.CRC_FAIL in flags or QualityFlag.HASH_MISMATCH in flags:
        if is_critical:
            return TransmissionDecision(
                action=TransmissionAction.RETRANSMIT,
                priority=1,
                reason="Corrupted critical packet — request re-measurement",
                retry_suggested=True,
                store_locally=False,
            )
        return TransmissionDecision(
            action=TransmissionAction.DISCARD,
            priority=5,
            reason="CRC/hash failure on non-critical data — discard",
            retry_suggested=False,
        )

    # Duplicate packet
    if QualityFlag.DUPLICATE_PACKET in flags:
        return TransmissionDecision(
            action=TransmissionAction.DISCARD,
            priority=5,
            reason="Duplicate packet — already processed",
        )

    # Decision matrix: (confidence_level, is_critical)
    matrix = {
        (ConfidenceLevel.HIGH,     True):  (TransmissionAction.TRANSMIT,          1, "High confidence critical data"),
        (ConfidenceLevel.HIGH,     False): (TransmissionAction.TRANSMIT,          3, "High confidence normal data"),
        (ConfidenceLevel.MEDIUM,   True):  (TransmissionAction.TRANSMIT,          2, "Medium confidence critical — transmit with flag"),
        (ConfidenceLevel.MEDIUM,   False): (TransmissionAction.TRANSMIT,          4, "Medium confidence normal data"),
        (ConfidenceLevel.LOW,      True):  (TransmissionAction.ESCALATE,          1, "Low confidence on critical parameter — escalate and request re-measurement"),
        (ConfidenceLevel.LOW,      False): (TransmissionAction.STORE_AND_FORWARD, 4, "Low confidence — buffer for batch transmission"),
        (ConfidenceLevel.VERY_LOW, True):  (TransmissionAction.ESCALATE,          1, "Very low confidence on critical — escalate immediately"),
        (ConfidenceLevel.VERY_LOW, False): (TransmissionAction.DISCARD,           5, "Very low confidence on non-critical — discard"),
    }

    action, priority, reason = matrix[(level, is_critical)]

    retry = action in (TransmissionAction.RETRANSMIT, TransmissionAction.ESCALATE)
    store = action == TransmissionAction.STORE_AND_FORWARD

    # Stale data: store-and-forward regardless (don't transmit old data over scarce bandwidth)
    if QualityFlag.STALE_DATA in flags and action == TransmissionAction.TRANSMIT and priority > 2:
        action  = TransmissionAction.STORE_AND_FORWARD
        reason += " (stale — buffered)"
        store   = True

    return TransmissionDecision(
        action=action,
        priority=priority,
        reason=reason,
        retry_suggested=retry,
        store_locally=store,
    )


# ──────────────────────────────────────────────────────────────────────────────
# History update
# ──────────────────────────────────────────────────────────────────────────────

def _update_history(packet: TelemetryPacket) -> None:
    key = (packet.device_id, packet.parameter)
    if key not in _history:
        _history[key] = deque(maxlen=HISTORY_WINDOW)
    _history[key].append((packet.timestamp, packet.value))


# ──────────────────────────────────────────────────────────────────────────────
# Public API: score one packet
# ──────────────────────────────────────────────────────────────────────────────

def score_packet(
    packet: TelemetryPacket,
    weights:    Optional[ConfidenceWeights]    = None,
    thresholds: Optional[ConfidenceThresholds] = None,
    staleness:  Optional[StalenessThresholds]  = None,
    comm_th:    Optional[CommThresholds]       = None,
) -> ConfidenceReport:
    """
    Score a single telemetry packet and return a ConfidenceReport.

    Parameters
    ----------
    packet     : incoming telemetry packet (immutable — history updated after scoring)
    weights    : sub-score weights (default ConfidenceWeights())
    thresholds : confidence level band edges
    staleness  : staleness timing thresholds
    comm_th    : communication quality thresholds
    """
    w   = weights    or ConfidenceWeights()
    th  = thresholds or ConfidenceThresholds()
    st  = staleness  or StalenessThresholds()
    ct  = comm_th    or CommThresholds()

    flags: List[QualityFlag] = []
    notes: List[str]         = []

    # ── Sequence / duplicate / out-of-order (pre-flight) ────────────────
    _check_sequence(packet, flags, notes)

    # ── Sub-scores ───────────────────────────────────────────────────────
    s_sensor   = _score_sensor(packet, flags, notes)
    s_temporal = _score_temporal(packet, flags, notes)
    s_integrity= _score_integrity(packet, flags, notes)
    s_timestamp= _score_timestamp(packet, st, flags, notes)
    s_comm     = _score_communication(packet, ct, flags, notes)
    s_device   = _score_device_health(packet, flags, notes)
    s_cross    = _score_cross_validation(packet, flags, notes)

    # ── Weighted composite ────────────────────────────────────────────────
    confidence = _clamp(
        w.w_sensor    * s_sensor   +
        w.w_temporal  * s_temporal +
        w.w_integrity * s_integrity +
        w.w_timestamp * s_timestamp +
        w.w_comm      * s_comm     +
        w.w_device    * s_device   +
        w.w_cross_val * s_cross
    )

    level      = _classify(confidence, th)
    decision   = _decide_transmission(packet, level, flags)

    # Update history AFTER scoring (do not let the current packet influence itself)
    _update_history(packet)

    return ConfidenceReport(
        device_id=packet.device_id,
        parameter=packet.parameter,
        value=packet.value,
        unit=packet.unit,
        timestamp=packet.timestamp,
        received_at=packet.received_at or datetime.now(timezone.utc),
        confidence_score=round(confidence, 4),
        confidence_level=level,
        quality_flags=list(set(flags)),   # deduplicate
        components=ComponentScores(
            sensor=round(s_sensor, 4),
            temporal=round(s_temporal, 4),
            integrity=round(s_integrity, 4),
            timestamp=round(s_timestamp, 4),
            communication=round(s_comm, 4),
            device_health=round(s_device, 4),
            cross_validation=round(s_cross, 4),
        ),
        transmission=decision,
        weights_used={
            "sensor":        w.w_sensor,
            "temporal":      w.w_temporal,
            "integrity":     w.w_integrity,
            "timestamp":     w.w_timestamp,
            "communication": w.w_comm,
            "device_health": w.w_device,
            "cross_validation": w.w_cross_val,
        },
        notes=notes,
    )


def reset_history() -> None:
    """Clear all in-process state. Used between test scenarios."""
    _history.clear()
    _last_seq.clear()
    _seen_packet_ids.clear()
    _packet_id_order.clear()
