/**
 * Overview View - Helicopter view of entire schedule
 */

import { useMemo } from 'react';
import type { ScheduleDetail, Assignment } from '../../types';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '../../api/students';
import { staffApi } from '../../api/staff';
import { WEEKDAY_NAMES } from '../../utils/dateHelpers';

interface OverviewViewProps {
  schedule: ScheduleDetail | null;
  isLoading?: boolean;
  showSchool: boolean;
  showFritids: boolean;
}

export function OverviewView({ schedule, isLoading, showSchool, showFritids }: OverviewViewProps) {
  // Fetch all students and staff for context
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: studentsApi.getAll,
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: staffApi.getAll,
  });

  // Filter assignments by type
  const filteredAssignments = useMemo(() => {
    if (!schedule?.assignments) return [];

    return schedule.assignments.filter((a) => {
      // TODO: Add actual logic to determine if assignment is school or fritids
      // For now, show all if both filters are active
      if (showSchool && showFritids) return true;
      if (!showSchool && !showFritids) return false;

      // This will need proper classification logic based on assignment times
      return true;
    });
  }, [schedule, showSchool, showFritids]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!schedule || !students || !staff) return null;

    const totalAssignments = filteredAssignments.length;
    const uniqueStaff = new Set(filteredAssignments.map((a) => a.staff_id)).size;
    const uniqueStudents = new Set(
      filteredAssignments.filter((a) => a.student_id).map((a) => a.student_id)
    ).size;

    // Group by weekday
    const byWeekday = WEEKDAY_NAMES.map((day, index) => ({
      day,
      count: filteredAssignments.filter((a) => a.weekday === index).length,
    }));

    return {
      totalAssignments,
      uniqueStaff,
      uniqueStudents,
      byWeekday,
      totalStaff: staff.length,
      totalStudents: students.length,
    };
  }, [schedule, students, staff, filteredAssignments]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!schedule || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Inget schema att visa. Generera ett nytt schema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Totalt tilldelningar</div>
          <div className="mt-2 text-3xl font-bold text-primary-600">{stats.totalAssignments}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Aktiv personal</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {stats.uniqueStaff}/{stats.totalStaff}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Täckta elever</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {stats.uniqueStudents}/{stats.totalStudents}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Kvalitet</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {schedule.soft_constraints_score?.toFixed(0) || 'N/A'}
          </div>
        </div>
      </div>

      {/* Per weekday breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Tilldelningar per dag</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.byWeekday.map((day) => (
              <div key={day.day} className="flex items-center">
                <div className="w-32 text-sm font-medium text-gray-700">{day.day}</div>
                <div className="flex-1">
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary-600 rounded-lg transition-all"
                      style={{
                        width: `${(day.count / stats.totalAssignments) * 100}%`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700">
                      {day.count} tilldelningar
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule metadata */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Schemadetaljer</h3>
        </div>
        <div className="p-6 grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-gray-600">Status</div>
            <div className="mt-1 text-base font-medium text-gray-900">{schedule.solver_status}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Beräkningstid</div>
            <div className="mt-1 text-base font-medium text-gray-900">
              {schedule.solve_time_ms ? `${(schedule.solve_time_ms / 1000).toFixed(2)}s` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Hårda villkor</div>
            <div className="mt-1 text-base font-medium">
              {schedule.hard_constraints_met ? (
                <span className="text-green-600">✓ Uppfyllda</span>
              ) : (
                <span className="text-red-600">✗ Ej uppfyllda</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Publicerad</div>
            <div className="mt-1 text-base font-medium">
              {schedule.is_published ? (
                <span className="text-green-600">✓ Ja</span>
              ) : (
                <span className="text-gray-600">○ Nej</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
