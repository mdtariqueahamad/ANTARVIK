import React, { useState } from 'react';
import { ProvenanceType } from '../../types';
import { PROVENANCE_COLORS, PROVENANCE_LABELS } from '../../utils/constants';

interface ProvenanceTooltipProps {
  provenance: ProvenanceType;
  children: React.ReactNode;
  className?: string;
}

export default function ProvenanceTooltip({
  provenance,
  children,
  className = '',
}: ProvenanceTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center cursor-help ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span
        className="ml-1 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: PROVENANCE_COLORS[provenance] }}
      />
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg border border-antarctic-border bg-antarctic-navy-light">
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PROVENANCE_COLORS[provenance] }}
            />
            {PROVENANCE_LABELS[provenance]}
          </span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-antarctic-border" />
        </span>
      )}
    </span>
  );
}
