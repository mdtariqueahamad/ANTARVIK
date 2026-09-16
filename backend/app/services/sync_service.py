"""Operating mode manager: Connected / Degraded / Recovery.

Manages the station's connectivity mode:
  - Connected: Normal real-time operation, all data current
  - Degraded: Shadow mode with stale timestamps, limited bandwidth
  - Recovery: Sync buffered data back to central, reconcile state
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional


class OperatingMode(str, Enum):
    CONNECTED = "connected"
    DEGRADED = "degraded"
    RECOVERY = "recovery"


@dataclass
class BufferedItem:
    """A data item buffered during degraded mode."""
    item_type: str  # telemetry | alert | inventory_update
    payload: dict
    buffered_at: datetime
    synced: bool = False


@dataclass
class SyncStatus:
    """Current sync status of a station."""
    station_id: str
    mode: OperatingMode = OperatingMode.CONNECTED
    last_connected: Optional[datetime] = None
    last_sync: Optional[datetime] = None
    buffered_items_count: int = 0
    synced_items_count: int = 0
    stale_since: Optional[datetime] = None
    bandwidth_kbps: Optional[float] = None
    satellite_link_quality: float = 1.0  # 0.0 to 1.0


class SyncService:
    """Manages station operating modes and data sync."""

    def __init__(self) -> None:
        self._stations: Dict[str, SyncStatus] = {}
        self._buffers: Dict[str, List[BufferedItem]] = {}

    def register_station(self, station_id: str) -> SyncStatus:
        """Register a station for sync tracking."""
        status = SyncStatus(
            station_id=station_id,
            mode=OperatingMode.CONNECTED,
            last_connected=datetime.now(timezone.utc),
            last_sync=datetime.now(timezone.utc),
        )
        self._stations[station_id] = status
        self._buffers[station_id] = []
        return status

    def get_status(self, station_id: str) -> Optional[SyncStatus]:
        """Get current sync status."""
        return self._stations.get(station_id)

    def get_all_statuses(self) -> Dict[str, SyncStatus]:
        return dict(self._stations)

    def set_mode(self, station_id: str, mode: OperatingMode) -> SyncStatus:
        """Set operating mode for a station."""
        status = self._stations.get(station_id)
        if not status:
            status = self.register_station(station_id)

        now = datetime.now(timezone.utc)
        old_mode = status.mode
        status.mode = mode

        if mode == OperatingMode.CONNECTED:
            status.last_connected = now
            status.stale_since = None
            status.bandwidth_kbps = None
        elif mode == OperatingMode.DEGRADED:
            status.stale_since = now
            status.bandwidth_kbps = 9.6  # typical Iridium
        elif mode == OperatingMode.RECOVERY:
            # Start recovery: prepare to flush buffer
            pass

        return status

    def buffer_item(
        self,
        station_id: str,
        item_type: str,
        payload: dict,
    ) -> int:
        """Buffer a data item during degraded mode. Returns buffer size."""
        if station_id not in self._buffers:
            self._buffers[station_id] = []

        self._buffers[station_id].append(BufferedItem(
            item_type=item_type,
            payload=payload,
            buffered_at=datetime.now(timezone.utc),
        ))

        status = self._stations.get(station_id)
        if status:
            status.buffered_items_count = len(self._buffers[station_id])

        return len(self._buffers[station_id])

    def flush_buffer(self, station_id: str) -> List[BufferedItem]:
        """Flush buffered items for sync during recovery."""
        items = self._buffers.get(station_id, [])
        unsynced = [i for i in items if not i.synced]

        # Mark as synced
        for item in unsynced:
            item.synced = True

        status = self._stations.get(station_id)
        if status:
            status.synced_items_count += len(unsynced)
            status.last_sync = datetime.now(timezone.utc)
            if all(i.synced for i in items):
                status.buffered_items_count = 0
                # Auto-transition to connected after full sync
                status.mode = OperatingMode.CONNECTED
                status.last_connected = datetime.now(timezone.utc)
                status.stale_since = None

        return unsynced

    def get_mode_info(self, station_id: str) -> dict:
        """Get detailed mode information."""
        status = self._stations.get(station_id)
        if not status:
            return {"mode": "unknown", "station_id": station_id}

        return {
            "station_id": station_id,
            "mode": status.mode.value,
            "last_connected": status.last_connected.isoformat() if status.last_connected else None,
            "last_sync": status.last_sync.isoformat() if status.last_sync else None,
            "buffered_items": status.buffered_items_count,
            "synced_items": status.synced_items_count,
            "stale_since": status.stale_since.isoformat() if status.stale_since else None,
            "bandwidth_kbps": status.bandwidth_kbps,
            "satellite_link_quality": status.satellite_link_quality,
        }


# Global singleton
sync_service = SyncService()
