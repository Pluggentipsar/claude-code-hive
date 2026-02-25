/**
 * StaffShiftTable — shows staff working shifts for a day.
 */

import { useState } from 'react';
import type { StaffShift, StaffShiftUpdate } from '../../types/weekSchedule';

interface StaffShiftTableProps {
  shifts: StaffShift[];
  onUpdateShift: (shiftId: string, data: StaffShiftUpdate) => void;
  onStaffAbsence?: (staffId: string, staffName: string) => void;
  absentStaffIds?: Set<string>;
}

export function StaffShiftTable({ shifts, onUpdateShift, onStaffAbsence, absentStaffIds }: StaffShiftTableProps) {
  if (shifts.length === 0) {
    return (
      <div className="card p-4 text-surface-400 text-sm">
        Inga arbetspass denna dag.
      </div>
    );
  }

  const sorted = [...shifts].sort((a, b) => {
    const timeCompare = (a.start_time || '').localeCompare(b.start_time || '');
    if (timeCompare !== 0) return timeCompare;
    return (a.staff_name || '').localeCompare(b.staff_name || '', 'sv');
  });

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-surface-100">
        <thead className="bg-surface-50">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-surface-500 uppercase w-44">Personal</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-surface-500 uppercase w-20">Start</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-surface-500 uppercase w-20">Slut</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-surface-500 uppercase w-16">Rast</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-surface-500 uppercase">Anteckningar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {sorted.map((shift) => (
            <ShiftRow
              key={shift.id}
              shift={shift}
              onUpdate={onUpdateShift}
              onStaffAbsence={onStaffAbsence}
              isAbsent={absentStaffIds?.has(shift.staff_id) ?? false}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShiftRow({
  shift,
  onUpdate,
  onStaffAbsence,
  isAbsent,
}: {
  shift: StaffShift;
  onUpdate: (shiftId: string, data: StaffShiftUpdate) => void;
  onStaffAbsence?: (staffId: string, staffName: string) => void;
  isAbsent: boolean;
}) {
  const [notes, setNotes] = useState(shift.notes || '');

  const handleNotesBlur = () => {
    if (notes !== (shift.notes || '')) {
      onUpdate(shift.id, { notes });
    }
  };

  return (
    <tr className={`transition-colors ${isAbsent ? 'bg-danger-50/40' : 'hover:bg-surface-50/50'}`}>
      <td className="px-3 py-2.5 text-sm font-medium">
        <div className="flex items-center gap-2">
          {onStaffAbsence ? (
            <button
              type="button"
              onClick={() => onStaffAbsence(shift.staff_id, shift.staff_name || '')}
              className={`underline decoration-dotted transition-colors cursor-pointer text-left ${
                isAbsent
                  ? 'line-through text-danger-600 decoration-danger-300'
                  : 'text-surface-900 decoration-surface-300 hover:text-danger-600 hover:decoration-danger-400'
              }`}
              title={isAbsent ? `${shift.staff_name} — frånvarande` : 'Klicka för att anmäla frånvaro'}
            >
              {shift.staff_name}
            </button>
          ) : (
            <span className={isAbsent ? 'line-through text-danger-600' : 'text-surface-900'}>
              {shift.staff_name}
            </span>
          )}
          {isAbsent && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-danger-100 text-danger-700">
              Frånvarande
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-center">
        <input
          type="time"
          value={shift.start_time}
          onChange={(e) => onUpdate(shift.id, { start_time: e.target.value })}
          className={`text-sm border-0 bg-transparent text-center w-20 tabular-nums focus:ring-1 focus:ring-primary-300 rounded-lg ${isAbsent ? 'opacity-40' : ''}`}
        />
      </td>
      <td className="px-3 py-2.5 text-center">
        <input
          type="time"
          value={shift.end_time}
          onChange={(e) => onUpdate(shift.id, { end_time: e.target.value })}
          className={`text-sm border-0 bg-transparent text-center w-20 tabular-nums focus:ring-1 focus:ring-primary-300 rounded-lg ${isAbsent ? 'opacity-40' : ''}`}
        />
      </td>
      <td className="px-3 py-2.5 text-center">
        <input
          type="number"
          value={shift.break_minutes}
          onChange={(e) => onUpdate(shift.id, { break_minutes: parseInt(e.target.value) || 0 })}
          className={`text-sm border-0 bg-transparent text-center w-14 tabular-nums focus:ring-1 focus:ring-primary-300 rounded-lg ${isAbsent ? 'opacity-40' : ''}`}
          min={0}
          max={120}
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Facklig tid, planering, etc."
          className={`text-sm border-0 bg-transparent w-full focus:ring-1 focus:ring-primary-300 rounded-lg text-surface-600 placeholder-surface-300 ${isAbsent ? 'opacity-40' : ''}`}
        />
      </td>
    </tr>
  );
}
