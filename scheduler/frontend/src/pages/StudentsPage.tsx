/**
 * Students management page
 */

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useStudents, useCreateStudent, useUpdateStudent } from '../hooks/useStudents';
import { StudentList } from '../components/Students/StudentList';
import { StudentForm } from '../components/Students/StudentForm';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { EmptyState } from '../components/Common/EmptyState';
import { getErrorMessage } from '../api';
import type { Student } from '../types';

export function StudentsPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: students, isLoading, error } = useStudents();
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();

  const handleCreateNew = () => {
    setSelectedStudent(null);
    setShowForm(true);
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setShowForm(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedStudent) {
        await updateMutation.mutateAsync({ id: selectedStudent.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setShowForm(false);
      setSelectedStudent(null);
    } catch (err) {
      console.error('Failed to save student:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedStudent(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner label="Laddar elever..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={`Kunde inte hämta elever: ${getErrorMessage(error)}`} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student list */}
          <div>
            <StudentList
              students={students || []}
              onStudentSelect={handleStudentSelect}
              onCreateNew={handleCreateNew}
            />
          </div>

          {/* Student form */}
          <div>
            {showForm ? (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">
                  {selectedStudent ? 'Redigera Elev' : 'Ny Elev'}
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

                <StudentForm
                  student={selectedStudent}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            ) : (
              <div className="card">
                <EmptyState
                  icon={UserPlus}
                  title="Välj en elev"
                  description="Välj en elev från listan eller skapa en ny"
                  actionLabel="Lägg till ny elev"
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
