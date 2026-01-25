/**
 * Staff management page
 */

import { useState } from 'react';
import { useStaff, useCreateAbsence } from '../hooks/useStaff';
import { StaffList } from '../components/Staff/StaffList';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { Button } from '../components/Common/Button';
import { getErrorMessage } from '../api';
import type { Staff, AbsenceReason } from '../types';

export function StaffPage() {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const { data: staff, isLoading, error } = useStaff();
  const createAbsenceMutation = useCreateAbsence();

  const handleStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff);
  };

  const handleCreateAbsence = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const formData = new FormData(e.currentTarget);
    const absenceData = {
      staff_id: selectedStaff.id,
      absence_date: formData.get('absence_date') as string,
      reason: (formData.get('reason') as AbsenceReason) || 'sick',
    };

    try {
      await createAbsenceMutation.mutateAsync({
        staffId: selectedStaff.id,
        data: absenceData,
      });
      e.currentTarget.reset();
    } catch (err) {
      console.error('Failed to create absence:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={`Kunde inte hämta personal: ${getErrorMessage(error)}`} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff list */}
          <div>
            <StaffList
              staff={staff || []}
              onStaffSelect={handleStaffSelect}
              onCreateNew={() => {
                // TODO: Implement staff creation form
                alert('Skapa ny personal - kommer snart!');
              }}
            />
          </div>

          {/* Staff details / Absence form */}
          <div>
            {selectedStaff ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedStaff.first_name} {selectedStaff.last_name}
                  </h2>
                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Staff info */}
                <div className="space-y-3 mb-6 pb-6 border-b">
                  <div>
                    <span className="text-sm text-gray-500">Roll:</span>
                    <p className="font-medium">
                      {selectedStaff.role === 'elevassistent'
                        ? '👤 Elevassistent'
                        : selectedStaff.role === 'pedagog'
                        ? '📚 Pedagog'
                        : '🎨 Fritidspedagog'}
                    </p>
                  </div>

                  {selectedStaff.care_certifications.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500">Certifieringar:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedStaff.care_certifications.map((cert) => (
                          <span
                            key={cert}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                          >
                            ⚕️ {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Absence form */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Registrera Frånvaro
                  </h3>

                  {createAbsenceMutation.isError && (
                    <div className="mb-4">
                      <ErrorMessage message={getErrorMessage(createAbsenceMutation.error)} />
                    </div>
                  )}

                  <form onSubmit={handleCreateAbsence} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Datum *
                      </label>
                      <input
                        type="date"
                        name="absence_date"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Anledning *
                      </label>
                      <select
                        name="reason"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="sick">🤒 Sjuk</option>
                        <option value="vacation">🏖️ Semester</option>
                        <option value="parental_leave">👶 Föräldraledig</option>
                        <option value="training">📚 Utbildning</option>
                        <option value="other">📋 Annat</option>
                      </select>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      isLoading={createAbsenceMutation.isPending}
                    >
                      Registrera Frånvaro
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500">
                  Välj en personal från listan för att registrera frånvaro
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
