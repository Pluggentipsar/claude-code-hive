/**
 * SubstituteReport — printable weekly report of substitute staffing needs.
 *
 * Table: Day | Deficit Hours | Absent Staff | Uncovered Needs
 */

import { useState } from 'react';
import { FileText, Printer, ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { SubstituteReportResponse } from '../../types/weekSchedule';

interface SubstituteReportProps {
  data: SubstituteReportResponse;
}

export function SubstituteReport({ data }: SubstituteReportProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-surface-400" />
          <span className="text-sm font-semibold text-surface-700">Vikarierapport</span>
          {data.total_deficit_hours > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning-100 text-warning-700">
              {data.total_deficit_hours}h underskott
            </span>
          )}
          {data.total_absent_staff > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-danger-100 text-danger-700">
              {data.total_absent_staff} frånvarande
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Print button */}
          <div className="flex justify-end">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Skriv ut
            </button>
          </div>

          {/* Report title */}
          <div className="text-sm font-medium text-surface-600">
            Vecka {data.week_number}, {data.week_year}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-surface-500 uppercase">Dag</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-surface-500 uppercase">Underskott (h)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-surface-500 uppercase">Frånvarande</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-surface-500 uppercase">Otäckta behov</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((day) => (
                  <tr key={day.weekday} className="border-b border-surface-100">
                    <td className="py-2 px-3 font-medium text-surface-700">{day.day_name}</td>
                    <td className="py-2 px-3 text-center">
                      {day.deficit_hours > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-danger-100 text-danger-700 text-xs font-medium">
                          {day.deficit_hours}h
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">OK</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {day.absent_staff.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {day.absent_staff.map((s) => (
                            <span key={s.staff_id} className="text-xs px-1.5 py-0.5 rounded bg-surface-100 text-surface-600">
                              {s.staff_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-surface-400">Ingen</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {day.uncovered_needs.length > 0 ? (
                        <div className="space-y-0.5">
                          {day.uncovered_needs.slice(0, 3).map((n, i) => (
                            <div key={i} className="text-xs text-surface-600">
                              {n.description}
                              {n.certification_needed.length > 0 && (
                                <span className="text-danger-600 ml-1">
                                  (kräver: {n.certification_needed.join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                          {day.uncovered_needs.length > 3 && (
                            <div className="text-xs text-surface-400">
                              +{day.uncovered_needs.length - 3} fler...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-surface-400">Inga</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-300">
                  <td className="py-2 px-3 font-semibold text-surface-700">Totalt</td>
                  <td className="py-2 px-3 text-center font-semibold">
                    {data.total_deficit_hours > 0 ? (
                      <span className="text-danger-700">{data.total_deficit_hours}h</span>
                    ) : (
                      <span className="text-emerald-600">0h</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-sm text-surface-500">{data.total_absent_staff} personal</td>
                  <td className="py-2 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
