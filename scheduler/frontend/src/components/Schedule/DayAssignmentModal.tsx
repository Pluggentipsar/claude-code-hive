/**
 * DayAssignmentModal — create/edit special needs assignments (KTS).
 */

import { useState } from 'react';
import type { Staff } from '../../types';
import type {
  StudentDay,
  DayAssignment,
  DayAssignmentCreate,
  DayAssignmentUpdate,
  DayAssignmentRole,
} from '../../types/weekSchedule';

interface DayAssignmentModalProps {
  weekday: number;
  weekId: string;
  staffList: Staff[];
  studentDays: StudentDay[];
  existing?: DayAssignment;
  onSave: (data: DayAssignmentCreate | DayAssignmentUpdate) => void;
  onClose: () => void;
}

const ROLE_OPTIONS: { value: DayAssignmentRole; label: string }[] = [
  { value: 'school_support', label: 'Skolst\u00f6d' },
  { value: 'double_staffing', label: 'Dubbelbemanning' },
  { value: 'extra_care', label: 'Extra omsorg' },
];

export function DayAssignmentModal({
  weekday,
  weekId: _weekId,
  staffList,
  studentDays,
  existing,
  onSave,
  onClose,
}: DayAssignmentModalProps) {
  const isEdit = !!existing;

  // Build list of students with care needs (or all if editing)
  const careStudents = studentDays
    .filter((sd, idx, arr) => {
      // Deduplicate by student_id
      return arr.findIndex(s => s.student_id === sd.student_id) === idx;
    })
    .filter(sd => sd.has_care_needs || (existing && sd.student_id === existing.student_id));

  const [studentId, setStudentId] = useState(existing?.student_id || '');
  const [staffId, setStaffId] = useState(existing?.staff_id || '');
  const [startTime, setStartTime] = useState(existing?.start_time || '08:00');
  const [endTime, setEndTime] = useState(existing?.end_time || '16:00');
  const [role, setRole] = useState<DayAssignmentRole>(existing?.role || 'school_support');
  const [notes, setNotes] = useState(existing?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const data: DayAssignmentUpdate = {
        staff_id: staffId,
        start_time: startTime,
        end_time: endTime,
        role,
        notes: notes || undefined,
      };
      onSave(data);
    } else {
      const data: DayAssignmentCreate = {
        student_id: studentId,
        staff_id: staffId,
        weekday,
        start_time: startTime,
        end_time: endTime,
        role,
        notes: notes || undefined,
      };
      onSave(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Redigera KTS-tilldelning' : 'Ny KTS-tilldelning'}
            </h2>
          </div>

          {/* Student (only for create) */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Elev *</label>
              <select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">V\u00e4lj elev...</option>
                {careStudents.map(sd => (
                  <option key={sd.student_id} value={sd.student_id}>
                    {sd.student_name} ({sd.class_name || 'Utan klass'})
                  </option>
                ))}
              </select>
              {careStudents.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Inga elever med specialbehov hittades.</p>
              )}
            </div>
          )}

          {isEdit && existing && (
            <div className="text-sm text-gray-600">
              Elev: <span className="font-medium">{existing.student_name}</span>
            </div>
          )}

          {/* Staff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personal *</label>
            <select
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">V\u00e4lj personal...</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starttid *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll *</label>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value as DayAssignmentRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anteckning</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Valfri anteckning..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEdit ? 'Spara' : 'Skapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
