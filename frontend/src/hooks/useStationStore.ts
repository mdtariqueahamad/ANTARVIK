import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StationId, OperatingMode, SyncStatus } from '../types';

interface StationStore {
  selectedStation: StationId;
  operatingMode: OperatingMode;
  lastSync: string | null;
  syncProgress: number | null;
  sidebarCollapsed: boolean;
  faultInjectionOpen: boolean;

  setStation: (station: StationId) => void;
  setMode: (mode: OperatingMode) => void;
  setSyncStatus: (status: SyncStatus) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleFaultInjection: () => void;
}

export const useStationStore = create<StationStore>()(
  persist(
    (set) => ({
      selectedStation: 'maitri',
      operatingMode: 'connected',
      lastSync: null,
      syncProgress: null,
      sidebarCollapsed: true,
      faultInjectionOpen: false,

      setStation: (station) => set({ selectedStation: station }),
      setMode: (mode) => set({ operatingMode: mode }),
      setSyncStatus: (status) =>
        set({
          operatingMode: status.mode,
          lastSync: status.last_sync,
          syncProgress: status.sync_progress ?? null,
        }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleFaultInjection: () => set((s) => ({ faultInjectionOpen: !s.faultInjectionOpen })),
    }),
    {
      name: 'antarvik-station',
      partialize: (state) => ({
        selectedStation: state.selectedStation,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
