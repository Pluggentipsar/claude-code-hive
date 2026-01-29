/**
 * Student Schedule View - Individual student's weekly schedule
 */

import { useState, useMemo } from 'react';
import type { ScheduleDetail } from '../../types';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '../../api/students';
import { staffApi } from '../../api/staff';
import { WEEKDAY_NAMES } from '../../utils/dateHelpers';

interface StudentScheduleViewProps {
  schedule: ScheduleDetail | null;
  isLoading?: boolean;
  showSchool: boolean;
  showFritids: boolean;
}

export function StudentScheduleView({
  schedule,
  isLoading,
  showSchool,
  showFritids,
}: StudentScheduleViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Fetch all data
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: studentsApi.getAll,
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: staffApi.getAll,
  });

  // Auto-select first student if none selected
  useMemo(() => {
    if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  // Get assignments for selected student
  const studentAssignments = useMemo(() => {
    if (!schedule?.assignments || !selectedStudentId) return [];

    return schedule.assignments.filter((a) => a.student_id === selectedStudentId);
  }, [schedule, selectedStudentId]);

  // Group by weekday
  const assignmentsByDay = useMemo(() => {
    const grouped: Record<number, typeof studentAssignments> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
    };

    studentAssignments.forEach((assignment) => {
      if (assignment.weekday >= 0 && assignment.weekday <= 4) {
        grouped[assignment.weekday].push(assignment);
      }
    });

    // Sort by start time
    Object.keys(grouped).forEach((day) => {
      grouped[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  }, [studentAssignments]);

  if (isLoading || !students || !staff) {
    return <LoadingSpinner />;
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Inget schema att visa. Generera ett nytt schema.</p>
      </div>
    );
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-4">
      {/* Student selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Elev:</label>
          <select
            value={selectedStudentId || ''}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} (Årskurs {student.grade})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly schedule */}
      {selectedStudent && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4">
            <h2 className="text-xl font-bold">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </h2>
            <p className="text-sm text-primary-100 mt-1">
              Årskurs {selectedStudent.grade} • {studentAssignments.length} tilldelningar
            </p>

            {/* Care requirements */}
            {selectedStudent.has_care_needs && (
              <div className="mt-2">
                <div className="text-xs text-primary-100 mb-1">Särskilda behov:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedStudent.care_requirements?.map((req) => (
                    <span key={req} className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded">
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedStudent.requires_double_staffing && (
              <div className="mt-2 text-sm text-primary-100">👥 Kräver dubbelbemanning</div>
            )}
          </div>

          {/* Schedule grid */}
          <div className="divide-y divide-gray-200">
            {WEEKDAY_NAMES.slice(0, 5).map((day, weekday) => {
              const dayAssignments = assignmentsByDay[weekday] || [];
              const careTime = selectedStudent.care_times.find((ct) => ct.weekday === weekday);

              return (
                <div key={day} className="p-4">
                  <div className="flex items-start">
                    <div className="w-32 flex-shrink-0">
                      <div className="font-semibold text-gray-900">{day}</div>
                      {careTime && (
                        <div className="text-xs text-gray-500 mt-1">
                          Omsorg: {careTime.start_time} - {careTime.end_time}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      {dayAssignments.length > 0 ? (
                        dayAssignments.map((assignment) => {
                          const staffMember = staff.find((s) => s.id === assignment.staff_id);

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

                              {staffMember && (
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="text-sm text-gray-600">
                                    Personal: {staffMember.first_name} {staffMember.last_name}
                                  </div>

                                  {staffMember.care_certifications.length > 0 && (
                                    <div className="flex gap-1">
                                      {staffMember.care_certifications.map((cert) => (
                                        <span
                                          key={cert}
                                          className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded"
                                        >
                                          ⚕️ {cert}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : careTime ? (
                        <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                          <div className="text-sm text-red-600">
                            ⚠️ Ingen personal tilldelad för {careTime.start_time} -{' '}
                            {careTime.end_time}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 py-4">Ingen omsorgstid denna dag</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <div className="text-sm text-gray-600">
              <strong>Totalt:</strong> {studentAssignments.length} tilldelningar under veckan
            </div>
            {studentAssignments.length === 0 && (
              <div className="mt-2 text-sm text-red-600">
                ⚠️ Eleven har inga tilldelningar denna vecka - kontrollera schemat
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
