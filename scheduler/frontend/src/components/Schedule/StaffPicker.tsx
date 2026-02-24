/**
 * Dropdown for picking a staff member from available staff.
 *
 * When `studentGrade` is provided, staff are split into
 * "Rekommenderade" (same grade group) and "Övriga" (different grade group)
 * based on each staff member's `grade_group` field.
 * All staff remain selectable — the grouping is advisory.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Staff } from '../../types';

interface StaffPickerProps {
  value: string | null;
  displayName: string | null;
  staffList: Staff[];
  onChange: (staffId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  /** The student's grade (1-6) — used to determine recommended staff */
  studentGrade?: number | null;
}

export function StaffPicker({
  value,
  displayName,
  staffList,
  onChange,
  disabled = false,
  placeholder = '\u2014',
  studentGrade,
}: StaffPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const label = displayName || placeholder;

  // Split staff into recommended + others based on grade_group
  const { recommended, others } = useMemo(() => {
    if (!studentGrade) {
      return { recommended: staffList, others: [] as Staff[] };
    }

    const studentGradeGroup = studentGrade <= 3 ? 'grades_1_3' : 'grades_4_6';
    const rec: Staff[] = [];
    const oth: Staff[] = [];

    for (const s of staffList) {
      if (!s.grade_group || s.grade_group === studentGradeGroup) {
        rec.push(s);
      } else {
        oth.push(s);
      }
    }

    return { recommended: rec, others: oth };
  }, [staffList, studentGrade]);

  const hasGroups = others.length > 0;

  const renderStaffButton = (s: Staff) => (
    <button
      key={s.id}
      type="button"
      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
        value === s.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
      }`}
      onClick={() => { onChange(s.id); setOpen(false); }}
    >
      {s.first_name} {s.last_name}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`
          w-full text-left text-sm px-2 py-1 rounded border
          ${value ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 bg-gray-50 text-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'}
        `}
      >
        {label}
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Clear option */}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            {'\u2014'} Ingen
          </button>

          {/* Recommended staff (same grade group) */}
          {hasGroups && recommended.length > 0 && (
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase bg-gray-50 border-t border-gray-100">
              {studentGrade && studentGrade <= 3 ? 'Lågstadium' : 'Mellanstadium'}
            </div>
          )}
          {recommended.map(renderStaffButton)}

          {/* Other staff (different grade group) */}
          {hasGroups && others.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase bg-gray-50 border-t border-gray-100">
                {studentGrade && studentGrade <= 3 ? 'Mellanstadium' : 'Lågstadium'}
              </div>
              {others.map(renderStaffButton)}
            </>
          )}

          {staffList.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">Ingen personal tillgänglig</div>
          )}
        </div>
      )}
    </div>
  );
}
