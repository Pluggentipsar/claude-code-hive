/**
 * Main schedule page — "Digital Excel" view.
 *
 * 5-zone layout:
 *   Zone A: Sticky PageToolbar (week nav + day tabs + filters)
 *   Zone B: Context banners (critical warnings, absence impact)
 *   Zone C: CompactWeekStrip (collapsible week overview)
 *   Zone D: DayGrid (main student table)
 *   Zone E: AnalyticsPanel (tabbed: Personal, Klassbalans, Vikarie, Sårbarhet, Välmående)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
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
  useAutoAssignDay,
  useAbsenceImpact,
  useVulnerabilities,
  useCoverageTimeline,
  useClassBalance,
  useSubstituteReport,
  useSuggestAssignments,
  useVulnerabilityMap,
  useStaffWellbeing,
} from '../hooks/useWeekSchedule';
import { PageToolbar } from '../components/Schedule/PageToolbar';
import { CompactWeekStrip } from '../components/Schedule/CompactWeekStrip';
import { DayGrid } from '../components/Schedule/DayGrid';
import { StudentInfoPanel } from '../components/Schedule/StudentInfoPanel';
import { AnalyticsPanel } from '../components/Schedule/AnalyticsPanel';

import { UndoToast } from '../components/Schedule/UndoToast';
import { useWeekSummary } from '../hooks/useWeekSummary';
import { useUndo } from '../hooks/useUndo';
import { BulkAssignBar } from '../components/Schedule/BulkAssignBar';
import { DayAssignmentModal } from '../components/Schedule/DayAssignmentModal';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { EmptyState } from '../components/Common/EmptyState';
import { StaffAbsenceModal } from '../components/Schedule/StaffAbsenceModal';
import { getDateForWeekday } from '../components/Schedule/StaffAbsencePopover';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { getErrorMessage } from '../api';
import { AbsenceImpactPanel } from '../components/Schedule/AbsenceImpactPanel';
import { AutoSuggestModal } from '../components/Schedule/AutoSuggestModal';
import { WeekPlanningWizard } from '../components/Schedule/WeekPlanningWizard';
import type { StudentDay, DayAssignment, DayAssignmentCreate, DayAssignmentUpdate, AbsentType, SuggestedReassignment, AssignmentSuggestion } from '../types/weekSchedule';
import type { ContextMenuAction } from '../components/Schedule/DayGrid';
import type { Student } from '../types';
import type { QuickFilter } from '../components/Schedule/PageToolbar';
import { Calendar, AlertTriangle } from 'lucide-react';

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

  // Data hooks for analytics
  const absentStaffIdsList = useMemo(() => {
    if (!dayData) return [];
    return dayData.warnings
      .filter(w => w.type === 'absence' && w.staff_id)
      .map(w => w.staff_id!);
  }, [dayData]);

  const { data: absenceImpact } = useAbsenceImpact(
    hasSchedule ? weekSchedule.id : null,
    selectedWeekday,
    absentStaffIdsList,
  );
  const { data: vulnerabilities } = useVulnerabilities(hasSchedule ? weekSchedule.id : null);
  const { data: coverageSlots } = useCoverageTimeline(
    hasSchedule ? weekSchedule.id : null,
    selectedWeekday,
  );
  const { data: classBalance } = useClassBalance(
    hasSchedule ? weekSchedule.id : null,
    selectedWeekday,
  );
  const { data: substituteReport } = useSubstituteReport(hasSchedule ? weekSchedule.id : null);
  const { data: vulnerabilityMap } = useVulnerabilityMap(hasSchedule ? weekSchedule.id : null);
  const { data: staffWellbeing } = useStaffWellbeing(hasSchedule ? weekSchedule.id : null);

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
  const autoAssignDayMutation = useAutoAssignDay(hasSchedule ? weekSchedule.id : '');
  const suggestAssignmentsMutation = useSuggestAssignments(hasSchedule ? weekSchedule.id : '');

  // UI state
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [absenceImpactDismissed, setAbsenceImpactDismissed] = useState(false);

  const [dayAssignmentModal, setDayAssignmentModal] = useState<{
    weekday: number;
    existing?: DayAssignment;
    prefilledStudentId?: string;
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  } | null>(null);

  const [absenceModal, setAbsenceModal] = useState<{
    staffId: string;
    staffName: string;
  } | null>(null);

  const [studentInfoId, setStudentInfoId] = useState<string | null>(null);

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

  // Publish/draft toggle
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

  // Context menu handler for DayGrid student rows
  const handleStudentContextMenu = useCallback(
    (sd: StudentDay, action: ContextMenuAction) => {
      switch (action) {
        case 'special_needs':
          setDayAssignmentModal({ weekday: selectedWeekday, prefilledStudentId: sd.student_id });
          break;
        case 'absence': {
          // Cycle absence: none → full_day → none
          const currentAbsent = sd.absent_type || 'none';
          const next: AbsentType = currentAbsent === 'none' ? 'full_day' : 'none';
          handleSetAbsentType(sd.id, next);
          break;
        }
        case 'info':
          setStudentInfoId(sd.student_id);
          break;
      }
    },
    [selectedWeekday, handleSetAbsentType]
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

  // Pre-compute counts for each quick filter (shown as badges)
  const filterCounts = useMemo(() => {
    if (!dayData) return { missing_staff: 0, special_needs: 0, warnings: 0 };
    const all = dayData.student_days;
    const missing_staff = all.filter(sd => {
      const fmNeeded = needsFm(sd) && (!sd.fm_staff_id || absentStaffIds.has(sd.fm_staff_id));
      const emNeeded = needsEm(sd) && (!sd.em_staff_id || absentStaffIds.has(sd.em_staff_id));
      return fmNeeded || emNeeded;
    }).length;
    const special_needs = all.filter(sd => sd.has_care_needs).length;
    const warnings_count = all.filter(sd => warningStudentIds.has(sd.student_id)).length;
    return { missing_staff, special_needs, warnings: warnings_count };
  }, [dayData, absentStaffIds, warningStudentIds]);

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
    setAbsenceImpactDismissed(false);
    undoClear();
  }, [selectedWeekday, undoClear]);

  // Extract critical warnings for Zone B banner
  const criticalWarnings = useMemo(
    () => dayData?.warnings.filter(w => w.severity === 'error') ?? [],
    [dayData?.warnings]
  );

  return (
    <div className="min-h-screen">
      {/* ═══ ZONE A: Sticky PageToolbar ═══ */}
      <div className="sticky top-0 z-20 toolbar-glass no-print">
        <div className="max-w-7xl mx-auto">
          <PageToolbar
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
            selectedWeekday={selectedWeekday}
            onSelectWeekday={setSelectedWeekday}
            warningDays={warningDays}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
            classList={classList}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            onReset={handleResetFilters}
            resultCount={{ shown: filteredStudentDays.length, total: dayData?.student_days.length ?? 0 }}
            hasActiveFilters={hasActiveFilters}
            filterCounts={filterCounts}
            onAutoAssign={hasSchedule ? () => autoAssignDayMutation.mutate(selectedWeekday) : undefined}
            isAutoAssigning={autoAssignDayMutation.isPending}
            onSuggestAssignments={hasSchedule ? () => {
              suggestAssignmentsMutation.mutate(selectedWeekday);
              setShowSuggestModal(true);
            } : undefined}
            onOpenWizard={hasSchedule ? () => setShowWizard(true) : undefined}
            onPrint={() => window.print()}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-6 space-y-4 pt-4">
        {/* Real errors (not 404) */}
        {weekError && !weekLoading && (
          <ErrorMessage message={`Kunde inte hämta schema: ${getErrorMessage(weekError)}`} />
        )}
        {createWeekMutation.isError && (
          <ErrorMessage message={getErrorMessage(createWeekMutation.error)} />
        )}

        {/* ═══ ZONE B: Context Banners ═══ */}
        {hasSchedule && dayData && !dayLoading && (
          <div className="space-y-2 no-print">
            {/* Critical error banner */}
            {criticalWarnings.length > 0 && (
              <div className="rounded-2xl p-3 bg-danger-50 border border-danger-200 border-l-4 border-l-danger-500">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-danger-700">
                    {criticalWarnings.length} kritisk{criticalWarnings.length !== 1 ? 'a' : 't'} fel
                  </span>
                  <div className="flex flex-wrap gap-1.5 ml-2">
                    {criticalWarnings.slice(0, 3).map((w, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-danger-100 text-danger-700">
                        {w.message}
                      </span>
                    ))}
                    {criticalWarnings.length > 3 && (
                      <span className="text-xs text-danger-500">+{criticalWarnings.length - 3} till</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Absence impact banner (dismissable) */}
            {!absenceImpactDismissed && absenceImpact && absenceImpact.affected_students.length > 0 && (
              <AbsenceImpactPanel
                impact={absenceImpact}
                onDismiss={() => setAbsenceImpactDismissed(true)}
                onApplyReassignment={(studentId, period, staffId) => {
                  const sd = dayData.student_days.find(s => s.student_id === studentId);
                  if (sd) {
                    const field = period === 'fm' ? 'fm_staff_id' : 'em_staff_id';
                    updateStudentDayMutation.mutate({ sdId: sd.id, data: { [field]: staffId } });
                  }
                }}
                onApplyAll={(reassignments: SuggestedReassignment[]) => {
                  for (const r of reassignments) {
                    const sd = dayData.student_days.find(s => s.student_id === r.student_id);
                    if (sd) {
                      const field = r.period === 'fm' ? 'fm_staff_id' : 'em_staff_id';
                      updateStudentDayMutation.mutate({ sdId: sd.id, data: { [field]: r.suggested_staff_id } });
                    }
                  }
                }}
              />
            )}
          </div>
        )}

        {/* ═══ ZONE C: CompactWeekStrip ═══ */}
        {hasSchedule && (
          <CompactWeekStrip
            summary={weekSummary}
            selectedWeekday={selectedWeekday}
            onSelectDay={setSelectedWeekday}
          />
        )}

        {/* Day loading state */}
        {hasSchedule && dayLoading && (
          <div className="card py-12 text-center text-surface-400">Laddar dagdata...</div>
        )}

        {hasSchedule && dayData && !dayLoading && (
          <>
            {/* Print header — only visible when printing */}
            <div className="print-header hidden">
              Vecka {currentWeek}, {currentYear} — {DAY_NAMES[selectedWeekday]}
            </div>

            {/* ═══ ZONE D: DayGrid (main content) ═══ */}
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
              onStudentContextMenu={handleStudentContextMenu}
            />

            {/* ═══ ZONE E: Tabbed Analytics Panel ═══ */}
            <AnalyticsPanel
              studentDays={dayData.student_days}
              staffShifts={dayData.staff_shifts}
              onUpdateShift={handleUpdateShift}
              onStaffAbsence={(staffId, staffName) => setAbsenceModal({ staffId, staffName })}
              absentStaffIds={absentStaffIds}
              coverageSlots={coverageSlots}
              searchTerm={searchTerm}
              classBalance={classBalance}
              substituteReport={substituteReport}
              vulnerabilityMap={vulnerabilityMap}
              warnings={dayData.warnings}
              vulnerabilities={vulnerabilities?.vulnerabilities}
              staffWellbeing={staffWellbeing}
            />
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

      {/* ═══ Fixed overlays (outside scroll flow) ═══ */}

      {/* Bulk assign bar — fixed bottom */}
      <AnimatePresence>
        {selectedStudentDayIds.size > 0 && (
          <BulkAssignBar
            selectedCount={selectedStudentDayIds.size}
            staffList={staffList}
            onAssign={handleBulkAssign}
            onClear={() => setSelectedStudentDayIds(new Set())}
          />
        )}
      </AnimatePresence>

      {/* Day assignment modal */}
      {dayAssignmentModal && weekSchedule && (
        <DayAssignmentModal
          weekday={dayAssignmentModal.weekday}
          weekId={weekSchedule.id}
          staffList={staffList}
          studentDays={dayData?.student_days ?? []}
          existing={dayAssignmentModal.existing}
          prefilledStudentId={dayAssignmentModal.prefilledStudentId}
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

      {/* Student info slide-over */}
      <AnimatePresence>
        {studentInfoId && (
          <StudentInfoPanel
            studentId={studentInfoId}
            onClose={() => setStudentInfoId(null)}
          />
        )}
      </AnimatePresence>

      {/* Auto-suggest modal */}
      {showSuggestModal && (
        <AutoSuggestModal
          suggestions={suggestAssignmentsMutation.data?.suggestions ?? []}
          isLoading={suggestAssignmentsMutation.isPending}
          onApply={(suggestions: AssignmentSuggestion[]) => {
            for (const s of suggestions) {
              const field = s.period === 'fm' ? 'fm_staff_id' : 'em_staff_id';
              updateStudentDayMutation.mutate({ sdId: s.student_day_id, data: { [field]: s.suggested_staff_id } });
            }
            setShowSuggestModal(false);
          }}
          onClose={() => setShowSuggestModal(false)}
        />
      )}

      {/* Week planning wizard */}
      {showWizard && (
        <WeekPlanningWizard
          hasSchedule={hasSchedule}
          isPublished={weekSchedule?.status === 'published'}
          onClose={() => setShowWizard(false)}
          onCreateWeek={() => { handleCreateWeek(); setShowWizard(false); }}
          onCopyWeek={() => { handleCopyWeek(); setShowWizard(false); }}
          onAutoAssign={() => {
            for (let d = 0; d < 5; d++) autoAssignDayMutation.mutate(d);
            setShowWizard(false);
          }}
          onPublish={() => {
            if (weekSchedule) {
              updateWeekMutation.mutate({ weekId: weekSchedule.id, data: { status: 'published' } });
            }
            setShowWizard(false);
          }}
          onGoToStep={() => {
            setShowWizard(false);
          }}
          completedSteps={new Set(
            [
              hasSchedule ? 1 : null,
              weekSchedule?.status === 'published' ? 7 : null,
            ].filter((n): n is number => n !== null)
          )}
        />
      )}

      {/* Undo toast */}
      {undoStack.canUndo && undoStack.lastLabel && (
        <UndoToast label={undoStack.lastLabel} onUndo={undoStack.undo} />
      )}
    </div>
  );
}
