/**
 * Dropdown for picking a staff member from available staff.
 * Groups by: preferred → same grade group → others.
 * Shows shift times, absence status, and certification match.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import type { Staff } from '../../types';

interface StaffPickerProps {
  value: string | null;
  displayName: string | null;
  staffList: Staff[];
  onChange: (staffId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  studentGrade?: number | null;
  preferredStaffIds?: string[];
  careRequirements?: string[];
  staffShiftMap?: Map<string, { start: string; end: string }>;
  absentStaffIds?: Set<string>;
}

interface StaffRow {
  staff: Staff;
  isPreferred: boolean;
  isAbsent: boolean;
  hasCertMatch: boolean;
  shift: { start: string; end: string } | null;
}

export function StaffPicker({
  value,
  displayName,
  staffList,
  onChange,
  disabled = false,
  placeholder = '\u2014',
  studentGrade,
  preferredStaffIds,
  careRequirements,
  staffShiftMap,
  absentStaffIds,
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

  const preferredSet = useMemo(
    () => new Set(preferredStaffIds ?? []),
    [preferredStaffIds]
  );

  const careReqs = useMemo(
    () => new Set(careRequirements ?? []),
    [careRequirements]
  );

  const hasCareReqs = careReqs.size > 0;
  const hasPreferred = preferredSet.size > 0;

  // Build enriched rows and sort into groups
  const { preferred, gradeMatch, others } = useMemo(() => {
    const studentGradeGroup = studentGrade && studentGrade <= 3 ? 'grades_1_3' : studentGrade ? 'grades_4_6' : null;

    const pref: StaffRow[] = [];
    const grade: StaffRow[] = [];
    const oth: StaffRow[] = [];

    for (const s of staffList) {
      const row: StaffRow = {
        staff: s,
        isPreferred: preferredSet.has(s.id),
        isAbsent: absentStaffIds?.has(s.id) ?? false,
        hasCertMatch: hasCareReqs && s.care_certifications.some(c => careReqs.has(c)),
        shift: staffShiftMap?.get(s.id) ?? null,
      };

      if (row.isPreferred) {
        pref.push(row);
      } else if (studentGradeGroup && (!s.grade_group || s.grade_group === studentGradeGroup)) {
        grade.push(row);
      } else if (!studentGradeGroup) {
        grade.push(row);
      } else {
        oth.push(row);
      }
    }

    // Sort within each group: cert match first → working today → absent last → alphabetical
    const sortRows = (rows: StaffRow[]) =>
      rows.sort((a, b) => {
        // Absent staff always last
        if (a.isAbsent !== b.isAbsent) return a.isAbsent ? 1 : -1;
        // Cert match first
        if (a.hasCertMatch !== b.hasCertMatch) return a.hasCertMatch ? -1 : 1;
        // Working today before those not working
        const aWorking = a.shift != null;
        const bWorking = b.shift != null;
        if (aWorking !== bWorking) return aWorking ? -1 : 1;
        // Alphabetical
        return `${a.staff.first_name} ${a.staff.last_name}`.localeCompare(
          `${b.staff.first_name} ${b.staff.last_name}`, 'sv'
        );
      });

    return {
      preferred: sortRows(pref),
      gradeMatch: sortRows(grade),
      others: sortRows(oth),
    };
  }, [staffList, studentGrade, preferredSet, absentStaffIds, staffShiftMap, careReqs, hasCareReqs]);

  const hasMultipleGroups = (hasPreferred ? 1 : 0) + (gradeMatch.length > 0 ? 1 : 0) + (others.length > 0 ? 1 : 0) > 1;

  const renderStaffRow = (row: StaffRow) => (
    <button
      key={row.staff.id}
      type="button"
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
        row.isAbsent
          ? 'opacity-40 hover:opacity-60'
          : value === row.staff.id
            ? 'bg-primary-50 text-primary-700 font-medium'
            : row.isPreferred
              ? 'hover:bg-amber-50'
              : 'hover:bg-primary-50'
      } ${value === row.staff.id ? '' : 'text-surface-700'}`}
      onClick={() => { onChange(row.staff.id); setOpen(false); }}
    >
      {/* Name with preferred star */}
      <span className="flex items-center gap-1 min-w-0 flex-1">
        {row.isPreferred && <Star className="h-3 w-3 text-amber-500 fill-amber-400 flex-shrink-0" />}
        <span className="truncate">
          {row.staff.first_name} {row.staff.last_name}
        </span>
        {row.hasCertMatch && (
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Matchande certifiering" />
        )}
      </span>

      {/* Shift time or absent marker */}
      <span className="flex-shrink-0 text-xs tabular-nums text-surface-400">
        {row.isAbsent
          ? '(frånv.)'
          : row.shift
            ? `${row.shift.start.slice(0, 5)}\u2013${row.shift.end.slice(0, 5)}`
            : ''}
      </span>

      {value === row.staff.id && <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />}
    </button>
  );

  const groupHeader = (label: string) => (
    <div className="px-3 py-1.5 text-xs font-semibold text-surface-400 uppercase bg-surface-50 border-t border-surface-100">
      {label}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`
          w-full text-left text-sm px-2.5 py-1 rounded-lg border transition-colors duration-150
          ${value ? 'border-primary-200 bg-primary-50 text-primary-800' : 'border-surface-200 bg-surface-50 text-surface-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-300 cursor-pointer'}
        `}
      >
        {label}
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-64 bg-white border border-surface-200 rounded-xl shadow-elevated max-h-72 overflow-y-auto"
          >
            {/* Clear selection */}
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-surface-400 hover:bg-surface-50 transition-colors"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              {'\u2014'} Ingen
            </button>

            {/* Preferred staff */}
            {preferred.length > 0 && (
              <>
                {hasMultipleGroups && groupHeader('\u2605 Föredragen personal')}
                {preferred.map(renderStaffRow)}
              </>
            )}

            {/* Grade-matching staff */}
            {gradeMatch.length > 0 && (
              <>
                {hasMultipleGroups && groupHeader(
                  studentGrade && studentGrade <= 3 ? 'Lågstadium' : studentGrade ? 'Mellanstadium' : 'Personal'
                )}
                {gradeMatch.map(renderStaffRow)}
              </>
            )}

            {/* Others */}
            {others.length > 0 && (
              <>
                {hasMultipleGroups && groupHeader(
                  studentGrade && studentGrade <= 3 ? 'Mellanstadium' : 'Lågstadium'
                )}
                {others.map(renderStaffRow)}
              </>
            )}

            {staffList.length === 0 && (
              <div className="px-3 py-2 text-sm text-surface-400">Ingen personal tillgänglig</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
