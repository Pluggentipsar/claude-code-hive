/**
 * QuickAbsenceModal — fast absence registration from the schedule view.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../../api/staff';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
import type { AbsenceReason } from '../../types';

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

interface QuickAbsenceModalProps {
  staffId: string;
  staffName: string;
  weekday: number;
  year: number;
  week: number;
  onClose: () => void;
}

function getDateForWeekday(year: number, week: number, weekday: number): string {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  const target = new Date(monday);
  target.setDate(monday.getDate() + weekday);
  return target.toISOString().split('T')[0];
}

export function QuickAbsenceModal({
  staffId,
  staffName,
  weekday,
  year,
  week,
  onClose,
}: QuickAbsenceModalProps) {
  const qc = useQueryClient();
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState<AbsenceReason>('sick');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const absenceDate = getDateForWeekday(year, week, weekday);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await staffApi.createAbsence(staffId, {
        absence_date: absenceDate,
        start_time: isFullDay ? undefined : startTime,
        end_time: isFullDay ? undefined : endTime,
        reason,
      });
      qc.invalidateQueries({ queryKey: ['dayData'] });
      qc.invalidateQueries({ queryKey: ['warnings'] });
      qc.invalidateQueries({ queryKey: ['weekSummary'] });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Kunde inte registrera frånvaro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="border-b border-surface-100 pb-4">
          <h2 className="text-lg font-semibold text-surface-900">Snabbfrånvaro</h2>
          <p className="text-sm text-surface-500 mt-1">
            {staffName} &mdash; {DAY_NAMES[weekday]} ({absenceDate})
          </p>
        </div>

        {/* Full day toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isFullDay}
            onChange={(e) => setIsFullDay(e.target.checked)}
            className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
          />
          <span className="text-sm font-medium text-surface-700">Heldag</span>
        </label>

        {/* Time selection */}
        {!isFullDay && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Från</label>
              <input
                type="time"
                required={!isFullDay}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-base tabular-nums"
              />
            </div>
            <div>
              <label className="label">Till</label>
              <input
                type="time"
                required={!isFullDay}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-base tabular-nums"
              />
            </div>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="label">Orsak</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as AbsenceReason)}
            className="input-base"
          >
            <option value="sick">Sjuk</option>
            <option value="vacation">Semester</option>
            <option value="training">Utbildning</option>
            <option value="other">Övrigt</option>
          </select>
        </div>

        {error && (
          <div className="text-sm text-danger-600 bg-danger-50 rounded-xl p-3">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-3 border-t border-surface-100">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Avbryt
          </Button>
          <Button type="submit" variant="danger" className="flex-1" disabled={isSubmitting} isLoading={isSubmitting}>
            Registrera frånvaro
          </Button>
        </div>
      </form>
    </Modal>
  );
}
