/**
 * Classes management page
 */

import { useState } from 'react';
import { useClasses, useCreateClass, useUpdateClass } from '../hooks/useClasses';
import { ClassList } from '../components/Classes/ClassList';
import { ClassForm } from '../components/Classes/ClassForm';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { getErrorMessage } from '../api';
import type { SchoolClass } from '../types';

export function ClassesPage() {
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: classes, isLoading, error } = useClasses();
  const createMutation = useCreateClass();
  const updateMutation = useUpdateClass();

  const handleCreateNew = () => {
    setSelectedClass(null);
    setShowForm(true);
  };

  const handleClassSelect = (schoolClass: SchoolClass) => {
    setSelectedClass(schoolClass);
    setShowForm(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedClass) {
        await updateMutation.mutateAsync({ id: selectedClass.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setShowForm(false);
      setSelectedClass(null);
    } catch (err) {
      console.error('Failed to save class:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedClass(null);
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
        <ErrorMessage message={`Kunde inte hämta klasser: ${getErrorMessage(error)}`} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Class list */}
          <div>
            <ClassList
              classes={classes || []}
              onClassSelect={handleClassSelect}
              onCreateNew={handleCreateNew}
            />
          </div>

          {/* Class form */}
          <div>
            {showForm ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {selectedClass ? 'Redigera Klass' : 'Ny Klass'}
                </h2>

                {createMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage
                      message={getErrorMessage(createMutation.error)}
                    />
                  </div>
                )}

                {updateMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage
                      message={getErrorMessage(updateMutation.error)}
                    />
                  </div>
                )}

                <ClassForm
                  schoolClass={selectedClass}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500 mb-4">
                  Välj en klass från listan eller skapa en ny
                </p>
                <button
                  onClick={handleCreateNew}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Lägg till ny klass
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
