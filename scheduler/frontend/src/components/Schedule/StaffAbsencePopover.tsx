/**
 * StaffAbsencePopover — inline popover for quick staff absence registration.
 * Appears when clicking a staff name in StaffShiftTable.
 */

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../../api/staff';
import type { AbsenceReason } from '../../types';

interface StaffAbsencePopoverProps {
  staffId: string;
  staffName: string;
  absenceDate: string; // YYYY-MM-DD
}

const REASONS: { value: AbsenceReason; label: string }[] = [
  { value: 'sick', label: 'Sjuk — heldag' },
  { value: 'vacation', label: 'Semester' },
  { value: 'training', label: 'Utbildning' },
  { value: 'other', label: '\u00d6vrigt' },
];

function getDateForWeekday(year: number, week: number, weekday: number): string {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  const target = new Date(monday);
  target.setDate(monday.getDate() + weekday);
  return target.toISOString().split('T')[0];
}

export function StaffAbsencePopover({ staffId, staffName, absenceDate }: StaffAbsencePopoverProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = async (reason: AbsenceReason) => {
    setSaving(true);
    try {
      await staffApi.createAbsence(staffId, {
        absence_date: absenceDate,
        reason,
      });
      qc.invalidateQueries({ queryKey: ['dayData'] });
      qc.invalidateQueries({ queryKey: ['warnings'] });
      qc.invalidateQueries({ queryKey: ['weekSummary'] });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); }, 800);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Kunde inte registrera.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="underline decoration-dotted hover:text-red-600 transition-colors cursor-pointer text-left"
        title="Klicka f\u00f6r snabbfr\u00e5nvaro"
      >
        {staffName}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">Anm\u00e4l fr\u00e5nvaro</p>
            <p className="text-xs text-gray-400">{absenceDate}</p>
          </div>
          {done ? (
            <div className="px-3 py-3 text-sm text-green-700 font-medium text-center">
              Registrerad!
            </div>
          ) : (
            REASONS.map(r => (
              <button
                key={r.value}
                type="button"
                disabled={saving}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
                onClick={() => handleSelect(r.value)}
              >
                {r.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export { getDateForWeekday };
