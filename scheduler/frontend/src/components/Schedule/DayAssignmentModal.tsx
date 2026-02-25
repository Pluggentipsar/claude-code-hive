/**
 * DayAssignmentModal — create/edit special needs assignments (KTS).
 */

import { useState } from 'react';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
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
  prefilledStudentId?: string;
  onSave: (data: DayAssignmentCreate | DayAssignmentUpdate) => void;
  onClose: () => void;
}

const ROLE_OPTIONS: { value: DayAssignmentRole; label: string }[] = [
  { value: 'school_support', label: 'Skolstöd' },
  { value: 'double_staffing', label: 'Dubbelbemanning' },
  { value: 'extra_care', label: 'Extra omsorg' },
];

export function DayAssignmentModal({
  weekday,
  weekId: _weekId,
  staffList,
  studentDays,
  existing,
  prefilledStudentId,
  onSave,
  onClose,
}: DayAssignmentModalProps) {
  const isEdit = !!existing;

  // When prefilledStudentId is provided, show ALL students; otherwise only care_needs
  const uniqueStudents = studentDays.filter(
    (sd, idx, arr) => arr.findIndex(s => s.student_id === sd.student_id) === idx
  );
  const careStudents = prefilledStudentId
    ? uniqueStudents
    : uniqueStudents.filter(sd => sd.has_care_needs || (existing && sd.student_id === existing.student_id));

  const [studentId, setStudentId] = useState(existing?.student_id || prefilledStudentId || '');
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
    <Modal open onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="border-b border-surface-100 pb-4">
          <h2 className="text-lg font-semibold text-surface-900">
            {isEdit ? 'Redigera KTS-tilldelning' : 'Ny KTS-tilldelning'}
          </h2>
        </div>

        {/* Student (only for create) */}
        {!isEdit && (
          <div>
            <label className="label">Elev *</label>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="input-base"
            >
              <option value="">Välj elev...</option>
              {careStudents.map(sd => (
                <option key={sd.student_id} value={sd.student_id}>
                  {sd.student_name} ({sd.class_name || 'Utan klass'})
                </option>
              ))}
            </select>
            {careStudents.length === 0 && (
              <p className="text-xs text-surface-400 mt-1">Inga elever med specialbehov hittades.</p>
            )}
          </div>
        )}

        {isEdit && existing && (
          <div className="text-sm text-surface-600">
            Elev: <span className="font-medium text-surface-900">{existing.student_name}</span>
          </div>
        )}

        {/* Staff */}
        <div>
          <label className="label">Personal *</label>
          <select
            required
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="input-base"
          >
            <option value="">Välj personal...</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Starttid *</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-base tabular-nums"
            />
          </div>
          <div>
            <label className="label">Sluttid *</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input-base tabular-nums"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="label">Roll *</label>
          <select
            required
            value={role}
            onChange={(e) => setRole(e.target.value as DayAssignmentRole)}
            className="input-base"
          >
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Anteckning</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Valfri anteckning..."
            className="input-base"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-3 border-t border-surface-100">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            {isEdit ? 'Spara' : 'Skapa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
