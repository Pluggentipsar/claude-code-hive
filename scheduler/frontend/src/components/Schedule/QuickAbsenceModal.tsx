/**
 * QuickAbsenceModal — fast absence registration from the schedule view.
 * Opens from StaffShiftTable when clicking on a staff name.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../../api/staff';
import type { AbsenceReason } from '../../types';

const DAY_NAMES = ['M\u00e5ndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

interface QuickAbsenceModalProps {
  staffId: string;
  staffName: string;
  weekday: number;
  year: number;
  week: number;
  onClose: () => void;
}

function getDateForWeekday(year: number, week: number, weekday: number): string {
  // ISO week date calculation
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
      // Invalidate day data so warnings update
      qc.invalidateQueries({ queryKey: ['dayData'] });
      qc.invalidateQueries({ queryKey: ['warnings'] });
      qc.invalidateQueries({ queryKey: ['weekSummary'] });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Kunde inte registrera fr\u00e5nvaro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">Snabbfr\u00e5nvaro</h2>
            <p className="text-sm text-gray-600 mt-1">
              {staffName} &mdash; {DAY_NAMES[weekday]} ({absenceDate})
            </p>
          </div>

          {/* Full day toggle */}
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Heldag</span>
          </label>

          {/* Time selection */}
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fr\u00e5n</label>
                <input
                  type="time"
                  required={!isFullDay}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Till</label>
                <input
                  type="time"
                  required={!isFullDay}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orsak</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AbsenceReason)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="sick">Sjuk</option>
              <option value="vacation">Semester</option>
              <option value="training">Utbildning</option>
              <option value="other">\u00d6vrigt</option>
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Sparar...' : 'Registrera fr\u00e5nvaro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
