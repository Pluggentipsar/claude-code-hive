/**
 * Single day detailed view
 */

import { useMemo } from 'react';
import type { Assignment } from '../../types';
import { getWeekdayName, timeToMinutes } from '../../utils/dateHelpers';
import { AssignmentCard } from './AssignmentCard';

interface DayViewProps {
  weekday: number;
  assignments: Assignment[];
  onAssignmentClick?: (assignment: Assignment) => void;
}

export function DayView({ weekday, assignments, onAssignmentClick }: DayViewProps) {
  // Filter and sort assignments for this day
  const dayAssignments = useMemo(() => {
    return assignments
      .filter((a) => a.weekday === weekday)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }, [assignments, weekday]);

  // Group assignments by hour for timeline view
  const assignmentsByHour = useMemo(() => {
    const grouped: Record<number, Assignment[]> = {};

    dayAssignments.forEach((assignment) => {
      const hour = parseInt(assignment.start_time.split(':')[0]);
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(assignment);
    });

    return grouped;
  }, [dayAssignments]);

  // Calculate time range
  const timeRange = useMemo(() => {
    if (dayAssignments.length === 0) {
      return { start: 6, end: 18 }; // Default: 06:00 - 18:00
    }

    let earliest = 24;
    let latest = 0;

    dayAssignments.forEach((assignment) => {
      const startHour = parseInt(assignment.start_time.split(':')[0]);
      const endHour = parseInt(assignment.end_time.split(':')[0]);

      if (startHour < earliest) earliest = startHour;
      if (endHour > latest) latest = endHour;
    });

    return {
      start: Math.max(0, earliest - 1),
      end: Math.min(23, latest + 1),
    };
  }, [dayAssignments]);

  const hours = Array.from(
    { length: timeRange.end - timeRange.start + 1 },
    (_, i) => timeRange.start + i
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4">
        <h2 className="text-2xl font-bold">{getWeekdayName(weekday)}</h2>
        <p className="text-sm text-primary-100 mt-1">
          {dayAssignments.length} tilldelningar
        </p>
      </div>

      {/* Timeline view */}
      <div className="p-6 space-y-6">
        {hours.map((hour) => (
          <div key={hour} className="flex">
            {/* Time marker */}
            <div className="w-20 flex-shrink-0 text-right pr-4 pt-1">
              <span className="text-sm font-semibold text-gray-600">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>

            {/* Hour content */}
            <div className="flex-1 border-l-2 border-gray-300 pl-4 pb-4 relative">
              {/* Assignments in this hour */}
              {assignmentsByHour[hour] && assignmentsByHour[hour].length > 0 ? (
                <div className="space-y-2">
                  {assignmentsByHour[hour].map((assignment) => (
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
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-sm italic py-2">Inga tilldelningar</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {dayAssignments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Inga tilldelningar för {getWeekdayName(weekday).toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  );
}
