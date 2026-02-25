/**
 * Main schedule page — "Digital Excel" view.
 *
 * One week, one day tab at a time.
 * Student table + staff shift table + warning bar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useStaff } from '../hooks/useStaff';
import { useStudents } from '../hooks/useStudents';
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
import { DayTabs } from '../components/Schedule/DayTabs';
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
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { EmptyState } from '../components/Common/EmptyState';
import { StaffAbsenceModal } from '../components/Schedule/StaffAbsenceModal';
import { getDateForWeekday } from '../components/Schedule/StaffAbsencePopover';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { getErrorMessage } from '../api';
import type { StudentDay, DayAssignment, DayAssignmentCreate, DayAssignmentUpdate, AbsentType } from '../types/weekSchedule';
import type { Student } from '../types';
import { Calendar } from 'lucide-react';

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

export function SchedulePage() {
  const { currentWeek, currentYear, setCurrentWeek, selectedWeekday, setSelectedWeekday } = useAppStore();

  const { data: weekSchedule, isLoading: weekLoading, error: weekError } = useWeekSchedule(currentYear, currentWeek);
  const hasSchedule = weekSchedule != null;
  const { data: dayData, isLoading: dayLoading } = useDayData(
    hasSchedule ? weekSchedule.id : null,
    selectedWeekday,
  );
  const { data: staffList = [] } = useStaff();
  const { data: students = [] } = useStudents();
  const weekSummary = useWeekSummary(hasSchedule ? weekSchedule.id : null);

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    for (const s of students) map.set(s.id, s);
    return map;
  }, [students]);

  const staffShiftMap = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>();
    if (dayData) {
      for (const shift of dayData.staff_shifts) {
        map.set(shift.staff_id, { start: shift.start_time, end: shift.end_time });
      }
    }
    return map;
  }, [dayData]);
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

  // Confirm dialog state (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  } | null>(null);

  // Staff absence modal state
  const [absenceModal, setAbsenceModal] = useState<{
    staffId: string;
    staffName: string;
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

  const handleSetAbsentType = useCallback(
    (sdId: string, absentType: AbsentType) => {
      const sd = dayData?.student_days.find(s => s.id === sdId);
      const prevType = sd?.absent_type || 'none';
      updateStudentDayMutation.mutate({ sdId, data: { absent_type: absentType } });
      const labels: Record<AbsentType, string> = {
        none: 'närvarande',
        full_day: 'frånvarande heldag',
        am: 'frånvarande FM',
        pm: 'frånvarande EM',
      };
      undoPush({
        label: `${sd?.student_name || 'Elev'} \u2192 ${labels[absentType]}`,
        revert: () => updateStudentDayMutation.mutate({ sdId, data: { absent_type: prevType } }),
      });
    },
    [updateStudentDayMutation, dayData, undoPush]
  );

  // Publish/draft toggle — uses ConfirmDialog instead of window.confirm
  const handleToggleStatus = useCallback(() => {
    if (!weekSchedule) return;
    const newStatus = weekSchedule.status === 'published' ? 'draft' : 'published';
    setConfirmDialog({
      title: newStatus === 'published' ? 'Publicera schema' : 'Avpublicera schema',
      message: newStatus === 'published'
        ? 'Vill du publicera detta schema? Det blir synligt för alla.'
        : 'Vill du avpublicera schemat och återgå till utkast?',
      variant: newStatus === 'published' ? 'primary' : 'danger',
      onConfirm: () => {
        updateWeekMutation.mutate({ weekId: weekSchedule.id, data: { status: newStatus } });
        setConfirmDialog(null);
      },
    });
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
      setConfirmDialog({
        title: 'Ta bort tilldelning',
        message: 'Är du säker på att du vill ta bort denna tilldelning?',
        variant: 'danger',
        onConfirm: () => {
          deleteDayAssignmentMutation.mutate(daId);
          setConfirmDialog(null);
        },
      });
    },
    [deleteDayAssignmentMutation]
  );

  const isCreating = createWeekMutation.isPending || copyWeekMutation.isPending;

  // ── Filter state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

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

  const warningStudentIds = useMemo(
    () => new Set(dayData?.warnings.filter(w => w.student_id).map(w => w.student_id) ?? []),
    [dayData?.warnings]
  );

  const absentStaffIds = useMemo(
    () => new Set(
      dayData?.warnings
        .filter(w => w.type === 'absence' && w.staff_id)
        .map(w => w.staff_id!) ?? []
    ),
    [dayData?.warnings]
  );

  // Warning days for DayTabs
  const warningDays = useMemo(() => {
    const set = new Set<number>();
    if (weekSummary.days) {
      weekSummary.days.forEach((d, i) => {
        if (d.warnings > 0 || d.unassignedFm + d.unassignedEm > 0) set.add(i);
      });
    }
    return set;
  }, [weekSummary.days]);

  const hasActiveFilters = searchTerm !== '' || selectedClass !== '' || quickFilter !== 'all';

  const needsFm = (sd: StudentDay) => sd.arrival_time != null && sd.arrival_time < '08:30';
  const needsEm = (sd: StudentDay) => sd.departure_time != null && sd.departure_time > '13:30';

  const filteredStudentDays = useMemo(() => {
    if (!dayData) return [];
    let result = dayData.student_days;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(sd => (sd.student_name || '').toLowerCase().includes(term));
    }
    if (selectedClass) {
      result = result.filter(sd => sd.class_id === selectedClass);
    }
    if (quickFilter === 'missing_staff') {
      result = result.filter(sd => {
        const fmNeeded = needsFm(sd) && (!sd.fm_staff_id || absentStaffIds.has(sd.fm_staff_id));
        const emNeeded = needsEm(sd) && (!sd.em_staff_id || absentStaffIds.has(sd.em_staff_id));
        return fmNeeded || emNeeded;
      });
    } else if (quickFilter === 'special_needs') {
      result = result.filter(sd => sd.has_care_needs);
    } else if (quickFilter === 'warnings') {
      result = result.filter(sd => warningStudentIds.has(sd.student_id));
    }
    return result;
  }, [dayData, searchTerm, selectedClass, quickFilter, warningStudentIds, absentStaffIds]);

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

  // ── Bulk selection state ──
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
          <DayTabs
            selected={selectedWeekday}
            onSelect={setSelectedWeekday}
            warningDays={warningDays}
          />
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
          <div className="card py-12 text-center text-surface-400">Laddar dagdata...</div>
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
                className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Skriv ut
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
              absentStaffIds={absentStaffIds}
              onStaffAbsence={(staffId, staffName) => setAbsenceModal({ staffId, staffName })}
              onToggleSelectAll={handleToggleSelectAll}
              onAddAssignment={(weekday) => setDayAssignmentModal({ weekday })}
              onEditAssignment={(da) => setDayAssignmentModal({ weekday: da.weekday, existing: da })}
              onDeleteAssignment={handleDeleteDayAssignment}
              studentMap={studentMap}
              staffShiftMap={staffShiftMap}
            />

            {/* Staff summary */}
            <StaffSummary studentDays={dayData.student_days} />

            {/* Staff shifts */}
            <div>
              <h3 className="section-heading mb-2">
                Personalens arbetspass
              </h3>
              <StaffShiftTable
                shifts={filteredStaffShifts}
                onUpdateShift={handleUpdateShift}
                onStaffAbsence={(staffId, staffName) => setAbsenceModal({ staffId, staffName })}
                absentStaffIds={absentStaffIds}
              />
            </div>

            {/* Warning bar */}
            <WarningBar warnings={dayData.warnings} />
          </>
        )}

        {/* Empty state — no schedule for this week */}
        {!hasSchedule && !weekLoading && !weekError && (
          <div className="card">
            <EmptyState
              icon={Calendar}
              title={`Inget schema för vecka ${currentWeek}, ${currentYear}`}
              description='Klicka "Ny vecka" för att skapa ett nytt schema med elevernas standardtider, eller "Kopiera förra" för att kopiera föregående veckas schema.'
            />
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

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        variant={confirmDialog?.variant ?? 'primary'}
        onConfirm={confirmDialog?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Staff absence modal */}
      {absenceModal && (
        <StaffAbsenceModal
          staffId={absenceModal.staffId}
          staffName={absenceModal.staffName}
          absenceDate={getDateForWeekday(currentYear, currentWeek, selectedWeekday)}
          onClose={() => setAbsenceModal(null)}
        />
      )}

      {/* Undo toast */}
      {undoStack.canUndo && undoStack.lastLabel && (
        <UndoToast label={undoStack.lastLabel} onUndo={undoStack.undo} />
      )}
    </div>
  );
}
