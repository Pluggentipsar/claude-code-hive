/**
 * Warning bar shown at the bottom of the schedule view.
 */

import type { ScheduleWarning } from '../../types/weekSchedule';

interface WarningBarProps {
  warnings: ScheduleWarning[];
}

export function WarningBar({ warnings }: WarningBarProps) {
  if (warnings.length === 0) return null;

  const errors = warnings.filter(w => w.severity === 'error');

  return (
    <div className={`rounded-lg p-3 ${errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">
          {errors.length > 0 ? '\u26A0' : '\u2139'}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800">
            {warnings.length} {warnings.length === 1 ? 'varning' : 'varningar'}
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            {warnings.slice(0, 5).map((w, i) => (
              <span
                key={i}
                className={`inline-flex items-center text-xs px-2 py-1 rounded ${
                  w.severity === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {w.message}
              </span>
            ))}
            {warnings.length > 5 && (
              <span className="text-xs text-gray-500">
                +{warnings.length - 5} till...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
