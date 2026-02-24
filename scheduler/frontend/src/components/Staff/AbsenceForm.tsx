/**
 * Absence Form Component - Quick absence reporting with impact preview
 * Supports both single-day and date-range (bulk) absence reporting.
 */

import { useState, useMemo } from 'react';
import type { Staff, AbsenceCreate, BulkAbsenceCreate, AbsenceReason } from '../../types';
import { Button } from '../Common/Button';
import { ImpactSummary } from './ImpactSummary';
import { schedulesApi } from '../../api/schedules';

type AbsenceMode = 'single' | 'range';

interface AbsenceFormProps {
  staff: Staff;
  onClose: () => void;
  onSubmit: (data: AbsenceCreate) => Promise<void>;
  onSubmitBulk?: (data: BulkAbsenceCreate) => Promise<void>;
  isSubmitting?: boolean;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

function countWeekdays(startStr: string, endStr: string, includeWeekends: boolean): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (end < start) return 0;
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay(); // 0=Sun, 6=Sat
    if (includeWeekends || (day !== 0 && day !== 6)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function AbsenceForm({ staff, onClose, onSubmit, onSubmitBulk, isSubmitting }: AbsenceFormProps) {
  const [mode, setMode] = useState<AbsenceMode>('single');

  const [formData, setFormData] = useState<{
    absence_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    reason: AbsenceReason;
    is_full_day: boolean;
    include_weekends: boolean;
  }>({
    absence_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    reason: 'sick',
    is_full_day: true,
    include_weekends: false,
  });

  const [impact, setImpact] = useState<any>(null);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const [impactChecked, setImpactChecked] = useState(false);

  const dayCount = useMemo(() => {
    if (mode === 'single') return 1;
    return countWeekdays(formData.absence_date, formData.end_date, formData.include_weekends);
  }, [mode, formData.absence_date, formData.end_date, formData.include_weekends]);

  // Calculate week number and year from date
  const getWeekInfo = (dateStr: string) => {
    const date = new Date(dateStr);
    const thursday = new Date(date.getTime());
    thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { week_number: weekNumber, year: thursday.getFullYear() };
  };

  const checkImpact = async () => {
    if (!formData.absence_date) {
      return;
    }

    setIsCheckingImpact(true);
    setImpactChecked(false);

    try {
      const { week_number, year } = getWeekInfo(formData.absence_date);

      const result = await schedulesApi.testAbsenceImpact({
        staff_id: staff.id,
        absence_date: formData.absence_date,
        start_time: formData.is_full_day ? undefined : formData.start_time,
        end_time: formData.is_full_day ? undefined : formData.end_time,
        week_number,
        year,
      });

      setImpact(result);
      setImpactChecked(true);
    } catch (error) {
      console.error('Failed to check impact:', error);
      setImpact(null);
      setImpactChecked(false);
    } finally {
      setIsCheckingImpact(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'range' && onSubmitBulk) {
      const bulkData: BulkAbsenceCreate = {
        start_date: formData.absence_date,
        end_date: formData.end_date,
        start_time: formData.is_full_day ? undefined : formData.start_time,
        end_time: formData.is_full_day ? undefined : formData.end_time,
        reason: formData.reason,
        include_weekends: formData.include_weekends,
      };
      await onSubmitBulk(bulkData);
    } else {
      const absenceData: AbsenceCreate = {
        absence_date: formData.absence_date,
        start_time: formData.is_full_day ? undefined : formData.start_time,
        end_time: formData.is_full_day ? undefined : formData.end_time,
        reason: formData.reason,
      };
      await onSubmit(absenceData);
    }
  };

  // Get weekday name
  const getWeekdayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekday = date.getDay();
    return WEEKDAYS[weekday === 0 ? 6 : weekday - 1];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Anmäl frånvaro
            </h2>
            <p className="text-gray-600 mt-1">
              {staff.first_name} {staff.last_name} - {staff.role}
            </p>
          </div>

          {/* Mode toggle */}
          {onSubmitBulk && (
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === 'single'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setMode('single')}
              >
                Enstaka dag
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === 'range'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setMode('range')}
              >
                Datumintervall
              </button>
            </div>
          )}

          {/* Date selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {mode === 'range' ? 'Från datum *' : 'Datum *'}
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                required
                value={formData.absence_date}
                onChange={(e) => {
                  const newData = { ...formData, absence_date: e.target.value };
                  // Keep end_date >= start_date
                  if (mode === 'range' && e.target.value > formData.end_date) {
                    newData.end_date = e.target.value;
                  }
                  setFormData(newData);
                  setImpactChecked(false);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 font-medium">
                {formData.absence_date && getWeekdayName(formData.absence_date)}
              </span>
            </div>
          </div>

          {/* End date (range mode) */}
          {mode === 'range' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Till datum *
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="date"
                  required
                  min={formData.absence_date}
                  value={formData.end_date}
                  onChange={(e) => {
                    setFormData({ ...formData, end_date: e.target.value });
                    setImpactChecked(false);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600 font-medium">
                  {formData.end_date && getWeekdayName(formData.end_date)}
                </span>
              </div>

              {/* Day count summary */}
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {dayCount} {dayCount === 1 ? 'dag' : 'dagar'} {formData.include_weekends ? '(inkl. helger)' : '(vardagar)'}
                </span>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.include_weekends}
                    onChange={(e) => {
                      setFormData({ ...formData, include_weekends: e.target.checked });
                    }}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Inkludera helger</span>
                </label>
              </div>
            </div>
          )}

          {/* Full day toggle */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_full_day}
                onChange={(e) => {
                  setFormData({ ...formData, is_full_day: e.target.checked });
                  setImpactChecked(false);
                }}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Heldag
              </span>
            </label>
          </div>

          {/* Time selection (if not full day) */}
          {!formData.is_full_day && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Från tid *
                </label>
                <input
                  type="time"
                  required={!formData.is_full_day}
                  value={formData.start_time}
                  onChange={(e) => {
                    setFormData({ ...formData, start_time: e.target.value });
                    setImpactChecked(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Till tid *
                </label>
                <input
                  type="time"
                  required={!formData.is_full_day}
                  value={formData.end_time}
                  onChange={(e) => {
                    setFormData({ ...formData, end_time: e.target.value });
                    setImpactChecked(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Orsak *
            </label>
            <select
              required
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value as AbsenceReason })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="sick">Sjuk</option>
              <option value="vacation">Semester</option>
              <option value="parental_leave">Föräldraledighet</option>
              <option value="training">Utbildning</option>
              <option value="other">Annat</option>
            </select>
          </div>

          {/* Check impact button (single mode only) */}
          {mode === 'single' && (
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={checkImpact}
                isLoading={isCheckingImpact}
                className="w-full"
              >
                {impactChecked ? 'Kontrollera påverkan igen' : 'Kontrollera påverkan'}
              </Button>
            </div>
          )}

          {/* Impact summary */}
          {mode === 'single' && <ImpactSummary impact={impact} isLoading={isCheckingImpact} />}

          {/* Warning if not checked */}
          {mode === 'single' && !impactChecked && !isCheckingImpact && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Tips:</strong> Kontrollera påverkan innan du sparar för att se om
              frånvaron påverkar schemat och vilka ersättare som finns tillgängliga.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSubmitting}
            >
              {mode === 'range'
                ? `Anmäl frånvaro (${dayCount} dagar)`
                : 'Anmäl frånvaro'}
            </Button>
          </div>

          {/* Warning about auto-regeneration */}
          <div className="text-xs text-gray-500 text-center">
            När du anmäler frånvaro kommer schemat att omgenereras automatiskt
            om det finns ett schema för denna vecka.
          </div>
        </form>
      </div>
    </div>
  );
}
