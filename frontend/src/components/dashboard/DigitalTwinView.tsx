import React, { useEffect, useRef } from 'react';
import { useStationStore } from '../../hooks/useStationStore';
import { subscribeAwsData } from './StationOverview';

// ─── DigitalTwinView ──────────────────────────────────────────────────────────
export default function DigitalTwinView() {
  const { selectedStation } = useStationStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const latestDataRef = useRef<any>(null);

  useEffect(() => {
    // Subscribe to the shared module-level AWS stream.
    // This ensures DigitalTwinView is perfectly in sync with StationOverview.
    const unsub = subscribeAwsData(selectedStation, (row) => {
      latestDataRef.current = row;
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'ANTARVIK_AWS',
          payload: {
            temp:     row.t,
            ws:       row.ws,
            wd:       row.wd,
            pressure: row.ap,
            rh:       row.rh,
          },
        },
        '*'
      );
    });

    const iframe = iframeRef.current;
    const onLoad = () => {
      // Push the latest immediately when the iframe finishes loading
      if (latestDataRef.current) {
        iframe?.contentWindow?.postMessage({
          type: 'ANTARVIK_AWS',
          payload: {
            temp:     latestDataRef.current.t,
            ws:       latestDataRef.current.ws,
            wd:       latestDataRef.current.wd,
            pressure: latestDataRef.current.ap,
            rh:       latestDataRef.current.rh,
          },
        }, '*');
      }
    };
    iframe?.addEventListener('load', onLoad);

    return () => {
      unsub();
      iframe?.removeEventListener('load', onLoad);
    };
  }, [selectedStation]);

  const modelSrc = selectedStation === 'maitri' ? '/maitri_model/index.html' : '/bharati_model.html';

  return (
    <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {selectedStation === 'maitri' ? 'Maitri Station' : 'Bharati Station'} — 3D Digital Twin
          </h2>
          <p className="text-blue-300 text-sm font-medium mt-1">
            Interactive spatial model • Live AWS data injected from dashboard stream
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-white/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {selectedStation === 'maitri' ? '69.77°S · 11.73°E · Elev 117m' : '69.41°S · 76.18°E · Elev 35m'}
        </div>
      </div>

      {/* Iframe — fills remaining height */}
      <div className="flex-1 w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        <iframe
          key={selectedStation}           // remount on station switch
          ref={iframeRef}
          src={modelSrc}
          title={`${selectedStation} 3D Model`}
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
