/**
 * StaffWellbeingPanel — shows workload alerts for staff across the week.
 *
 * Alerts: high daily load, high weekly load, consecutive care assignments,
 * sole handler situations.
 */

import { useState } from 'react';
import { Heart, ChevronDown, ChevronUp, AlertTriangle, Flame, UserX, Repeat } from 'lucide-react';
import type { StaffWellbeingResponse, WellbeingAlertType } from '../../types/weekSchedule';

const ALERT_ICONS: Record<WellbeingAlertType, typeof Flame> = {
  high_daily_load: Flame,
  high_week_load: Flame,
  consecutive_care: Repeat,
  sole_handler: UserX,
};

const ALERT_COLORS: Record<WellbeingAlertType, string> = {
  high_daily_load: 'bg-orange-100 text-orange-700',
  high_week_load: 'bg-red-100 text-red-700',
  consecutive_care: 'bg-amber-100 text-amber-700',
  sole_handler: 'bg-violet-100 text-violet-700',
};

interface StaffWellbeingPanelProps {
  data: StaffWellbeingResponse;
}

export function StaffWellbeingPanel({ data }: StaffWellbeingPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (data.staff_with_alerts === 0) return null;

  const criticalCount = data.staff_alerts.filter((s) => s.has_critical).length;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-surface-50 border-b border-surface-100 flex items-center justify-between hover:bg-surface-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Heart className="h-4.5 w-4.5 text-rose-500" />
          <h3 className="section-heading">Personalvälbefinnande</h3>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
              {data.staff_with_alerts} personal med varningar
            </span>
            {criticalCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                {criticalCount} kritiska
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-surface-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-surface-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="divide-y divide-surface-100">
          {data.staff_alerts.map((item) => (
            <div
              key={item.staff_id}
              className={`px-4 py-3 ${item.has_critical ? 'bg-red-50/30' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-surface-800">
                  {item.staff_name}
                </span>
                {item.has_critical && (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className="text-xs text-surface-400">
                  {item.alert_count} {item.alert_count === 1 ? 'varning' : 'varningar'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.alerts.map((alert, i) => {
                  const Icon = ALERT_ICONS[alert.type];
                  const colors = ALERT_COLORS[alert.type];
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-800 ring-1 ring-red-200'
                          : colors
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {alert.message}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Summary footer */}
          <div className="px-4 py-3 bg-surface-50/50 flex items-center gap-4 text-xs text-surface-500">
            <span className="font-medium">Totalt:</span>
            <span>{data.total_alerts} varningar hos {data.staff_with_alerts} personal</span>
          </div>
        </div>
      )}
    </div>
  );
}
