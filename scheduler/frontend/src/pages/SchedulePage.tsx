/**
 * Main schedule page — "Digital Excel" view.
 *
 * One week, one day tab at a time.
 * Student table + staff shift table + warning bar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useStaff } from '../hooks/useStaff';
import {
  useWeekSchedule,
  useCreateWeek,
  useCopyWeek,
  useUpdateWeek,
  useDayData,
  useUpdateStudentDay,
  useUpdateStaffShift,
  useCreateDayAssignment,
  useUpdateDayAssignment,
  useDeleteDayAssignment,
} from '../hooks/useWeekSchedule';
import { WeekHeader } from '../components/Schedule/WeekHeader';
import { DayGrid } from '../components/Schedule/DayGrid';
import { StaffShiftTable } from '../components/Schedule/StaffShiftTable';
import { WarningBar } from '../components/Schedule/WarningBar';
import { StaffSummary } from '../components/Schedule/StaffSummary';
import { WeekDashboard } from '../components/Schedule/WeekDashboard';
import { UndoToast } from '../components/Schedule/UndoToast';
import { useWeekSummary } from '../hooks/useWeekSummary';
import { useUndo } from '../hooks/useUndo';
import { FilterBar, type QuickFilter } from '../components/Schedule/FilterBar';
import { BulkAssignBar } from '../components/Schedule/BulkAssignBar';
import { DayAssignmentModal } from '../components/Schedule/DayAssignmentModal';
import { getDateForWeekday } from '../components/Schedule/StaffAbsencePopover';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { getErrorMessage } from '../api';
import type { StudentDay, DayAssignment, DayAssignmentCreate, DayAssignmentUpdate, AbsentType } from '../types/weekSchedule';

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

export function SchedulePage() {
  const { currentWeek, currentYear, setCurrentWeek, selectedWeekday, setSelectedWeekday } = useAppStore();

  // Fetch week schedule — returns null when no schedule exists (404)
  const { data: weekSchedule, isLoading: weekLoading, error: weekError } = useWeekSchedule(currentYear, currentWeek);

  // weekSchedule is null when no schedule exists, undefined while loading
  const hasSchedule = weekSchedule != null;

  // Fetch day data for the selected day
  const { data: dayData, isLoading: dayLoading } = useDayData(
    hasSchedule ? weekSchedule.id : null,
    selectedWeekday,
  );

  // Staff list for pickers
  const { data: staffList = [] } = useStaff();

  // Week summary (all 5 days)
  const weekSummary = useWeekSummary(hasSchedule ? weekSchedule.id : null);

  // Undo stack — destructure to get stable refs for callbacks
  const undoStack = useUndo();
  const { push: undoPush, clear: undoClear } = undoStack;

  // Mutations
  const createWeekMutation = useCreateWeek();
  const copyWeekMutation = useCopyWeek();
  const updateStudentDayMutation = useUpdateStudentDay(hasSchedule ? weekSchedule.id : '');
  const updateStaffShiftMutation = useUpdateStaffShift(hasSchedule ? weekSchedule.id : '');
  const updateWeekMutation = useUpdateWeek();
  const createDayAssignmentMutation = useCreateDayAssignment(hasSchedule ? weekSchedule.id : '');
  const updateDayAssignmentMutation = useUpdateDayAssignment(hasSchedule ? weekSchedule.id : '');
  const deleteDayAssignmentMutation = useDeleteDayAssignment(hasSchedule ? weekSchedule.id : '');

  // DayAssignment modal state
  const [dayAssignmentModal, setDayAssignmentModal] = useState<{
    weekday: number;
    existing?: DayAssignment;
  } | null>(null);

  // Navigation
  const handlePrevWeek = () => {
    if (currentWeek > 1) setCurrentWeek(currentWeek - 1, currentYear);
    else setCurrentWeek(52, currentYear - 1);
  };
  const handleNextWeek = () => {
    if (currentWeek < 52) setCurrentWeek(currentWeek + 1, currentYear);
    else setCurrentWeek(1, currentYear + 1);
  };

  const handleCreateWeek = async () => {
    await createWeekMutation.mutateAsync({
      year: currentYear,
      week_number: currentWeek,
    });
  };

  const handleCopyWeek = async () => {
    const prevWeek = currentWeek > 1 ? currentWeek - 1 : 52;
    const prevYear = currentWeek > 1 ? currentYear : currentYear - 1;
    try {
      const { weekSchedulesApi } = await import('../api/weekSchedules');
      const prevWs = await weekSchedulesApi.getWeek(prevYear, prevWeek);
      if (prevWs) {
        await copyWeekMutation.mutateAsync({
          weekId: prevWs.id,
          data: { target_year: currentYear, target_week: currentWeek },
        });
      } else {
        // No previous week — just create new
        await createWeekMutation.mutateAsync({
          year: currentYear,
          week_number: currentWeek,
        });
      }
    } catch {
      await createWeekMutation.mutateAsync({
        year: currentYear,
        week_number: currentWeek,
      });
    }
  };

  // Inline editing callbacks (with undo support)
  const handleUpdateStaffAssignment = useCallback(
    (sdId: string, field: 'fm_staff_id' | 'em_staff_id', value: string | null) => {
      // Find previous value for undo
      const sd = dayData?.student_days.find(s => s.id === sdId);
      const prevValue = sd ? sd[field] : null;
      const staffName = field === 'fm_staff_id' ? 'FM' : 'EM';

      updateStudentDayMutation.mutate({ sdId, data: { [field]: value } });

      undoPush({
        label: `${staffName}-tilldelning ändrad för ${sd?.student_name || 'elev'}`,
        revert: () => updateStudentDayMutation.mutate({ sdId, data: { [field]: prevValue } }),
      });
    },
    [updateStudentDayMutation, dayData, undoPush]
  );

  const handleUpdateTime = useCallback(
    (sdId: string, field: 'arrival_time' | 'departure_time', value: string) => {
      const sd = dayData?.student_days.find(s => s.id === sdId);
      const prevValue = sd ? (sd[field] || '') : '';

      updateStudentDayMutation.mutate({ sdId, data: { [field]: value || undefined } });

      undoPush({
        label: `Tid ändrad för ${sd?.student_name || 'elev'}`,
        revert: () => updateStudentDayMutation.mutate({ sdId, data: { [field]: prevValue || undefined } }),
      });
    },
    [updateStudentDayMutation, dayData, undoPush]
  );

  const handleUpdateShift = useCallback(
    (shiftId: string, data: Parameters<typeof updateStaffShiftMutation.mutate>[0]['data']) => {
      const shift = dayData?.staff_shifts.find(s => s.id === shiftId);
      const prevData: typeof data = {};
      if (shift) {
        if ('start_time' in data) prevData.start_time = shift.start_time;
        if ('end_time' in data) prevData.end_time = shift.end_time;
        if ('break_minutes' in data) prevData.break_minutes = shift.break_minutes;
        if ('notes' in data) prevData.notes = shift.notes || undefined;
      }

      updateStaffShiftMutation.mutate({ shiftId, data });

      undoPush({
        label: `Pass ändrat för ${shift?.staff_name || 'personal'}`,
        revert: () => updateStaffShiftMutation.mutate({ shiftId, data: prevData }),
      });
    },
    [updateStaffShiftMutation, dayData, undoPush]
  );

  // Set student absence type
  const handleSetAbsentType = useCallback(
    (sdId: string, absentType: AbsentType) => {
      const sd = dayData?.student_days.find(s => s.id === sdId);
      const prevType = sd?.absent_type || 'none';
      updateStudentDayMutation.mutate({ sdId, data: { absent_type: absentType } });
      const labels: Record<AbsentType, string> = {
        none: 'n\u00e4rvarande',
        full_day: 'fr\u00e5nvarande heldag',
        am: 'fr\u00e5nvarande FM',
        pm: 'fr\u00e5nvarande EM',
      };
      undoPush({
        label: `${sd?.student_name || 'Elev'} \u2192 ${labels[absentType]}`,
        revert: () => updateStudentDayMutation.mutate({ sdId, data: { absent_type: prevType } }),
      });
    },
    [updateStudentDayMutation, dayData, undoPush]
  );

  // Publish/draft toggle
  const handleToggleStatus = useCallback(() => {
    if (!weekSchedule) return;
    const newStatus = weekSchedule.status === 'published' ? 'draft' : 'published';
    const confirmMsg = newStatus === 'published'
      ? 'Vill du publicera detta schema? Det blir synligt f\u00f6r alla.'
      : 'Vill du avpublicera schemat och \u00e5terg\u00e5 till utkast?';
    if (!window.confirm(confirmMsg)) return;
    updateWeekMutation.mutate({ weekId: weekSchedule.id, data: { status: newStatus } });
  }, [weekSchedule, updateWeekMutation]);

  // Day assignment CRUD
  const handleCreateDayAssignment = useCallback(
    (data: DayAssignmentCreate) => {
      createDayAssignmentMutation.mutate(data);
      setDayAssignmentModal(null);
    },
    [createDayAssignmentMutation]
  );

  const handleUpdateDayAssignment = useCallback(
    (daId: string, data: DayAssignmentUpdate) => {
      updateDayAssignmentMutation.mutate({ daId, data });
      setDayAssignmentModal(null);
    },
    [updateDayAssignmentMutation]
  );

  const handleDeleteDayAssignment = useCallback(
    (daId: string) => {
      if (!window.confirm('Ta bort denna tilldelning?')) return;
      deleteDayAssignmentMutation.mutate(daId);
    },
    [deleteDayAssignmentMutation]
  );

  const isCreating = createWeekMutation.isPending || copyWeekMutation.isPending;

  // ── Filter state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  // Build class list dynamically from student data
  const classList = useMemo(() => {
    if (!dayData) return [];
    const map = new Map<string, { id: string; name: string; grade: number }>();
    for (const sd of dayData.student_days) {
      if (sd.class_id && sd.class_name && !map.has(sd.class_id)) {
        map.set(sd.class_id, { id: sd.class_id, name: sd.class_name, grade: sd.grade || 99 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.grade - b.grade);
  }, [dayData]);

  // Warning student IDs set — needed for quickFilter
  const warningStudentIds = useMemo(
    () => new Set(dayData?.warnings.filter(w => w.student_id).map(w => w.student_id) ?? []),
    [dayData?.warnings]
  );

  const hasActiveFilters = searchTerm !== '' || selectedClass !== '' || quickFilter !== 'all';

  // Helper: does this student need FM/EM care?
  const needsFm = (sd: StudentDay) => sd.arrival_time != null && sd.arrival_time < '08:30';
  const needsEm = (sd: StudentDay) => sd.departure_time != null && sd.departure_time > '13:30';

  // Filtered student days (all three filters combined with AND)
  const filteredStudentDays = useMemo(() => {
    if (!dayData) return [];
    let result = dayData.student_days;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(sd => (sd.student_name || '').toLowerCase().includes(term));
    }

    // Class filter
    if (selectedClass) {
      result = result.filter(sd => sd.class_id === selectedClass);
    }

    // Quick filter
    if (quickFilter === 'missing_staff') {
      result = result.filter(sd => {
        const fmNeeded = needsFm(sd) && !sd.fm_staff_id;
        const emNeeded = needsEm(sd) && !sd.em_staff_id;
        return fmNeeded || emNeeded;
      });
    } else if (quickFilter === 'special_needs') {
      result = result.filter(sd => sd.has_care_needs);
    } else if (quickFilter === 'warnings') {
      result = result.filter(sd => warningStudentIds.has(sd.student_id));
    }

    return result;
  }, [dayData, searchTerm, selectedClass, quickFilter, warningStudentIds]);

  // Filtered staff shifts (only text search)
  const filteredStaffShifts = useMemo(() => {
    if (!dayData) return [];
    if (!searchTerm) return dayData.staff_shifts;
    const term = searchTerm.toLowerCase();
    return dayData.staff_shifts.filter(s => (s.staff_name || '').toLowerCase().includes(term));
  }, [dayData, searchTerm]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setQuickFilter('all');
  };

  // ── Bulk selection state (must come after filteredStudentDays) ──
  const [selectedStudentDayIds, setSelectedStudentDayIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = useCallback((sdId: string) => {
    setSelectedStudentDayIds(prev => {
      const next = new Set(prev);
      if (next.has(sdId)) next.delete(sdId);
      else next.add(sdId);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedStudentDayIds(prev => {
      if (prev.size > 0 && filteredStudentDays.every(sd => prev.has(sd.id))) {
        return new Set();
      }
      return new Set(filteredStudentDays.map(sd => sd.id));
    });
  }, [filteredStudentDays]);

  const handleBulkAssign = useCallback(
    (staffId: string | null, field: 'fm_staff_id' | 'em_staff_id') => {
      for (const sdId of selectedStudentDayIds) {
        updateStudentDayMutation.mutate({ sdId, data: { [field]: staffId } });
      }
      setSelectedStudentDayIds(new Set());
    },
    [selectedStudentDayIds, updateStudentDayMutation]
  );

  // Reset filters and selection on day change
  useEffect(() => {
    setSearchTerm('');
    setSelectedClass('');
    setQuickFilter('all');
    setSelectedStudentDayIds(new Set());
    undoClear();
  }, [selectedWeekday, undoClear]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Week header with navigation */}
        <WeekHeader
          year={currentYear}
          week={currentWeek}
          weekSchedule={hasSchedule ? weekSchedule : null}
          isLoading={weekLoading}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onCreateWeek={handleCreateWeek}
          onCopyWeek={handleCopyWeek}
          isCreating={isCreating}
          onToggleStatus={handleToggleStatus}
        />

        {/* Real errors (not 404) */}
        {weekError && !weekLoading && (
          <ErrorMessage message={`Kunde inte hämta schema: ${getErrorMessage(weekError)}`} />
        )}
        {createWeekMutation.isError && (
          <ErrorMessage message={getErrorMessage(createWeekMutation.error)} />
        )}

        {/* Day tabs */}
        {hasSchedule && (
          <div className="flex space-x-1 bg-white rounded-lg shadow p-1">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedWeekday(idx)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedWeekday === idx
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Week dashboard */}
        {hasSchedule && (
          <WeekDashboard
            summary={weekSummary}
            selectedWeekday={selectedWeekday}
            onSelectDay={setSelectedWeekday}
          />
        )}

        {/* Day content */}
        {hasSchedule && dayLoading && (
          <div className="text-center py-12 text-gray-400">Laddar dagdata...</div>
        )}

        {hasSchedule && dayData && !dayLoading && (
          <>
            {/* Print header — only visible when printing */}
            <div className="print-header hidden">
              Vecka {currentWeek}, {currentYear} — {DAY_NAMES[selectedWeekday]}
            </div>

            {/* Filter bar + print button */}
            <div className="no-print">
              <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedClass={selectedClass}
              onClassChange={setSelectedClass}
              classList={classList}
              quickFilter={quickFilter}
              onQuickFilterChange={setQuickFilter}
              onReset={handleResetFilters}
              resultCount={{ shown: filteredStudentDays.length, total: dayData.student_days.length }}
              hasActiveFilters={hasActiveFilters}
            />
            </div>

            {/* Print button */}
            <div className="no-print flex justify-end -mt-2">
              <button
                onClick={() => window.print()}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                &#128424; Skriv ut
              </button>
            </div>

            {/* Bulk assign bar */}
            {selectedStudentDayIds.size > 0 && (
              <BulkAssignBar
                selectedCount={selectedStudentDayIds.size}
                staffList={staffList}
                onAssign={handleBulkAssign}
                onClear={() => setSelectedStudentDayIds(new Set())}
              />
            )}

            {/* Student grid */}
            <DayGrid
              studentDays={filteredStudentDays}
              dayAssignments={dayData.day_assignments}
              warnings={dayData.warnings}
              staffList={staffList}
              onUpdateStudentDay={handleUpdateStaffAssignment}
              onUpdateTime={handleUpdateTime}
              onSetAbsentType={handleSetAbsentType}
              selectedIds={selectedStudentDayIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onAddAssignment={(weekday) => setDayAssignmentModal({ weekday })}
              onEditAssignment={(da) => setDayAssignmentModal({ weekday: da.weekday, existing: da })}
              onDeleteAssignment={handleDeleteDayAssignment}
            />

            {/* Staff summary — workload per staff member */}
            <StaffSummary studentDays={dayData.student_days} />

            {/* Staff shifts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Personalens arbetspass
              </h3>
              <StaffShiftTable
                shifts={filteredStaffShifts}
                onUpdateShift={handleUpdateShift}
                absenceDate={getDateForWeekday(currentYear, currentWeek, selectedWeekday)}
              />
            </div>

            {/* Warning bar */}
            <WarningBar warnings={dayData.warnings} />
          </>
        )}

        {/* Empty state — no schedule for this week */}
        {!hasSchedule && !weekLoading && !weekError && (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-2">
              Inget schema för vecka {currentWeek}, {currentYear}
            </p>
            <p className="text-gray-400 text-sm">
              Klicka <strong>"Ny vecka"</strong> för att skapa ett nytt schema med elevernas standardtider,
              eller <strong>"Kopiera förra"</strong> för att kopiera föregående veckas schema.
            </p>
          </div>
        )}
      </div>

      {/* Day assignment modal */}
      {dayAssignmentModal && weekSchedule && (
        <DayAssignmentModal
          weekday={dayAssignmentModal.weekday}
          weekId={weekSchedule.id}
          staffList={staffList}
          studentDays={dayData?.student_days ?? []}
          existing={dayAssignmentModal.existing}
          onSave={dayAssignmentModal.existing
            ? (data) => handleUpdateDayAssignment(dayAssignmentModal.existing!.id, data as DayAssignmentUpdate)
            : (data) => handleCreateDayAssignment(data as DayAssignmentCreate)
          }
          onClose={() => setDayAssignmentModal(null)}
        />
      )}

      {/* Undo toast */}
      {undoStack.canUndo && undoStack.lastLabel && (
        <UndoToast label={undoStack.lastLabel} onUndo={undoStack.undo} />
      )}
    </div>
  );
}
