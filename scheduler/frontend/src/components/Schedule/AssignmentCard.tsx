/**
 * Card showing a single staff assignment
 */

import type { Assignment } from '../../types';
import { formatTimeRange } from '../../utils/dateHelpers';

interface AssignmentCardProps {
  assignment: Assignment;
  staffName?: string;
  studentName?: string;
  className?: string;
  onClick?: () => void;
}

export function AssignmentCard({
  assignment,
  staffName = 'Okänd personal',
  studentName,
  className = '',
  onClick,
}: AssignmentCardProps) {
  // Color coding based on assignment type
  const getTypeColor = () => {
    switch (assignment.assignment_type) {
      case 'one_to_one':
        return 'bg-blue-100 border-blue-300';
      case 'class_coverage':
        return 'bg-green-100 border-green-300';
      case 'leisure':
        return 'bg-purple-100 border-purple-300';
      case 'double_staffing':
        return 'bg-orange-100 border-orange-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  // Icon based on assignment type
  const getTypeIcon = () => {
    switch (assignment.assignment_type) {
      case 'one_to_one':
        return '👤';
      case 'class_coverage':
        return '📚';
      case 'leisure':
        return '🎨';
      case 'double_staffing':
        return '👥';
      default:
        return '📋';
    }
  };

  // Swedish labels
  const getTypeLabel = () => {
    switch (assignment.assignment_type) {
      case 'one_to_one':
        return '1:1';
      case 'class_coverage':
        return 'Klasstäckning';
      case 'leisure':
        return 'Fritids';
      case 'double_staffing':
        return 'Dubbelbemanning';
      default:
        return assignment.assignment_type;
    }
  };

  return (
    <div
      className={`
        rounded-lg border-2 p-3 shadow-sm transition-shadow hover:shadow-md
        ${getTypeColor()}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{getTypeIcon()}</span>
            <div>
              <p className="font-semibold text-gray-900">{staffName}</p>
              {studentName && (
                <p className="text-sm text-gray-600">→ {studentName}</p>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center space-x-3 text-sm text-gray-600">
            <span className="font-medium">
              {formatTimeRange(assignment.start_time, assignment.end_time)}
            </span>
            <span className="text-xs px-2 py-0.5 bg-white rounded-full">
              {getTypeLabel()}
            </span>
          </div>

          {assignment.is_manual_override && (
            <div className="mt-2 flex items-center text-xs text-yellow-700">
              <span>⚠️ Manuell ändring</span>
            </div>
          )}

          {assignment.notes && (
            <p className="mt-2 text-xs text-gray-500 italic">{assignment.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
