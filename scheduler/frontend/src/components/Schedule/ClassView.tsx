/**
 * Class View - Staff and students per class (Excel-like layout)
 */

import { useState, useMemo } from 'react';
import type { ScheduleDetail, Assignment } from '../../types';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '../../api/students';
import { staffApi } from '../../api/staff';
import { classesApi } from '../../api/classes';
import { WEEKDAY_NAMES } from '../../utils/dateHelpers';

interface ClassViewProps {
  schedule: ScheduleDetail | null;
  isLoading?: boolean;
  showSchool: boolean;
  showFritids: boolean;
}

export function ClassView({ schedule, isLoading, showSchool, showFritids }: ClassViewProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(0); // Monday by default

  // Fetch all data
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: studentsApi.getAll,
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: staffApi.getAll,
  });

  // Auto-select first class if none selected
  useMemo(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Get students in selected class
  const classStudents = useMemo(() => {
    if (!students || !selectedClassId) return [];
    return students.filter((s) => s.class_id === selectedClassId);
  }, [students, selectedClassId]);

  // Get staff assignments for this class and weekday
  const classAssignments = useMemo(() => {
    if (!schedule?.assignments || !selectedClassId) return [];

    return schedule.assignments.filter(
      (a) => a.class_id === selectedClassId && a.weekday === selectedWeekday
    );
  }, [schedule, selectedClassId, selectedWeekday]);

  // Group assignments by staff
  const staffAssignments = useMemo(() => {
    if (!staff) return new Map();

    const grouped = new Map<string, Assignment[]>();

    classAssignments.forEach((assignment) => {
      const existing = grouped.get(assignment.staff_id) || [];
      grouped.set(assignment.staff_id, [...existing, assignment]);
    });

    return grouped;
  }, [classAssignments, staff]);

  // Group assignments by student
  const studentAssignments = useMemo(() => {
    const grouped = new Map<string, Assignment[]>();

    classAssignments.forEach((assignment) => {
      if (assignment.student_id) {
        const existing = grouped.get(assignment.student_id) || [];
        grouped.set(assignment.student_id, [...existing, assignment]);
      }
    });

    return grouped;
  }, [classAssignments]);

  if (isLoading || !classes || !students || !staff) {
    return <LoadingSpinner />;
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Inget schema att visa. Generera ett nytt schema.</p>
      </div>
    );
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-4">
      {/* Class and weekday selectors */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Klass:</label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {WEEKDAY_NAMES.map((day, index) => (
            <button
              key={day}
              onClick={() => setSelectedWeekday(index)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedWeekday === index
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Excel-like layout */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600 text-white p-4">
          <h2 className="text-xl font-bold">
            {selectedClass?.name} - {WEEKDAY_NAMES[selectedWeekday]}
          </h2>
          <p className="text-sm text-primary-100 mt-1">
            {classStudents.length} elever • {staffAssignments.size} personal
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-gray-200">
          {/* Left side: Staff (like Excel "Stämman lag") */}
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">👥</span>
              Personal
            </h3>

            <div className="space-y-3">
              {Array.from(staffAssignments.entries()).map(([staffId, assignments]) => {
                const staffMember = staff.find((s) => s.id === staffId);
                if (!staffMember) return null;

                // Sort assignments by start time
                const sortedAssignments = [...assignments].sort((a, b) =>
                  a.start_time.localeCompare(b.start_time)
                );

                return (
                  <div key={staffId} className="border border-gray-200 rounded-lg p-3">
                    <div className="font-medium text-gray-900 mb-2">
                      {staffMember.first_name} {staffMember.last_name}
                    </div>

                    <div className="space-y-1 text-sm">
                      {sortedAssignments.map((assignment) => {
                        const student = assignment.student_id
                          ? students.find((s) => s.id === assignment.student_id)
                          : null;

                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded"
                          >
                            <span className="text-gray-600">
                              {assignment.start_time} - {assignment.end_time}
                            </span>
                            <span className="text-gray-900 font-medium">
                              {student
                                ? `${student.first_name} ${student.last_name}`
                                : 'Klasstid'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {staffMember.care_certifications.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
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
                );
              })}

              {staffAssignments.size === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Ingen personal schemalagd denna dag
                </div>
              )}
            </div>
          </div>

          {/* Right side: Students (like Excel "Edil A") */}
          <div className="p-6 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">👶</span>
              Elever
            </h3>

            <div className="space-y-2">
              {classStudents.map((student) => {
                const assignments = studentAssignments.get(student.id) || [];

                // Get care time for this weekday
                const careTime = student.care_times.find((ct) => ct.weekday === selectedWeekday);

                return (
                  <div
                    key={student.id}
                    className={`border rounded-lg p-3 ${
                      assignments.length > 0
                        ? 'bg-white border-gray-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </div>
                      {careTime && (
                        <div className="text-sm text-gray-600">
                          {careTime.start_time} - {careTime.end_time}
                        </div>
                      )}
                    </div>

                    {/* Assigned staff */}
                    {assignments.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {assignments.map((assignment) => {
                          const staffMember = staff.find((s) => s.id === assignment.staff_id);
                          return (
                            <div
                              key={assignment.id}
                              className="text-sm flex items-center justify-between py-1 px-2 bg-gray-100 rounded"
                            >
                              <span className="text-gray-600">
                                {assignment.start_time} - {assignment.end_time}
                              </span>
                              <span className="text-gray-900">
                                {staffMember
                                  ? `${staffMember.first_name} ${staffMember.last_name}`
                                  : 'Okänd'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-red-600">⚠️ Ingen personal tilldelad</div>
                    )}

                    {/* Care requirements */}
                    {student.has_care_needs && student.care_requirements && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {student.care_requirements.map((req) => (
                          <span
                            key={req}
                            className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    )}

                    {student.requires_double_staffing && (
                      <div className="mt-1 text-xs text-blue-600">👥 Dubbelbemanning krävs</div>
                    )}
                  </div>
                );
              })}

              {classStudents.length === 0 && (
                <div className="text-center py-8 text-gray-400">Inga elever i denna klass</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
