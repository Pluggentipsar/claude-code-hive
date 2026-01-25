/**
 * Weekly schedule view - Calendar layout
 */

import { useMemo } from 'react';
import type { ScheduleDetail, Assignment } from '../../types';
import { WEEKDAY_NAMES, timeToMinutes } from '../../utils/dateHelpers';
import { AssignmentCard } from './AssignmentCard';
import { LoadingSpinner } from '../Common/LoadingSpinner';

interface WeekViewProps {
  schedule: ScheduleDetail | null;
  isLoading?: boolean;
  onAssignmentClick?: (assignment: Assignment) => void;
}

export function WeekView({ schedule, isLoading, onAssignmentClick }: WeekViewProps) {
  // Group assignments by weekday
  const assignmentsByDay = useMemo(() => {
    if (!schedule?.assignments) return {};

    const grouped: Record<number, Assignment[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };

    schedule.assignments.forEach((assignment) => {
      if (assignment.weekday >= 0 && assignment.weekday <= 4) {
        grouped[assignment.weekday].push(assignment);
      }
    });

    // Sort assignments by start time within each day
    Object.keys(grouped).forEach((day) => {
      grouped[Number(day)].sort((a, b) => {
        const aTime = timeToMinutes(a.start_time);
        const bTime = timeToMinutes(b.start_time);
        return aTime - bTime;
      });
    });

    return grouped;
  }, [schedule]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Inget schema att visa. Generera ett nytt schema.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              📅 Vecka {schedule.week_number}, {schedule.year}
            </h2>
            <p className="text-sm text-primary-100 mt-1">
              {schedule.assignments.length} tilldelningar
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              {schedule.hard_constraints_met ? (
                <span className="px-3 py-1 bg-green-500 rounded-full text-sm">
                  ✓ Giltigt schema
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-500 rounded-full text-sm">
                  ⚠️ Konflikter
                </span>
              )}
            </div>
            {schedule.soft_constraints_score !== null && (
              <p className="text-xs text-primary-100 mt-1">
                Kvalitet: {schedule.soft_constraints_score.toFixed(1)}/100
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Week grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Weekday headers */}
          <div className="grid grid-cols-5 border-b border-gray-200">
            {WEEKDAY_NAMES.map((day, index) => (
              <div
                key={day}
                className="p-4 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
              >
                {day}
                <span className="block text-xs text-gray-500 mt-1">
                  {assignmentsByDay[index]?.length || 0} tilldelningar
                </span>
              </div>
            ))}
          </div>

          {/* Assignment columns */}
          <div className="grid grid-cols-5">
            {[0, 1, 2, 3, 4].map((weekday) => (
              <div
                key={weekday}
                className="border-r border-gray-200 last:border-r-0 min-h-[400px] p-3 space-y-2 bg-gray-50"
              >
                {assignmentsByDay[weekday]?.length > 0 ? (
                  assignmentsByDay[weekday].map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      staffName={`Personal ${assignment.staff_id.slice(0, 8)}...`}
                      studentName={
                        assignment.student_id
                          ? `Elev ${assignment.student_id.slice(0, 8)}...`
                          : undefined
                      }
                      onClick={() => onAssignmentClick?.(assignment)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Inga tilldelningar
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">Status:</span> {schedule.solver_status}
          </div>
          {schedule.solve_time_ms && (
            <div>
              <span className="font-medium">Beräkningstid:</span>{' '}
              {(schedule.solve_time_ms / 1000).toFixed(2)}s
            </div>
          )}
          {schedule.is_published && (
            <div className="flex items-center text-green-600">
              <span>✓ Publicerat</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
