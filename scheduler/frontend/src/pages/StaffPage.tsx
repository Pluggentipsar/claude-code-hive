/**
 * Staff management page
 */

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useStaff, useCreateStaff, useUpdateStaff } from '../hooks/useStaff';
import { StaffList } from '../components/Staff/StaffList';
import { StaffForm } from '../components/Staff/StaffForm';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { EmptyState } from '../components/Common/EmptyState';
import { getErrorMessage } from '../api';
import type { Staff } from '../types';

export function StaffPage() {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: staff, isLoading, error } = useStaff();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();

  const handleCreateNew = () => {
    setSelectedStaff(null);
    setShowForm(true);
  };

  const handleStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowForm(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedStaff) {
        await updateMutation.mutateAsync({ id: selectedStaff.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setShowForm(false);
      setSelectedStaff(null);
    } catch (err) {
      console.error('Failed to save staff:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedStaff(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner label="Laddar personal..." />
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
              onCreateNew={handleCreateNew}
            />
          </div>

          {/* Staff form */}
          <div>
            {showForm ? (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">
                  {selectedStaff ? 'Redigera Personal' : 'Ny Personal'}
                </h2>

                {createMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage message={getErrorMessage(createMutation.error)} />
                  </div>
                )}

                {updateMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage message={getErrorMessage(updateMutation.error)} />
                  </div>
                )}

                <StaffForm
                  staff={selectedStaff}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            ) : (
              <div className="card">
                <EmptyState
                  icon={UserPlus}
                  title="Välj en personal"
                  description="Välj en personal från listan eller skapa en ny"
                  actionLabel="Lägg till ny personal"
                  onAction={handleCreateNew}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
