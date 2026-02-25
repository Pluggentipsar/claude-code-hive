/**
 * DayGrid — the main student table for a single day.
 *
 * Single unified table with colored class-group headers,
 * FM/EM assignment dots, and visual polish.
 */

import { useCallback, useMemo, useState } from 'react';
import { Star, AlertCircle, CalendarX2, User } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { StaffPicker } from './StaffPicker';
import { AbsencePopover } from './AbsencePopover';
import { ContextMenu } from '../Common/ContextMenu';
import type { StudentDay, DayAssignment, ScheduleWarning, AbsentType } from '../../types/weekSchedule';
import type { Staff, Student } from '../../types';

export type ContextMenuAction = 'special_needs' | 'absence' | 'info';

interface DayGridProps {
  studentDays: StudentDay[];
  dayAssignments: DayAssignment[];
  warnings: ScheduleWarning[];
  staffList: Staff[];
  onUpdateStudentDay: (sdId: string, field: 'fm_staff_id' | 'em_staff_id', value: string | null) => void;
  onUpdateTime: (sdId: string, field: 'arrival_time' | 'departure_time', value: string) => void;
  onSetAbsentType?: (sdId: string, absentType: AbsentType) => void;
  absentStaffIds?: Set<string>;
  onStaffAbsence?: (staffId: string, staffName: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (sdId: string) => void;
  onToggleSelectAll?: () => void;
  onAddAssignment?: (weekday: number) => void;
  onEditAssignment?: (da: DayAssignment) => void;
  onDeleteAssignment?: (daId: string) => void;
  studentMap?: Map<string, Student>;
  staffShiftMap?: Map<string, { start: string; end: string }>;
  onStudentContextMenu?: (studentDay: StudentDay, action: ContextMenuAction) => void;
}

interface ClassGroup {
  className: string;
  classId: string | null;
  grade: number;
  students: StudentDay[];
}

/** FM/EM status dot */
function AssignmentDot({ status }: { status: 'assigned' | 'missing' | 'absent-assigned' | 'not-needed' }) {
  if (status === 'not-needed') return null;
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
        status === 'assigned'
          ? 'bg-success-400'
          : status === 'absent-assigned'
            ? 'bg-danger-400 ring-2 ring-danger-200'
            : 'bg-danger-400'
      }`}
    />
  );
}

function classHeaderColors(grade: number) {
  if (grade <= 3) return 'bg-primary-50/70 border-primary-100 text-primary-700';
  if (grade <= 6) return 'bg-accent-50/70 border-accent-100 text-accent-700';
  return 'bg-surface-50 border-surface-200 text-surface-600';
}

export function DayGrid({
  studentDays,
  dayAssignments,
  warnings,
  staffList,
  onUpdateStudentDay,
  onUpdateTime,
  onSetAbsentType,
  absentStaffIds,
  onStaffAbsence,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  studentMap,
  staffShiftMap,
  onStudentContextMenu,
}: DayGridProps) {
  const selectable = selectedIds != null && onToggleSelect != null;

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; studentDay: StudentDay } | null>(null);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, sd: StudentDay) => {
    if (!onStudentContextMenu) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, studentDay: sd });
  }, [onStudentContextMenu]);

  const classGroups = useMemo(() => {
    const map = new Map<string, ClassGroup>();
    for (const sd of studentDays) {
      const key = sd.class_id || 'unassigned';
      if (!map.has(key)) {
        map.set(key, {
          className: sd.class_name || 'Utan klass',
          classId: sd.class_id,
          grade: sd.grade || 99,
          students: [],
        });
      }
      map.get(key)!.students.push(sd);
    }
    for (const group of map.values()) {
      group.students.sort((a, b) =>
        (a.student_name || '').localeCompare(b.student_name || '', 'sv')
      );
    }
    return Array.from(map.values()).sort((a, b) => a.grade - b.grade);
  }, [studentDays]);

  const warningStudentIds = useMemo(
    () => new Set(warnings.filter(w => w.student_id).map(w => w.student_id)),
    [warnings]
  );

  const specialNeedsStudentIds = useMemo(
    () => new Set(dayAssignments.map(da => da.student_id)),
    [dayAssignments]
  );

  const needsFm = (sd: StudentDay) => sd.arrival_time != null && sd.arrival_time < '08:30';
  const needsEm = (sd: StudentDay) => sd.departure_time != null && sd.departure_time > '13:30';

  // Compute per-group FM/EM stats for headers
  function groupStats(group: ClassGroup) {
    let fmNeed = 0, fmAssigned = 0, emNeed = 0, emAssigned = 0;
    for (const sd of group.students) {
      const absentFm = sd.absent_type === 'full_day' || sd.absent_type === 'am';
      const absentEm = sd.absent_type === 'full_day' || sd.absent_type === 'pm';
      if (!absentFm && needsFm(sd)) {
        fmNeed++;
        if (sd.fm_staff_id && !absentStaffIds?.has(sd.fm_staff_id)) fmAssigned++;
      }
      if (!absentEm && needsEm(sd)) {
        emNeed++;
        if (sd.em_staff_id && !absentStaffIds?.has(sd.em_staff_id)) emAssigned++;
      }
    }
    return { fmNeed, fmAssigned, emNeed, emAssigned };
  }

  // Split into sections
  const lowGrade = classGroups.filter(g => g.grade <= 3);
  const highGrade = classGroups.filter(g => g.grade > 3 && g.grade < 99);
  const noClass = classGroups.filter(g => g.grade >= 99);

  // Ordered groups with section dividers
  const allSections: Array<{ type: 'divider'; label: string } | { type: 'group'; group: ClassGroup; groupIdx: number }> = [];

  let gIdx = 0;
  for (const g of lowGrade) {
    allSections.push({ type: 'group', group: g, groupIdx: gIdx++ });
  }
  if (lowGrade.length > 0 && highGrade.length > 0) {
    allSections.push({ type: 'divider', label: 'MELLANSTADIUM' });
  }
  for (const g of highGrade) {
    allSections.push({ type: 'group', group: g, groupIdx: gIdx++ });
  }
  if (noClass.length > 0 && (lowGrade.length > 0 || highGrade.length > 0)) {
    allSections.push({ type: 'divider', label: 'UTAN KLASS' });
  }
  for (const g of noClass) {
    allSections.push({ type: 'group', group: g, groupIdx: gIdx++ });
  }

  const colCount = 6 + (selectable ? 1 : 0) + (onSetAbsentType ? 1 : 0) + 1;

  return (
    <div>
      {/* Main unified table */}
      {studentDays.length > 0 && (
        <div className="card overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-surface-50">
              <tr>
                {selectable && (
                  <th className="px-2 py-2 w-8 no-print">
                    <input
                      type="checkbox"
                      checked={selectedIds!.size > 0 && studentDays.every(sd => selectedIds!.has(sd.id))}
                      onChange={() => onToggleSelectAll?.()}
                      className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                )}
                <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">Elev</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-surface-500 uppercase w-20">Ank.</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-surface-500 uppercase w-20">Avf.</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-surface-500 uppercase">FM Fritids</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-surface-500 uppercase">EM Fritids</th>
                {onSetAbsentType && <th className="px-1 py-2 text-center text-xs font-medium text-surface-500 uppercase w-10 no-print">F</th>}
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {allSections.map((section, sIdx) => {
                if (section.type === 'divider') {
                  return (
                    <tr key={`divider-${sIdx}`}>
                      <td colSpan={colCount} className="px-3 py-1.5 bg-surface-100/60">
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                          {section.label}
                        </span>
                      </td>
                    </tr>
                  );
                }

                const { group, groupIdx } = section;
                const stats = groupStats(group);
                const headerColors = classHeaderColors(group.grade);
                const isEvenGroup = groupIdx % 2 === 0;

                return [
                  // Class group header row
                  <tr key={`header-${group.classId || 'unassigned'}`}>
                    <td colSpan={colCount} className={`px-3 py-1.5 border-t border-b ${headerColors}`}>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span>{group.className}</span>
                        <span className="font-normal opacity-70">{group.students.length} elever</span>
                        <span className="font-normal opacity-70">
                          FM: {stats.fmAssigned}/{stats.fmNeed}
                        </span>
                        <span className="font-normal opacity-70">
                          EM: {stats.emAssigned}/{stats.emNeed}
                        </span>
                      </div>
                    </td>
                  </tr>,
                  // Student rows
                  ...group.students.map((sd) => {
                    const hasWarning = warningStudentIds.has(sd.student_id);
                    const hasSpecialNeeds = specialNeedsStudentIds.has(sd.student_id) || sd.has_care_needs;
                    const absentType = sd.absent_type || 'none';
                    const isFullAbsent = absentType === 'full_day';
                    const isAmAbsent = absentType === 'am';
                    const isPmAbsent = absentType === 'pm';
                    const isAnyAbsent = absentType !== 'none';
                    const absentLabel = isFullAbsent ? 'H' : isAmAbsent ? 'FM' : isPmAbsent ? 'EM' : '';
                    const showFm = !isFullAbsent && !isAmAbsent && needsFm(sd);
                    const showEm = !isFullAbsent && !isPmAbsent && needsEm(sd);
                    const isSelected = selectedIds?.has(sd.id);
                    const fmStaffAbsent = showFm && !!(sd.fm_staff_id && absentStaffIds?.has(sd.fm_staff_id));
                    const emStaffAbsent = showEm && !!(sd.em_staff_id && absentStaffIds?.has(sd.em_staff_id));
                    const staffAbsent = fmStaffAbsent || emStaffAbsent;

                    // FM dot status
                    const fmDotStatus = !showFm ? 'not-needed'
                      : fmStaffAbsent ? 'absent-assigned'
                      : sd.fm_staff_id ? 'assigned'
                      : 'missing';

                    // EM dot status
                    const emDotStatus = !showEm ? 'not-needed'
                      : emStaffAbsent ? 'absent-assigned'
                      : sd.em_staff_id ? 'assigned'
                      : 'missing';

                    return (
                      <tr
                        key={sd.id}
                        onContextMenu={(e) => handleRowContextMenu(e, sd)}
                        className={`transition-colors duration-100 border-b border-surface-100/60 ${
                          isFullAbsent ? 'bg-surface-50 opacity-60'
                          : isAnyAbsent ? 'bg-warning-50/30'
                          : isSelected ? 'bg-primary-50 border-l-2 border-l-primary-500'
                          : hasWarning ? 'bg-danger-50/30'
                          : staffAbsent ? 'bg-danger-50/30'
                          : isEvenGroup ? 'hover:bg-primary-50/30' : 'bg-surface-50/30 hover:bg-primary-50/30'
                        }`}
                      >
                        {selectable && (
                          <td className="px-2 py-1.5 no-print">
                            <input
                              type="checkbox"
                              checked={selectedIds!.has(sd.id)}
                              onChange={() => onToggleSelect!(sd.id)}
                              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                        )}
                        <td className={`px-3 py-1.5 text-sm font-medium ${
                          isFullAbsent ? 'line-through text-surface-400'
                          : isAnyAbsent ? 'text-surface-500'
                          : 'text-surface-900'
                        }`}>
                          {hasSpecialNeeds && <Star className="inline h-3.5 w-3.5 text-accent-500 mr-1 -mt-0.5" />}
                          {sd.student_name}
                          {isAnyAbsent && <span className="ml-1 text-xs text-danger-400">{`(${absentLabel})`}</span>}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {!isFullAbsent ? (
                            <input
                              type="time"
                              value={sd.arrival_time || ''}
                              onChange={(e) => onUpdateTime(sd.id, 'arrival_time', e.target.value)}
                              className="text-sm border border-surface-200/60 bg-surface-50/50 rounded-md text-center w-20 tabular-nums focus:ring-1 focus:ring-primary-300 focus:border-primary-400"
                            />
                          ) : (
                            <span className="text-surface-300 text-sm">{'\u2014'}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {!isFullAbsent ? (
                            <input
                              type="time"
                              value={sd.departure_time || ''}
                              onChange={(e) => onUpdateTime(sd.id, 'departure_time', e.target.value)}
                              className="text-sm border border-surface-200/60 bg-surface-50/50 rounded-md text-center w-20 tabular-nums focus:ring-1 focus:ring-primary-300 focus:border-primary-400"
                            />
                          ) : (
                            <span className="text-surface-300 text-sm">{'\u2014'}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {showFm ? (() => {
                            const fmAbsent = !!(sd.fm_staff_id && absentStaffIds?.has(sd.fm_staff_id));
                            const studentData = studentMap?.get(sd.student_id);
                            return (
                              <div className="flex items-center gap-1.5">
                                <AssignmentDot status={fmDotStatus} />
                                <div className={`flex-1 ${fmAbsent ? 'ring-1 ring-danger-300 rounded-lg' : ''}`}>
                                  <StaffPicker
                                    value={sd.fm_staff_id}
                                    displayName={fmAbsent ? `${sd.fm_staff_name} (frånv.)` : sd.fm_staff_name}
                                    staffList={staffList}
                                    onChange={(id) => onUpdateStudentDay(sd.id, 'fm_staff_id', id)}
                                    studentGrade={sd.grade}
                                    preferredStaffIds={studentData?.preferred_staff}
                                    careRequirements={studentData?.care_requirements}
                                    staffShiftMap={staffShiftMap}
                                    absentStaffIds={absentStaffIds}
                                  />
                                </div>
                                {onStaffAbsence && sd.fm_staff_id && (
                                  <button
                                    type="button"
                                    onClick={() => onStaffAbsence(sd.fm_staff_id!, sd.fm_staff_name || '')}
                                    className={`p-1 rounded-md transition-colors no-print ${
                                      fmAbsent
                                        ? 'text-danger-500 bg-danger-50'
                                        : 'text-surface-300 hover:text-danger-500 hover:bg-danger-50'
                                    }`}
                                    title={fmAbsent ? `${sd.fm_staff_name} — frånvarande` : `Anmäl frånvaro för ${sd.fm_staff_name}`}
                                  >
                                    <CalendarX2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })() : (
                            <span className="text-surface-300 text-sm">{'\u2014'}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {showEm ? (() => {
                            const emAbsent = !!(sd.em_staff_id && absentStaffIds?.has(sd.em_staff_id));
                            const studentDataEm = studentMap?.get(sd.student_id);
                            return (
                              <div className="flex items-center gap-1.5">
                                <AssignmentDot status={emDotStatus} />
                                <div className={`flex-1 ${emAbsent ? 'ring-1 ring-danger-300 rounded-lg' : ''}`}>
                                  <StaffPicker
                                    value={sd.em_staff_id}
                                    displayName={emAbsent ? `${sd.em_staff_name} (frånv.)` : sd.em_staff_name}
                                    staffList={staffList}
                                    onChange={(id) => onUpdateStudentDay(sd.id, 'em_staff_id', id)}
                                    studentGrade={sd.grade}
                                    preferredStaffIds={studentDataEm?.preferred_staff}
                                    careRequirements={studentDataEm?.care_requirements}
                                    staffShiftMap={staffShiftMap}
                                    absentStaffIds={absentStaffIds}
                                  />
                                </div>
                                {onStaffAbsence && sd.em_staff_id && (
                                  <button
                                    type="button"
                                    onClick={() => onStaffAbsence(sd.em_staff_id!, sd.em_staff_name || '')}
                                    className={`p-1 rounded-md transition-colors no-print ${
                                      emAbsent
                                        ? 'text-danger-500 bg-danger-50'
                                        : 'text-surface-300 hover:text-danger-500 hover:bg-danger-50'
                                    }`}
                                    title={emAbsent ? `${sd.em_staff_name} — frånvarande` : `Anmäl frånvaro för ${sd.em_staff_name}`}
                                  >
                                    <CalendarX2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })() : (
                            <span className="text-surface-300 text-sm">{'\u2014'}</span>
                          )}
                        </td>
                        {onSetAbsentType && (
                          <td className="px-1 py-1.5 text-center no-print">
                            <AbsencePopover
                              currentType={absentType}
                              onChange={(type) => onSetAbsentType(sd.id, type)}
                            />
                          </td>
                        )}
                        <td className="px-2 py-1.5 text-center">
                          {(hasWarning || staffAbsent) && <AlertCircle className="inline h-4 w-4 text-danger-500" />}
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Context menu */}
      <AnimatePresence>
        {ctxMenu && onStudentContextMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={[
              {
                label: 'Lägg till specialbehov idag',
                icon: Star,
                onClick: () => onStudentContextMenu(ctxMenu.studentDay, 'special_needs'),
              },
              {
                label: 'Markera frånvaro',
                icon: CalendarX2,
                onClick: () => onStudentContextMenu(ctxMenu.studentDay, 'absence'),
              },
              {
                label: 'Visa elevinfo',
                icon: User,
                onClick: () => onStudentContextMenu(ctxMenu.studentDay, 'info'),
              },
            ]}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Special needs section */}
      {(dayAssignments.length > 0 || onAddAssignment) && (
        <div className="mt-4">
          <h3 className="section-heading mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-accent-500" />
            Specialbehov (KTS)
          </h3>
          <div className="card overflow-hidden">
            {dayAssignments.length > 0 && (
              <table className="min-w-full divide-y divide-surface-100">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase w-40">Elev</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase w-40">Personal</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-surface-500 uppercase w-20">Start</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-surface-500 uppercase w-20">Slut</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase w-32">Roll</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">Anteckning</th>
                    {(onEditAssignment || onDeleteAssignment) && (
                      <th className="px-3 py-2 w-20 no-print"></th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {dayAssignments.map((da) => (
                    <tr
                      key={da.id}
                      className={onEditAssignment ? 'hover:bg-primary-50/50 cursor-pointer transition-colors' : ''}
                      onClick={() => onEditAssignment?.(da)}
                    >
                      <td className="px-3 py-1.5 text-sm font-medium text-surface-900">{da.student_name}</td>
                      <td className="px-3 py-1.5 text-sm text-primary-700">{da.staff_name}</td>
                      <td className="px-3 py-1.5 text-sm text-center text-surface-600 tabular-nums">{da.start_time}</td>
                      <td className="px-3 py-1.5 text-sm text-center text-surface-600 tabular-nums">{da.end_time}</td>
                      <td className="px-3 py-1.5 text-sm text-surface-600">{roleLabel(da.role)}</td>
                      <td className="px-3 py-1.5 text-sm text-surface-500">{da.notes || ''}</td>
                      {(onEditAssignment || onDeleteAssignment) && (
                        <td className="px-3 py-1.5 text-center no-print">
                          {onDeleteAssignment && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDeleteAssignment(da.id); }}
                              className="text-danger-400 hover:text-danger-600 text-sm font-bold transition-colors"
                              title="Ta bort tilldelning"
                            >
                              &times;
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {onAddAssignment && (
              <div className="p-3 border-t border-surface-100 no-print">
                <button
                  type="button"
                  onClick={() => onAddAssignment(studentDays[0]?.weekday ?? 0)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  + Lägg till tilldelning
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case 'school_support': return 'Skolstöd';
    case 'double_staffing': return 'Dubbelbemanning';
    case 'extra_care': return 'Extra omsorg';
    default: return role;
  }
}
