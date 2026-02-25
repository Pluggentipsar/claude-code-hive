/**
 * CoverageTimeline — horizontal bar chart showing staffing levels per 30-min slot.
 *
 * Green = surplus, Yellow = balanced, Red = deficit.
 * Spans 06:00–18:00.
 */

import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { CoverageSlot } from '../../types/weekSchedule';

interface CoverageTimelineProps {
  slots: CoverageSlot[];
  onSlotClick?: (slot: CoverageSlot) => void;
  variant?: 'standalone' | 'embedded';
}

const STATUS_COLORS = {
  surplus: { bg: 'bg-emerald-400', hover: 'hover:bg-emerald-500', text: 'text-emerald-700' },
  balanced: { bg: 'bg-warning-400', hover: 'hover:bg-warning-500', text: 'text-warning-700' },
  deficit: { bg: 'bg-danger-400', hover: 'hover:bg-danger-500', text: 'text-danger-700' },
};

export function CoverageTimeline({ slots, onSlotClick, variant = 'standalone' }: CoverageTimelineProps) {
  const [expanded, setExpanded] = useState(variant === 'embedded');
  const [hoveredSlot, setHoveredSlot] = useState<CoverageSlot | null>(null);

  if (!slots || slots.length === 0) return null;

  const deficitCount = slots.filter(s => s.status === 'deficit').length;

  // Time labels: show every 2 hours
  const timeLabels = slots.filter((_s, i) => i % 4 === 0);

  const timelineContent = (
    <div className={variant === 'embedded' ? 'space-y-3' : 'px-4 pb-4 space-y-3'}>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-surface-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-400" /> Överskott
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-warning-400" /> Precis
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-danger-400" /> Underskott
            </span>
          </div>

          {/* Timeline bar chart */}
          <div className="relative">
            {/* Time labels */}
            <div className="flex justify-between text-xs text-surface-400 mb-1">
              {timeLabels.map((s) => (
                <span key={s.time_start}>{s.time_start}</span>
              ))}
              <span>18:00</span>
            </div>

            {/* Bars */}
            <div className="flex gap-0.5 h-10">
              {slots.map((slot) => {
                const colors = STATUS_COLORS[slot.status];
                return (
                  <div
                    key={slot.time_start}
                    className={`flex-1 rounded-sm ${colors.bg} ${colors.hover} cursor-pointer transition-colors relative`}
                    onMouseEnter={() => setHoveredSlot(slot)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    onClick={() => onSlotClick?.(slot)}
                  />
                );
              })}
            </div>

            {/* Hover tooltip */}
            {hoveredSlot && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50
                bg-surface-800 text-white text-xs px-3 py-2 rounded-lg shadow-elevated whitespace-nowrap">
                <div className="font-semibold">{hoveredSlot.time_start}–{hoveredSlot.time_end}</div>
                <div>Elever: {hoveredSlot.students_present} | Personal: {hoveredSlot.staff_present}</div>
                <div className={STATUS_COLORS[hoveredSlot.status].text}>
                  {hoveredSlot.surplus > 0
                    ? `+${hoveredSlot.surplus} överskott`
                    : hoveredSlot.surplus < 0
                      ? `${hoveredSlot.surplus} underskott`
                      : 'Balanserat'}
                </div>
              </div>
            )}
          </div>

          {/* Detailed table (optional) */}
          {deficitCount > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-surface-500 mb-1">Tidsluckor med underskott:</div>
              <div className="flex flex-wrap gap-1.5">
                {slots.filter(s => s.status === 'deficit').map((slot) => (
                  <button
                    key={slot.time_start}
                    onClick={() => onSlotClick?.(slot)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                      bg-danger-50 text-danger-700 border border-danger-200
                      hover:bg-danger-100 transition-colors"
                  >
                    {slot.time_start}–{slot.time_end}
                    <span className="font-medium">{slot.surplus}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
    </div>
  );

  if (variant === 'embedded') {
    return (
      <div>
        <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-surface-400" />
          Bemanningsöversikt
          {deficitCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-danger-100 text-danger-700 normal-case tracking-normal">
              {deficitCount} underskott
            </span>
          )}
        </h4>
        {timelineContent}
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-surface-400" />
          <span className="text-sm font-semibold text-surface-700">Bemanningsöversikt</span>
          {deficitCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-danger-100 text-danger-700">
              {deficitCount} tidsluckor med underskott
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
      </button>

      {expanded && timelineContent}
    </div>
  );
}
