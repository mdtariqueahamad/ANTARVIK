"""
Telemetry Confidence Scoring — Data Models & Schemas
=====================================================

All input and output types for the confidence-scoring pipeline.

Design notes
------------
* TelemetryPacket carries the raw measurement PLUS every envelope field that
  exists in the Antarctic communication stack: CRC, RSSI, retransmit count,
  sequence number, etc.  Fields that a given sender cannot supply are Optional
  and scored neutrally (neither penalised nor rewarded).

* ConfidenceWeights is a plain dataclass so callers can override defaults at
  runtime (e.g. during a katabatic storm, raise w_communication weight).

* TransmissionDecision is the second-layer output: confidence alone does not
  decide what to do with a packet.  Criticality + freshness + network
  availability feed a separate priority engine.
"""

from __future__ import annotations

import hashlib
import struct
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


# ──────────────────────────────────────────────────────────────────────────────
# Enumerations
# ──────────────────────────────────────────────────────────────────────────────

class ConfidenceLevel(str, Enum):
    HIGH     = "HIGH"       # ≥ 0.90
    MEDIUM   = "MEDIUM"     # 0.75 – 0.89
    LOW      = "LOW"        # 0.50 – 0.74
    VERY_LOW = "VERY_LOW"   # < 0.50


class TransmissionAction(str, Enum):
    TRANSMIT          = "TRANSMIT"           # send now
    RETRANSMIT        = "RETRANSMIT"         # ask for re-measurement / ACK retry
    STORE_AND_FORWARD = "STORE_AND_FORWARD"  # buffer until link available
    DISCARD           = "DISCARD"            # unrecoverable junk
    ESCALATE          = "ESCALATE"           # alert operator immediately


class QualityFlag(str, Enum):
    # Sensor validity
    OUT_OF_RANGE         = "OUT_OF_RANGE"
    IMPOSSIBLE_VALUE     = "IMPOSSIBLE_VALUE"
    SENSOR_FAULT         = "SENSOR_FAULT"
    UNCALIBRATED         = "UNCALIBRATED"
    # Temporal
    SUDDEN_CHANGE        = "SUDDEN_CHANGE"
    FROZEN_VALUE         = "FROZEN_VALUE"        # same value for N readings
    # Integrity
    CRC_FAIL             = "CRC_FAIL"
    HASH_MISMATCH        = "HASH_MISMATCH"
    TRUNCATED_PACKET     = "TRUNCATED_PACKET"
    # Timestamp
    STALE_DATA           = "STALE_DATA"
    FUTURE_TIMESTAMP     = "FUTURE_TIMESTAMP"
    CLOCK_DRIFT          = "CLOCK_DRIFT"
    DELAYED_PACKET       = "DELAYED_PACKET"
    # Communication
    HIGH_PACKET_LOSS     = "HIGH_PACKET_LOSS"
    WEAK_SIGNAL          = "WEAK_SIGNAL"
    HIGH_LATENCY         = "HIGH_LATENCY"
    EXCESSIVE_RETRANSMIT = "EXCESSIVE_RETRANSMIT"
    DUPLICATE_PACKET     = "DUPLICATE_PACKET"
    OUT_OF_ORDER_PACKET  = "OUT_OF_ORDER_PACKET"
    # Device health
    LOW_BATTERY          = "LOW_BATTERY"
    HARDWARE_ERROR       = "HARDWARE_ERROR"
    SHORT_UPTIME         = "SHORT_UPTIME"        # device just rebooted
    # Cross-validation
    SENSOR_DISAGREEMENT  = "SENSOR_DISAGREEMENT"
    # Communication state
    RECONNECTION_EVENT   = "RECONNECTION_EVENT"
    INTERMITTENT_LINK    = "INTERMITTENT_LINK"


# ──────────────────────────────────────────────────────────────────────────────
# Parameter physical ranges  (Antarctic-specific)
# Source: station environmental specs + IEC sensor standards
# These are engineering judgement values; calibrate against real data.
# ──────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class PhysicalRange:
    hard_min: float        # below this → IMPOSSIBLE_VALUE
    hard_max: float        # above this → IMPOSSIBLE_VALUE
    soft_min: float        # below this → OUT_OF_RANGE (plausible but unusual)
    soft_max: float        # above this → OUT_OF_RANGE
    # max plausible change between consecutive readings (same unit as value)
    # None means "no temporal check" (e.g. discrete state variables)
    max_rate_per_second: Optional[float] = None


PARAMETER_RANGES: Dict[str, PhysicalRange] = {
    # Temperature (°C)  — Antarctic range -89 (Vostok record) to +15 coastal
    "temperature":    PhysicalRange(-89.0, 15.0,  -55.0, 5.0,   max_rate_per_second=0.5),
    # Wind speed (m/s)
    "wind_speed":     PhysicalRange(0.0,   100.0,  0.0,  55.0,  max_rate_per_second=5.0),
    # Wind direction (degrees)
    "wind_direction": PhysicalRange(0.0,   360.0,  0.0,  360.0, max_rate_per_second=None),
    # Atmospheric pressure (hPa)
    "pressure":       PhysicalRange(870.0, 1060.0, 940.0,1020.0,max_rate_per_second=0.3),
    # Relative humidity (%)
    "humidity":       PhysicalRange(0.0,   100.0,  5.0,  100.0, max_rate_per_second=5.0),
    # Battery voltage (V) — typical 12 V or 24 V system
    "battery_voltage":PhysicalRange(0.0,   30.0,   10.5, 29.0,  max_rate_per_second=0.2),
    # Battery SoC (%)
    "battery_soc":    PhysicalRange(0.0,   100.0,  5.0,  100.0, max_rate_per_second=2.0),
    # Fuel level (litres)
    "fuel_level":     PhysicalRange(0.0,   200000.0,0.0, 200000.0,max_rate_per_second=50.0),
    # Solar irradiance (W/m²)
    "solar_irradiance":PhysicalRange(0.0,  1500.0, 0.0,  1400.0,max_rate_per_second=50.0),
    # Power (kW)
    "power_kw":       PhysicalRange(-5.0,  500.0, -1.0,  300.0, max_rate_per_second=30.0),
    # Glycol loop pressure (bar)
    "glycol_pressure":PhysicalRange(0.0,   15.0,   0.5,  10.0,  max_rate_per_second=1.0),
    # RSSI (dBm) — used internally, no temporal check
    "rssi":           PhysicalRange(-130.0, 0.0,  -110.0,-20.0, max_rate_per_second=None),
    # Generic fallback
    "_default":       PhysicalRange(-1e9,  1e9,   -1e6,  1e6,   max_rate_per_second=None),
}


def get_range(parameter: str) -> PhysicalRange:
    return PARAMETER_RANGES.get(parameter, PARAMETER_RANGES["_default"])


# ──────────────────────────────────────────────────────────────────────────────
# Configurable weights
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class ConfidenceWeights:
    """
    Seven sub-score weights that must sum to 1.0.

    These are engineering starting points — calibrate against ground truth once
    real Antarctic telemetry data is available.

    Rationale for defaults:
      sensor      0.22 — physical range violation is a hard correctness signal
      temporal    0.18 — rate-of-change is a strong anomaly indicator
      integrity   0.16 — CRC/hash failure is a definitive data corruption signal
      timestamp   0.12 — staleness affects usefulness, not correctness
      comm        0.14 — link quality is an environmental factor (not sensor error)
      device      0.10 — device health modulates but rarely dominates
      cross_val   0.08 — cross-validation requires redundant sensors (not always available)
    """
    w_sensor:      float = 0.22
    w_temporal:    float = 0.18
    w_integrity:   float = 0.16
    w_timestamp:   float = 0.12
    w_comm:        float = 0.14
    w_device:      float = 0.10
    w_cross_val:   float = 0.08

    def __post_init__(self) -> None:
        total = round(
            self.w_sensor + self.w_temporal + self.w_integrity +
            self.w_timestamp + self.w_comm + self.w_device + self.w_cross_val, 6
        )
        if abs(total - 1.0) > 1e-4:
            raise ValueError(f"ConfidenceWeights must sum to 1.0, got {total}")


@dataclass
class ConfidenceThresholds:
    """Configurable confidence-level band edges (initial engineering values)."""
    high:   float = 0.90
    medium: float = 0.75
    low:    float = 0.50
    # below low → VERY_LOW


@dataclass
class StalenessThresholds:
    """How old is too old, in seconds."""
    delayed:  float = 30.0    # packet age where we note a delay
    stale:    float = 120.0   # packet age where confidence starts declining
    very_stale: float = 600.0 # 10 min — near-zero timestamp score


@dataclass
class CommThresholds:
    """Communication quality engineering limits."""
    rssi_good:         float = -70.0   # dBm
    rssi_poor:         float = -100.0  # dBm
    packet_loss_ok:    float = 0.05    # 5% loss → full score
    packet_loss_bad:   float = 0.30    # 30%+ → score = 0
    latency_ok_ms:     float = 500.0
    latency_bad_ms:    float = 5000.0
    retransmit_ok:     int   = 1
    retransmit_bad:    int   = 5


# ──────────────────────────────────────────────────────────────────────────────
# Input: the raw telemetry packet
# ──────────────────────────────────────────────────────────────────────────────

class TelemetryPacket(BaseModel):
    """
    A single telemetry observation as received over the Antarctic link.

    Fields marked Optional are gracefully absent-handled: the sub-scorer
    returns a neutral score (0.80) rather than penalising a missing field,
    because the field may simply not be implemented on the sender.
    """

    # ── Identification ──────────────────────────────────────────────────
    device_id:        str
    parameter:        str    # matches PARAMETER_RANGES key
    value:            float
    unit:             Optional[str] = None
    timestamp:        datetime      # sensor-side measurement time (UTC)
    received_at:      Optional[datetime] = None  # gateway receive time

    # ── Sequence & deduplication ────────────────────────────────────────
    sequence_number:  Optional[int]   = None   # monotonic per device
    packet_id:        Optional[str]   = None   # globally unique packet ID

    # ── Integrity ───────────────────────────────────────────────────────
    crc32:            Optional[int]   = None   # CRC-32 of payload bytes
    sha256_truncated: Optional[str]   = None   # first 8 hex chars of SHA-256
    payload_bytes:    Optional[bytes] = None   # raw payload for checksum verify

    # ── Communication envelope ──────────────────────────────────────────
    rssi_dbm:         Optional[float] = None   # received signal strength
    snr_db:           Optional[float] = None   # signal-to-noise ratio
    packet_loss_rate: Optional[float] = None   # 0.0–1.0 over recent window
    latency_ms:       Optional[float] = None   # round-trip or one-way
    retransmit_count: Optional[int]   = None   # how many times this packet was retried
    link_uptime_s:    Optional[float] = None   # seconds since last reconnection
    is_reconnection:  bool = False             # first packet after a dropout

    # ── Device health ───────────────────────────────────────────────────
    battery_pct:      Optional[float] = None   # 0–100
    device_uptime_s:  Optional[float] = None   # seconds since last reboot
    hardware_error_flags: int = 0              # bitmask; 0 = no errors
    calibration_ok:   Optional[bool]  = None   # sensor self-calibration passed
    sensor_fault:     bool = False

    # ── Cross-validation ────────────────────────────────────────────────
    # List of (device_id, value) from other sensors measuring the same parameter
    peer_readings:    List[Dict[str, float]] = Field(default_factory=list)

    # ── Criticality (for transmission priority, separate from confidence) ─
    # e.g. "critical" | "high" | "normal" | "low"
    criticality:      str = "normal"

    @model_validator(mode="after")
    def _set_received_at(self) -> "TelemetryPacket":
        if self.received_at is None:
            self.received_at = datetime.now(timezone.utc)
        return self

    model_config = {"arbitrary_types_allowed": True}


# ──────────────────────────────────────────────────────────────────────────────
# Output: scored packet
# ──────────────────────────────────────────────────────────────────────────────

class ComponentScores(BaseModel):
    sensor:        float = Field(ge=0.0, le=1.0)
    temporal:      float = Field(ge=0.0, le=1.0)
    integrity:     float = Field(ge=0.0, le=1.0)
    timestamp:     float = Field(ge=0.0, le=1.0)
    communication: float = Field(ge=0.0, le=1.0)
    device_health: float = Field(ge=0.0, le=1.0)
    cross_validation: float = Field(ge=0.0, le=1.0)


class TransmissionDecision(BaseModel):
    action:          TransmissionAction
    priority:        int     = Field(ge=1, le=5)   # 1=highest, 5=lowest
    reason:          str
    retry_suggested: bool    = False
    store_locally:   bool    = False


class ConfidenceReport(BaseModel):
    """Full output of the confidence engine for one telemetry packet."""

    # Echo key fields
    device_id:        str
    parameter:        str
    value:            float
    unit:             Optional[str]
    timestamp:        datetime
    received_at:      datetime

    # Core output
    confidence_score: float = Field(ge=0.0, le=1.0)
    confidence_level: ConfidenceLevel
    quality_flags:    List[QualityFlag]
    components:       ComponentScores

    # Second-layer output
    transmission:     TransmissionDecision

    # Weights used (for auditability)
    weights_used:     Dict[str, float]

    # Explainability notes
    notes:            List[str]
