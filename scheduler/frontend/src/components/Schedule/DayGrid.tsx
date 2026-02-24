/**
 * DayGrid — the main student table for a single day.
 * Shows students grouped by class with arrival/departure times and FM/EM staff pickers.
 */

import { useMemo } from 'react';
import { StaffPicker } from './StaffPicker';
import { AbsencePopover } from './AbsencePopover';
import type { StudentDay, DayAssignment, ScheduleWarning, AbsentType } from '../../types/weekSchedule';
import type { Staff } from '../../types';

interface DayGridProps {
  studentDays: StudentDay[];
  dayAssignments: DayAssignment[];
  warnings: ScheduleWarning[];
  staffList: Staff[];
  onUpdateStudentDay: (sdId: string, field: 'fm_staff_id' | 'em_staff_id', value: string | null) => void;
  onUpdateTime: (sdId: string, field: 'arrival_time' | 'departure_time', value: string) => void;
  onSetAbsentType?: (sdId: string, absentType: AbsentType) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (sdId: string) => void;
  onToggleSelectAll?: () => void;
  onAddAssignment?: (weekday: number) => void;
  onEditAssignment?: (da: DayAssignment) => void;
  onDeleteAssignment?: (daId: string) => void;
}

interface ClassGroup {
  className: string;
  classId: string | null;
  grade: number;
  students: StudentDay[];
}

export function DayGrid({
  studentDays,
  dayAssignments,
  warnings,
  staffList,
  onUpdateStudentDay,
  onUpdateTime,
  onSetAbsentType,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
}: DayGridProps) {
  const selectable = selectedIds != null && onToggleSelect != null;
  // Group students by class, sorted by grade
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

    // Sort students within each group alphabetically
    for (const group of map.values()) {
      group.students.sort((a, b) =>
        (a.student_name || '').localeCompare(b.student_name || '', 'sv')
      );
    }

    return Array.from(map.values()).sort((a, b) => a.grade - b.grade);
  }, [studentDays]);

  // Set of student IDs that have warnings
  const warningStudentIds = useMemo(
    () => new Set(warnings.filter(w => w.student_id).map(w => w.student_id)),
    [warnings]
  );

  // Build set of students with special needs assignments
  const specialNeedsStudentIds = useMemo(
    () => new Set(dayAssignments.map(da => da.student_id)),
    [dayAssignments]
  );

  const needsFm = (sd: StudentDay) => sd.arrival_time != null && sd.arrival_time < '08:30';
  const needsEm = (sd: StudentDay) => sd.departure_time != null && sd.departure_time > '13:30';

  // Group classes into grade groups
  const lowGrade = classGroups.filter(g => g.grade <= 3);
  const highGrade = classGroups.filter(g => g.grade > 3 && g.grade < 99);
  const noClass = classGroups.filter(g => g.grade >= 99);

  const renderGroup = (label: string, groups: ClassGroup[]) => {
    if (groups.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {selectable && (
                  <th className="px-2 py-2 w-8 no-print">
                    <input
                      type="checkbox"
                      checked={selectedIds!.size > 0 && studentDays.every(sd => selectedIds!.has(sd.id))}
                      onChange={() => onToggleSelectAll?.()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Klass</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Elev</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Ank.</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Avf.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">FM Fritids</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">EM Fritids</th>
                {onSetAbsentType && <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-10 no-print">F</th>}
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((group) =>
                group.students.map((sd, idx) => {
                  const hasWarning = warningStudentIds.has(sd.student_id);
                  const hasSpecialNeeds = specialNeedsStudentIds.has(sd.student_id) || sd.has_care_needs;
                  const absentType = sd.absent_type || 'none';
                  const isFullAbsent = absentType === 'full_day';
                  const isAmAbsent = absentType === 'am';
                  const isPmAbsent = absentType === 'pm';
                  const isAnyAbsent = absentType !== 'none';
                  const absentLabel = isFullAbsent ? 'H' : isAmAbsent ? 'FM' : isPmAbsent ? 'EM' : '';
                  // FM hidden if full_day or am-absent; EM hidden if full_day or pm-absent
                  const showFm = !isFullAbsent && !isAmAbsent && needsFm(sd);
                  const showEm = !isFullAbsent && !isPmAbsent && needsEm(sd);
                  return (
                    <tr
                      key={sd.id}
                      className={`${isFullAbsent ? 'bg-gray-100 opacity-60' : isAnyAbsent ? 'bg-orange-50/50' : selectedIds?.has(sd.id) ? 'bg-blue-50' : hasWarning ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      {selectable && (
                        <td className="px-2 py-2 no-print">
                          <input
                            type="checkbox"
                            checked={selectedIds!.has(sd.id)}
                            onChange={() => onToggleSelect!(sd.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {idx === 0 ? group.className : ''}
                      </td>
                      <td className={`px-3 py-2 text-sm font-medium ${isFullAbsent ? 'line-through text-gray-400' : isAnyAbsent ? 'text-gray-500' : 'text-gray-900'}`}>
                        {hasSpecialNeeds && <span className="text-yellow-500 mr-1" title="Specialbehov">&#9733;</span>}
                        {sd.student_name}
                        {isAnyAbsent && <span className="ml-1 text-xs text-red-400">{`(${absentLabel})`}</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {!isFullAbsent ? (
                          <input
                            type="time"
                            value={sd.arrival_time || ''}
                            onChange={(e) => onUpdateTime(sd.id, 'arrival_time', e.target.value)}
                            className="text-sm border-0 bg-transparent text-center w-20 focus:ring-1 focus:ring-blue-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-300 text-sm">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {!isFullAbsent ? (
                          <input
                            type="time"
                            value={sd.departure_time || ''}
                            onChange={(e) => onUpdateTime(sd.id, 'departure_time', e.target.value)}
                            className="text-sm border-0 bg-transparent text-center w-20 focus:ring-1 focus:ring-blue-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-300 text-sm">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {showFm ? (
                          <StaffPicker
                            value={sd.fm_staff_id}
                            displayName={sd.fm_staff_name}
                            staffList={staffList}
                            onChange={(id) => onUpdateStudentDay(sd.id, 'fm_staff_id', id)}
                            studentGrade={sd.grade}
                          />
                        ) : (
                          <span className="text-gray-300 text-sm">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {showEm ? (
                          <StaffPicker
                            value={sd.em_staff_id}
                            displayName={sd.em_staff_name}
                            staffList={staffList}
                            onChange={(id) => onUpdateStudentDay(sd.id, 'em_staff_id', id)}
                            studentGrade={sd.grade}
                          />
                        ) : (
                          <span className="text-gray-300 text-sm">{'\u2014'}</span>
                        )}
                      </td>
                      {onSetAbsentType && (
                        <td className="px-1 py-2 text-center no-print">
                          <AbsencePopover
                            currentType={absentType}
                            onChange={(type) => onSetAbsentType(sd.id, type)}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 text-center">
                        {hasWarning && <span className="text-red-500" title="Varning">!</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderGroup('Lågstadium (1-3)', lowGrade)}
      {renderGroup('Mellanstadium (4-6)', highGrade)}
      {noClass.length > 0 && renderGroup('Utan klass', noClass)}

      {/* Special needs section */}
      {(dayAssignments.length > 0 || onAddAssignment) && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            &#9733; Specialbehov (KTS)
          </h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {dayAssignments.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Elev</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Personal</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Start</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Slut</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Roll</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Anteckning</th>
                    {(onEditAssignment || onDeleteAssignment) && (
                      <th className="px-3 py-2 w-20 no-print"></th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dayAssignments.map((da) => (
                    <tr
                      key={da.id}
                      className={onEditAssignment ? 'hover:bg-blue-50 cursor-pointer' : ''}
                      onClick={() => onEditAssignment?.(da)}
                    >
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{da.student_name}</td>
                      <td className="px-3 py-2 text-sm text-blue-700">{da.staff_name}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-600">{da.start_time}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-600">{da.end_time}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{roleLabel(da.role)}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{da.notes || ''}</td>
                      {(onEditAssignment || onDeleteAssignment) && (
                        <td className="px-3 py-2 text-center no-print">
                          {onDeleteAssignment && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDeleteAssignment(da.id); }}
                              className="text-red-400 hover:text-red-600 text-sm font-bold"
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
              <div className="p-2 border-t border-gray-100 no-print">
                <button
                  type="button"
                  onClick={() => onAddAssignment(studentDays[0]?.weekday ?? 0)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + L&auml;gg till tilldelning
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
    case 'school_support': return 'Skolstod';
    case 'double_staffing': return 'Dubbelbemanning';
    case 'extra_care': return 'Extra omsorg';
    default: return role;
  }
}
