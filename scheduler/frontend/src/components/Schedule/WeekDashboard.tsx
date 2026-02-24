/**
 * WeekDashboard — collapsible summary panel showing per-day stats for the week.
 * Unassigned slots, warnings, staff count per day.
 */

import { useState } from 'react';
import type { WeekSummaryData } from '../../hooks/useWeekSummary';

const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'];

interface WeekDashboardProps {
  summary: WeekSummaryData;
  selectedWeekday: number;
  onSelectDay: (weekday: number) => void;
}

export function WeekDashboard({ summary, selectedWeekday, onSelectDay }: WeekDashboardProps) {
  const [expanded, setExpanded] = useState(false);

  if (summary.isLoading) return null;

  const hasIssues = summary.totalUnassigned > 0 || summary.totalWarnings > 0;

  return (
    <div className="bg-white rounded-lg shadow no-print">
      {/* Compact header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">Veckosummering</span>
          {hasIssues && (
            <div className="flex items-center gap-3 text-xs">
              {summary.totalUnassigned > 0 && (
                <span className="text-amber-600 font-medium">
                  {summary.totalUnassigned} obemannade pass
                </span>
              )}
              {summary.totalWarnings > 0 && (
                <span className="text-red-600 font-medium">
                  {summary.totalWarnings} varningar
                </span>
              )}
            </div>
          )}
          {!hasIssues && (
            <span className="text-xs text-green-600 font-medium">Allt ser bra ut</span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {/* Expanded grid */}
      {expanded && (
        <div className="px-4 pb-3 pt-1">
          <div className="grid grid-cols-5 gap-2">
            {summary.days.map((day, idx) => {
              const unassigned = day.unassignedFm + day.unassignedEm;
              const isSelected = idx === selectedWeekday;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectDay(idx)}
                  className={`rounded-lg p-3 text-left transition-colors border ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-800 mb-1">{DAY_LABELS[idx]}</div>
                  <div className="space-y-0.5 text-xs">
                    <div className="text-gray-500">{day.students} elever</div>
                    <div className="text-gray-500">{day.staffCount} personal</div>
                    {unassigned > 0 ? (
                      <div className="text-amber-600 font-medium">{unassigned} obemannade</div>
                    ) : (
                      <div className="text-green-600">Fullt bemannat</div>
                    )}
                    {day.warnings > 0 && (
                      <div className="text-red-600 font-medium">{day.warnings} varningar</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
