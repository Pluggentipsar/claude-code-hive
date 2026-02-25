/**
 * Warning bar shown at the bottom of the schedule view.
 * Now includes vulnerability warnings with purple/indigo styling.
 */

import { AlertTriangle, Info, Shield } from 'lucide-react';
import type { ScheduleWarning } from '../../types/weekSchedule';
import type { VulnerabilityItem } from '../../types/weekSchedule';

interface WarningBarProps {
  warnings: ScheduleWarning[];
  vulnerabilities?: VulnerabilityItem[];
}

export function WarningBar({ warnings, vulnerabilities }: WarningBarProps) {
  const hasWarnings = warnings.length > 0;
  const hasVulnerabilities = vulnerabilities && vulnerabilities.length > 0;

  if (!hasWarnings && !hasVulnerabilities) return null;

  const errors = warnings.filter(w => w.severity === 'error');
  const isError = errors.length > 0;

  return (
    <div className="space-y-3">
      {/* Standard warnings */}
      {hasWarnings && (
        <div className={`rounded-2xl p-4 border-l-4 ${
          isError
            ? 'bg-danger-50 border-danger-500'
            : 'bg-warning-50 border-warning-500'
        }`}>
          <div className="flex items-start gap-3">
            {isError ? (
              <AlertTriangle className="h-5 w-5 text-danger-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-warning-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-surface-800">
                {warnings.length} {warnings.length === 1 ? 'varning' : 'varningar'}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {warnings.slice(0, 5).map((w, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg ${
                      w.severity === 'error'
                        ? 'bg-danger-100 text-danger-700'
                        : 'bg-warning-100 text-warning-700'
                    }`}
                  >
                    {w.message}
                  </span>
                ))}
                {warnings.length > 5 && (
                  <span className="text-xs text-surface-500">
                    +{warnings.length - 5} till...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vulnerability warnings */}
      {hasVulnerabilities && (
        <div className="rounded-2xl p-4 border-l-4 bg-indigo-50 border-indigo-500">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-surface-800">
                {vulnerabilities!.length} {vulnerabilities!.length === 1 ? 'sårbarhetsvarning' : 'sårbarhetsvarningar'}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {vulnerabilities!.slice(0, 5).map((v, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg ${
                      v.severity === 'critical'
                        ? 'bg-danger-100 text-danger-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {v.message}
                  </span>
                ))}
                {vulnerabilities!.length > 5 && (
                  <span className="text-xs text-surface-500">
                    +{vulnerabilities!.length - 5} till...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
