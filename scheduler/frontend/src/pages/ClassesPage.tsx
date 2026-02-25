/**
 * Unified Classes & Students page.
 * Shows classes as expandable accordions with embedded student lists.
 */

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useClasses, useCreateClass, useUpdateClass } from '../hooks/useClasses';
import { useStudents, useCreateStudent, useUpdateStudent } from '../hooks/useStudents';
import { ClassAccordionList } from '../components/Classes/ClassAccordionList';
import { ClassForm } from '../components/Classes/ClassForm';
import { StudentForm } from '../components/Students/StudentForm';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { EmptyState } from '../components/Common/EmptyState';
import { getErrorMessage } from '../api';
import type { SchoolClass, Student } from '../types';

type EditMode =
  | { type: 'none' }
  | { type: 'class'; schoolClass: SchoolClass | null }
  | { type: 'student'; student: Student | null; defaultClassId?: string };

export function ClassesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>({ type: 'none' });

  const { data: classes, isLoading: classesLoading, error: classesError } = useClasses();
  const { data: students, isLoading: studentsLoading, error: studentsError } = useStudents();
  const createClassMutation = useCreateClass();
  const updateClassMutation = useUpdateClass();
  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();

  const isLoading = classesLoading || studentsLoading;
  const error = classesError || studentsError;

  const handleToggleExpand = (classId: string) => {
    setExpandedClassId(prev => prev === classId ? null : classId);
  };

  const handleEditClass = (schoolClass: SchoolClass) => {
    setEditMode({ type: 'class', schoolClass });
  };

  const handleCreateClass = () => {
    setEditMode({ type: 'class', schoolClass: null });
  };

  const handleEditStudent = (student: Student) => {
    setEditMode({ type: 'student', student });
  };

  const handleCreateStudent = (classId?: string) => {
    setEditMode({ type: 'student', student: null, defaultClassId: classId });
  };

  const handleClassSubmit = async (data: any) => {
    try {
      if (editMode.type === 'class' && editMode.schoolClass) {
        await updateClassMutation.mutateAsync({ id: editMode.schoolClass.id, data });
      } else {
        await createClassMutation.mutateAsync(data);
      }
      setEditMode({ type: 'none' });
    } catch (err) {
      console.error('Failed to save class:', err);
    }
  };

  const handleStudentSubmit = async (data: any) => {
    try {
      if (editMode.type === 'student' && editMode.student) {
        await updateStudentMutation.mutateAsync({ id: editMode.student.id, data });
      } else {
        await createStudentMutation.mutateAsync(data);
      }
      setEditMode({ type: 'none' });
    } catch (err) {
      console.error('Failed to save student:', err);
    }
  };

  const handleCancel = () => {
    setEditMode({ type: 'none' });
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
        <ErrorMessage message={`Kunde inte hämta data: ${getErrorMessage(error)}`} />
      </div>
    );
  }

  const isClassMutating = createClassMutation.isPending || updateClassMutation.isPending;
  const isStudentMutating = createStudentMutation.isPending || updateStudentMutation.isPending;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Accordion list */}
          <div>
            <ClassAccordionList
              classes={classes || []}
              students={students || []}
              expandedClassId={expandedClassId}
              onToggleExpand={handleToggleExpand}
              onEditClass={handleEditClass}
              onEditStudent={handleEditStudent}
              onCreateClass={handleCreateClass}
              onCreateStudent={handleCreateStudent}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>

          {/* Right: Edit panel */}
          <div>
            {editMode.type === 'class' ? (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">
                  {editMode.schoolClass ? 'Redigera Klass' : 'Ny Klass'}
                </h2>

                {createClassMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage message={getErrorMessage(createClassMutation.error)} />
                  </div>
                )}
                {updateClassMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage message={getErrorMessage(updateClassMutation.error)} />
                  </div>
                )}

                <ClassForm
                  schoolClass={editMode.schoolClass}
                  onSubmit={handleClassSubmit}
                  onCancel={handleCancel}
                  isLoading={isClassMutating}
                />
              </div>
            ) : editMode.type === 'student' ? (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">
                  {editMode.student ? 'Redigera Elev' : 'Ny Elev'}
                </h2>

                {createStudentMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage message={getErrorMessage(createStudentMutation.error)} />
                  </div>
                )}
                {updateStudentMutation.isError && (
                  <div className="mb-4">
                    <ErrorMessage message={getErrorMessage(updateStudentMutation.error)} />
                  </div>
                )}

                <StudentForm
                  student={editMode.student}
                  onSubmit={handleStudentSubmit}
                  onCancel={handleCancel}
                  isLoading={isStudentMutating}
                  classes={classes || []}
                  defaultClassId={editMode.defaultClassId}
                />
              </div>
            ) : (
              <div className="card">
                <EmptyState
                  icon={BookOpen}
                  title="Välj att redigera"
                  description="Klicka på en klass eller elev i listan, eller skapa en ny"
                  actionLabel="Ny klass"
                  onAction={handleCreateClass}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
