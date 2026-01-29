/**
 * Bulk Absence Form - Mass absence reporting for crisis scenarios
 */

import { useState, useMemo } from 'react';
import type { Staff, AbsenceCreate, AbsenceReason } from '../../types';
import { Button } from '../Common/Button';
import { schedulesApi } from '../../api/schedules';

interface BulkAbsenceFormProps {
  staff: Staff[];
  onClose: () => void;
  onSubmit: (absences: Array<{ staffId: string; data: AbsenceCreate }>) => Promise<void>;
  isSubmitting?: boolean;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

export function BulkAbsenceForm({ staff, onClose, onSubmit, isSubmitting }: BulkAbsenceFormProps) {
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<{
    absence_date: string;
    reason: AbsenceReason;
    is_full_day: boolean;
    start_time: string;
    end_time: string;
  }>({
    absence_date: new Date().toISOString().split('T')[0],
    reason: 'sick',
    is_full_day: true,
    start_time: '',
    end_time: '',
  });

  const [impactSummary, setImpactSummary] = useState<{
    total_affected_students: number;
    can_generate: boolean;
    severity: string;
  } | null>(null);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);

  // Toggle staff selection
  const toggleStaff = (staffId: string) => {
    const newSelection = new Set(selectedStaffIds);
    if (newSelection.has(staffId)) {
      newSelection.delete(staffId);
    } else {
      newSelection.add(staffId);
    }
    setSelectedStaffIds(newSelection);
    setImpactSummary(null); // Reset impact when selection changes
  };

  // Select all staff
  const selectAll = () => {
    setSelectedStaffIds(new Set(staff.map((s) => s.id)));
    setImpactSummary(null);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedStaffIds(new Set());
    setImpactSummary(null);
  };

  // Calculate week info
  const getWeekInfo = (dateStr: string) => {
    const date = new Date(dateStr);
    const thursday = new Date(date.getTime());
    thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { week_number: weekNumber, year: thursday.getFullYear() };
  };

  // Get weekday name
  const getWeekdayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekday = date.getDay();
    return WEEKDAYS[weekday === 0 ? 6 : weekday - 1];
  };

  // Check combined impact
  const checkImpact = async () => {
    if (selectedStaffIds.size === 0 || !formData.absence_date) {
      return;
    }

    setIsCheckingImpact(true);

    try {
      const { week_number, year } = getWeekInfo(formData.absence_date);

      // Check impact for each staff member
      const impactPromises = Array.from(selectedStaffIds).map((staffId) =>
        schedulesApi.testAbsenceImpact({
          staff_id: staffId,
          absence_date: formData.absence_date,
          start_time: formData.is_full_day ? undefined : formData.start_time,
          end_time: formData.is_full_day ? undefined : formData.end_time,
          week_number,
          year,
        })
      );

      const impacts = await Promise.all(impactPromises);

      // Aggregate results
      const totalAffectedStudents = new Set(
        impacts.flatMap((i) => i.affected_students.map((s) => s.id))
      ).size;

      const canGenerate = impacts.every((i) => i.can_generate);
      const hasCritical = impacts.some((i) => i.severity === 'critical');

      setImpactSummary({
        total_affected_students: totalAffectedStudents,
        can_generate: canGenerate,
        severity: hasCritical ? 'critical' : 'major',
      });
    } catch (error) {
      console.error('Failed to check impact:', error);
      setImpactSummary(null);
    } finally {
      setIsCheckingImpact(false);
    }
  };

  // Submit bulk absences
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const absences = Array.from(selectedStaffIds).map((staffId) => ({
      staffId,
      data: {
        staff_id: staffId,
        absence_date: formData.absence_date,
        start_time: formData.is_full_day ? undefined : formData.start_time,
        end_time: formData.is_full_day ? undefined : formData.end_time,
        reason: formData.reason,
      },
    }));

    await onSubmit(absences);
  };

  // Group staff by role
  const staffByRole = useMemo(() => {
    const grouped: Record<string, Staff[]> = {};
    staff.forEach((member) => {
      if (!grouped[member.role]) {
        grouped[member.role] = [];
      }
      grouped[member.role].push(member);
    });
    return grouped;
  }, [staff]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <span>🚨</span>
              <span>Massanmälan frånvaro</span>
            </h2>
            <p className="text-gray-600 mt-1">
              Anmäl flera personal sjuka samtidigt (t.ex. vinterkräksjuka)
            </p>
          </div>

          {/* Date selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Datum *</label>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                required
                value={formData.absence_date}
                onChange={(e) => {
                  setFormData({ ...formData, absence_date: e.target.value });
                  setImpactSummary(null);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 font-medium">
                {formData.absence_date && getWeekdayName(formData.absence_date)}
              </span>
            </div>
          </div>

          {/* Full day toggle */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_full_day}
                onChange={(e) => {
                  setFormData({ ...formData, is_full_day: e.target.checked });
                  setImpactSummary(null);
                }}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Heldag för alla</span>
            </label>
          </div>

          {/* Time selection (if not full day) */}
          {!formData.is_full_day && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Från tid *</label>
                <input
                  type="time"
                  required={!formData.is_full_day}
                  value={formData.start_time}
                  onChange={(e) => {
                    setFormData({ ...formData, start_time: e.target.value });
                    setImpactSummary(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Till tid *</label>
                <input
                  type="time"
                  required={!formData.is_full_day}
                  value={formData.end_time}
                  onChange={(e) => {
                    setFormData({ ...formData, end_time: e.target.value });
                    setImpactSummary(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Orsak *</label>
            <select
              required
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value as AbsenceReason })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="sick">🤒 Sjuk</option>
              <option value="vacation">🏖️ Semester</option>
              <option value="parental_leave">👶 Föräldraledighet</option>
              <option value="training">📚 Utbildning</option>
              <option value="other">Annat</option>
            </select>
          </div>

          {/* Staff selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Välj personal ({selectedStaffIds.size} valda)
              </label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Välj alla
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Rensa
                </button>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
              {Object.entries(staffByRole).map(([role, members]) => (
                <div key={role} className="border-b last:border-b-0">
                  <div className="bg-gray-50 px-3 py-2 font-medium text-sm text-gray-700">
                    {role} ({members.length})
                  </div>
                  <div className="divide-y">
                    {members.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.has(member.id)}
                          onChange={() => toggleStaff(member.id)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">
                          {member.first_name} {member.last_name}
                        </span>
                        {member.care_certifications.length > 0 && (
                          <span className="text-xs text-green-600">
                            ⚕️ {member.care_certifications.length} cert
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Check impact button */}
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={checkImpact}
              isLoading={isCheckingImpact}
              disabled={selectedStaffIds.size === 0}
              className="w-full"
            >
              {impactSummary ? '🔄 Kontrollera påverkan igen' : '🔍 Kontrollera påverkan'}
            </Button>
          </div>

          {/* Impact summary */}
          {impactSummary && (
            <div
              className={`p-4 rounded-lg border-2 ${
                impactSummary.severity === 'critical'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <h3 className="font-bold text-lg mb-2">
                {impactSummary.severity === 'critical' ? '🚨 Kritisk påverkan' : '⚠️ Stor påverkan'}
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Antal frånvarande:</strong> {selectedStaffIds.size} personal
                </div>
                <div>
                  <strong>Påverkade elever:</strong> {impactSummary.total_affected_students} elever
                </div>
                <div>
                  <strong>Kan schemat genereras:</strong>{' '}
                  {impactSummary.can_generate ? (
                    <span className="text-green-700">✓ Ja (med vikarier)</span>
                  ) : (
                    <span className="text-red-700">✗ Nej - behöver boka vikarier</span>
                  )}
                </div>
              </div>

              {impactSummary.severity === 'critical' && (
                <div className="mt-3 p-3 bg-white rounded border border-red-300">
                  <p className="text-sm font-medium text-red-900">
                    🚨 Rekommendation: Kontakta vikariepool omedelbart
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Warning if not checked */}
          {!impactSummary && !isCheckingImpact && selectedStaffIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 <strong>Tips:</strong> Kontrollera påverkan innan du sparar för att se hur många
              elever som påverkas och om schemat kan lösas.
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
              disabled={selectedStaffIds.size === 0}
            >
              Anmäl {selectedStaffIds.size} frånvaror
            </Button>
          </div>

          {/* Auto-regeneration warning */}
          <div className="text-xs text-gray-500 text-center">
            Schemat kommer att omgenereras automatiskt när frånvarorna sparats.
          </div>
        </form>
      </div>
    </div>
  );
}
