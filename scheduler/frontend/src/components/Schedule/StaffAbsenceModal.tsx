/**
 * StaffAbsenceModal — full-featured absence registration from schedule view.
 * Supports full-day, partial-day (time range), and multi-day (date range) absence.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../Common/Modal';
import { useCreateAbsence, useCreateBulkAbsence } from '../../hooks/useStaff';
import type { AbsenceReason } from '../../types';

interface StaffAbsenceModalProps {
  staffId: string;
  staffName: string;
  absenceDate: string; // YYYY-MM-DD pre-filled from selected weekday
  onClose: () => void;
}

type AbsenceMode = 'full_day' | 'partial' | 'multi_day';

const REASONS: { value: AbsenceReason; label: string }[] = [
  { value: 'sick', label: 'Sjuk' },
  { value: 'vacation', label: 'Semester' },
  { value: 'parental_leave', label: 'Föräldraledighet' },
  { value: 'training', label: 'Utbildning' },
  { value: 'other', label: 'Övrigt' },
];

const MODE_LABELS: { value: AbsenceMode; label: string }[] = [
  { value: 'full_day', label: 'Heldag' },
  { value: 'partial', label: 'Del av dag' },
  { value: 'multi_day', label: 'Flera dagar' },
];

export function StaffAbsenceModal({ staffId, staffName, absenceDate, onClose }: StaffAbsenceModalProps) {
  const [mode, setMode] = useState<AbsenceMode>('full_day');
  const [reason, setReason] = useState<AbsenceReason>('sick');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [startDate, setStartDate] = useState(absenceDate);
  const [endDate, setEndDate] = useState(absenceDate);
  const [includeWeekends, setIncludeWeekends] = useState(false);

  const createAbsence = useCreateAbsence();
  const createBulkAbsence = useCreateBulkAbsence();

  const isPending = createAbsence.isPending || createBulkAbsence.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'full_day') {
        await createAbsence.mutateAsync({
          staffId,
          data: { absence_date: absenceDate, reason },
        });
        toast.success(`Frånvaro registrerad för ${staffName}`);
      } else if (mode === 'partial') {
        await createAbsence.mutateAsync({
          staffId,
          data: { absence_date: absenceDate, start_time: startTime, end_time: endTime, reason },
        });
        toast.success(`Delfrånvaro registrerad för ${staffName} (${startTime}–${endTime})`);
      } else {
        const result = await createBulkAbsence.mutateAsync({
          staffId,
          data: {
            start_date: startDate,
            end_date: endDate,
            reason,
            include_weekends: includeWeekends,
            ...(startTime && endTime ? { start_time: startTime, end_time: endTime } : {}),
          },
        });
        toast.success(`${result.count} frånvarodagar registrerade för ${staffName}`);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Kunde inte registrera frånvaro.';
      toast.error(msg);
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth="md">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">Anmäl frånvaro</h2>
          <p className="text-sm text-surface-500 mt-0.5">
            {staffName} &middot; {absenceDate}
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-surface-100 p-1 gap-1">
            {MODE_LABELS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m.value
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Partial: time range */}
          {mode === 'partial' && (
            <div className="flex gap-4">
              <label className="flex-1">
                <span className="text-xs font-medium text-surface-500 uppercase mb-1 block">Starttid</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
                  required
                />
              </label>
              <label className="flex-1">
                <span className="text-xs font-medium text-surface-500 uppercase mb-1 block">Sluttid</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
                  required
                />
              </label>
            </div>
          )}

          {/* Multi-day: date range */}
          {mode === 'multi_day' && (
            <>
              <div className="flex gap-4">
                <label className="flex-1">
                  <span className="text-xs font-medium text-surface-500 uppercase mb-1 block">Startdatum</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
                    required
                  />
                </label>
                <label className="flex-1">
                  <span className="text-xs font-medium text-surface-500 uppercase mb-1 block">Slutdatum</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
                    required
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-surface-700">
                <input
                  type="checkbox"
                  checked={includeWeekends}
                  onChange={(e) => setIncludeWeekends(e.target.checked)}
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-300"
                />
                Inkl. helger
              </label>
            </>
          )}

          {/* Reason select */}
          <label>
            <span className="text-xs font-medium text-surface-500 uppercase mb-1 block">Orsak</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AbsenceReason)}
              className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300 bg-white"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Sparar...' : 'Registrera frånvaro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
