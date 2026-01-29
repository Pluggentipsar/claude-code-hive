/**
 * Staff Schedule View - Individual staff member's weekly schedule
 */

import { useState, useMemo } from 'react';
import type { ScheduleDetail } from '../../types';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '../../api/students';
import { staffApi } from '../../api/staff';
import { WEEKDAY_NAMES } from '../../utils/dateHelpers';

interface StaffScheduleViewProps {
  schedule: ScheduleDetail | null;
  isLoading?: boolean;
  showSchool: boolean;
  showFritids: boolean;
}

export function StaffScheduleView({
  schedule,
  isLoading,
  showSchool,
  showFritids,
}: StaffScheduleViewProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Fetch all data
  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: staffApi.getAll,
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: studentsApi.getAll,
  });

  // Auto-select first staff if none selected
  useMemo(() => {
    if (staff && staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id);
    }
  }, [staff, selectedStaffId]);

  // Get assignments for selected staff
  const staffAssignments = useMemo(() => {
    if (!schedule?.assignments || !selectedStaffId) return [];

    return schedule.assignments.filter((a) => a.staff_id === selectedStaffId);
  }, [schedule, selectedStaffId]);

  // Group by weekday
  const assignmentsByDay = useMemo(() => {
    const grouped: Record<number, typeof staffAssignments> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
    };

    staffAssignments.forEach((assignment) => {
      if (assignment.weekday >= 0 && assignment.weekday <= 4) {
        grouped[assignment.weekday].push(assignment);
      }
    });

    // Sort by start time
    Object.keys(grouped).forEach((day) => {
      grouped[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  }, [staffAssignments]);

  // Calculate total work hours
  const totalHours = useMemo(() => {
    let minutes = 0;

    staffAssignments.forEach((assignment) => {
      const [startHour, startMin] = assignment.start_time.split(':').map(Number);
      const [endHour, endMin] = assignment.end_time.split(':').map(Number);

      const start = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;

      minutes += end - start;
    });

    return (minutes / 60).toFixed(1);
  }, [staffAssignments]);

  if (isLoading || !staff || !students) {
    return <LoadingSpinner />;
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Inget schema att visa. Generera ett nytt schema.</p>
      </div>
    );
  }

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  return (
    <div className="space-y-4">
      {/* Staff selector */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Personal:</label>
          <select
            value={selectedStaffId || ''}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name} ({member.role})
              </option>
            ))}
          </select>
        </div>

        {selectedStaff && (
          <div className="text-sm text-gray-600">
            Total arbetstid: <span className="font-bold text-gray-900">{totalHours}h</span>
          </div>
        )}
      </div>

      {/* Weekly schedule */}
      {selectedStaff && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4">
            <h2 className="text-xl font-bold">
              {selectedStaff.first_name} {selectedStaff.last_name}
            </h2>
            <p className="text-sm text-primary-100 mt-1">
              {selectedStaff.role} • {staffAssignments.length} tilldelningar
            </p>
            {selectedStaff.care_certifications.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedStaff.care_certifications.map((cert) => (
                  <span key={cert} className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded">
                    ⚕️ {cert}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule grid */}
          <div className="divide-y divide-gray-200">
            {WEEKDAY_NAMES.slice(0, 5).map((day, weekday) => {
              const dayAssignments = assignmentsByDay[weekday] || [];

              return (
                <div key={day} className="p-4">
                  <div className="flex items-start">
                    <div className="w-32 flex-shrink-0">
                      <div className="font-semibold text-gray-900">{day}</div>
                      <div className="text-xs text-gray-500">
                        {dayAssignments.length} pass
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      {dayAssignments.length > 0 ? (
                        dayAssignments.map((assignment) => {
                          const student = assignment.student_id
                            ? students.find((s) => s.id === assignment.student_id)
                            : null;

                          return (
                            <div
                              key={assignment.id}
                              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">
                                  {assignment.start_time} - {assignment.end_time}
                                </div>
                                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {assignment.assignment_type}
                                </span>
                              </div>

                              {student && (
                                <div className="mt-2 text-sm text-gray-600">
                                  Elev: {student.first_name} {student.last_name}
                                  {student.requires_double_staffing && (
                                    <span className="ml-2 text-xs text-blue-600">
                                      👥 Dubbelbemanning
                                    </span>
                                  )}
                                </div>
                              )}

                              {assignment.notes && (
                                <div className="mt-1 text-xs text-gray-500">{assignment.notes}</div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-gray-400 py-4">Ingen arbetstid denna dag</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
