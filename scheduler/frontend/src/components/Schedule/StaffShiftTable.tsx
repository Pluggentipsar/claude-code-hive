/**
 * StaffShiftTable — shows staff working shifts for a day.
 */

import { useState } from 'react';
import { StaffAbsencePopover } from './StaffAbsencePopover';
import type { StaffShift, StaffShiftUpdate } from '../../types/weekSchedule';

interface StaffShiftTableProps {
  shifts: StaffShift[];
  onUpdateShift: (shiftId: string, data: StaffShiftUpdate) => void;
  /** YYYY-MM-DD date for the current day (used for absence registration) */
  absenceDate?: string;
}

export function StaffShiftTable({ shifts, onUpdateShift, absenceDate }: StaffShiftTableProps) {
  if (shifts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-gray-400 text-sm">
        Inga arbetspass denna dag.
      </div>
    );
  }

  // Sort by start time, then by name
  const sorted = [...shifts].sort((a, b) => {
    const timeCompare = (a.start_time || '').localeCompare(b.start_time || '');
    if (timeCompare !== 0) return timeCompare;
    return (a.staff_name || '').localeCompare(b.staff_name || '', 'sv');
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-44">Personal</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Start</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Slut</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Rast</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Anteckningar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((shift) => (
            <ShiftRow key={shift.id} shift={shift} onUpdate={onUpdateShift} absenceDate={absenceDate} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShiftRow({
  shift,
  onUpdate,
  absenceDate,
}: {
  shift: StaffShift;
  onUpdate: (shiftId: string, data: StaffShiftUpdate) => void;
  absenceDate?: string;
}) {
  const [notes, setNotes] = useState(shift.notes || '');

  const handleNotesBlur = () => {
    if (notes !== (shift.notes || '')) {
      onUpdate(shift.id, { notes });
    }
  };

  return (
    <tr>
      <td className="px-3 py-2 text-sm font-medium text-gray-900">
        {absenceDate ? (
          <StaffAbsencePopover
            staffId={shift.staff_id}
            staffName={shift.staff_name || ''}
            absenceDate={absenceDate}
          />
        ) : (
          shift.staff_name
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="time"
          value={shift.start_time}
          onChange={(e) => onUpdate(shift.id, { start_time: e.target.value })}
          className="text-sm border-0 bg-transparent text-center w-20 focus:ring-1 focus:ring-blue-300 rounded"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="time"
          value={shift.end_time}
          onChange={(e) => onUpdate(shift.id, { end_time: e.target.value })}
          className="text-sm border-0 bg-transparent text-center w-20 focus:ring-1 focus:ring-blue-300 rounded"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="number"
          value={shift.break_minutes}
          onChange={(e) => onUpdate(shift.id, { break_minutes: parseInt(e.target.value) || 0 })}
          className="text-sm border-0 bg-transparent text-center w-14 focus:ring-1 focus:ring-blue-300 rounded"
          min={0}
          max={120}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Facklig tid, planering, etc."
          className="text-sm border-0 bg-transparent w-full focus:ring-1 focus:ring-blue-300 rounded text-gray-600 placeholder-gray-300"
        />
      </td>
    </tr>
  );
}
