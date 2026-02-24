/**
 * StaffSummary — shows how many students each staff member is assigned to (FM/EM).
 * Highlights overloaded staff (more than threshold).
 */

import { useMemo } from 'react';
import type { StudentDay } from '../../types/weekSchedule';

interface StaffSummaryProps {
  studentDays: StudentDay[];
}

interface StaffCount {
  id: string;
  name: string;
  fm: number;
  em: number;
}

const OVERLOAD_THRESHOLD = 8;

export function StaffSummary({ studentDays }: StaffSummaryProps) {
  const staffCounts = useMemo(() => {
    const map = new Map<string, StaffCount>();

    for (const sd of studentDays) {
      if (sd.fm_staff_id && sd.fm_staff_name) {
        if (!map.has(sd.fm_staff_id)) {
          map.set(sd.fm_staff_id, { id: sd.fm_staff_id, name: sd.fm_staff_name, fm: 0, em: 0 });
        }
        map.get(sd.fm_staff_id)!.fm++;
      }
      if (sd.em_staff_id && sd.em_staff_name) {
        if (!map.has(sd.em_staff_id)) {
          map.set(sd.em_staff_id, { id: sd.em_staff_id, name: sd.em_staff_name, fm: 0, em: 0 });
        }
        map.get(sd.em_staff_id)!.em++;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }, [studentDays]);

  if (staffCounts.length === 0) return null;

  const overloaded = staffCounts.filter(s => s.fm > OVERLOAD_THRESHOLD || s.em > OVERLOAD_THRESHOLD);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Personalbelastning
        </h3>
        {overloaded.length > 0 && (
          <span className="text-xs text-amber-600 font-medium">
            {overloaded.length} med hög belastning
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
        {staffCounts.map((s) => {
          const isOverloaded = s.fm > OVERLOAD_THRESHOLD || s.em > OVERLOAD_THRESHOLD;
          return (
            <div
              key={s.id}
              className={`flex items-center gap-2 text-sm ${isOverloaded ? 'text-amber-700' : 'text-gray-700'}`}
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-gray-400">|</span>
              <span>
                FM <span className={`font-semibold ${s.fm > OVERLOAD_THRESHOLD ? 'text-amber-600' : 'text-blue-600'}`}>{s.fm}</span>
              </span>
              <span>
                EM <span className={`font-semibold ${s.em > OVERLOAD_THRESHOLD ? 'text-amber-600' : 'text-blue-600'}`}>{s.em}</span>
              </span>
              {isOverloaded && <span className="text-amber-500" title="Hög belastning">&#9888;</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
