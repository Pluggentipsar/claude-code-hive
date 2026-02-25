/**
 * ClassAccordionList — expandable accordion list of classes with embedded students.
 * Replaces the old ClassList component.
 */

import { useMemo } from 'react';
import { Search, BookOpen, ChevronDown, ChevronRight, Pencil, Plus, Star, ShieldCheck, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../Common/Button';
import type { SchoolClass, Student } from '../../types';

interface ClassAccordionListProps {
  classes: SchoolClass[];
  students: Student[];
  expandedClassId: string | null;
  onToggleExpand: (classId: string) => void;
  onEditClass: (schoolClass: SchoolClass) => void;
  onEditStudent: (student: Student) => void;
  onCreateClass: () => void;
  onCreateStudent: (classId?: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

function getGradeGroupLabel(gradeGroup: string) {
  return gradeGroup === 'grades_1_3' ? 'Åk 1-3' : 'Åk 4-6';
}

export function ClassAccordionList({
  classes,
  students,
  expandedClassId,
  onToggleExpand,
  onEditClass,
  onEditStudent,
  onCreateClass,
  onCreateStudent,
  searchTerm,
  onSearchChange,
}: ClassAccordionListProps) {
  // Group students by class_id
  const studentsByClass = useMemo(() => {
    const map = new Map<string | null, Student[]>();
    for (const s of students) {
      const key = s.class_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort students within each group by name
    for (const list of map.values()) {
      list.sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'sv')
      );
    }
    return map;
  }, [students]);

  // Filter based on search term
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) {
      return {
        classes: classes.filter(c => c.active),
        unassigned: studentsByClass.get(null) || [],
      };
    }

    const matchingStudentIds = new Set<string>();
    const classIdsWithMatchingStudents = new Set<string | null>();

    for (const s of students) {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      if (fullName.includes(term)) {
        matchingStudentIds.add(s.id);
        classIdsWithMatchingStudents.add(s.class_id);
      }
    }

    const filteredClasses = classes.filter(c => {
      if (!c.active) return false;
      return c.name.toLowerCase().includes(term) || classIdsWithMatchingStudents.has(c.id);
    });

    const unassigned = (studentsByClass.get(null) || []).filter(
      s => matchingStudentIds.has(s.id) || !term
    );

    return {
      classes: filteredClasses,
      unassigned: term ? unassigned.filter(s => matchingStudentIds.has(s.id)) : unassigned,
      matchingStudentIds: term ? matchingStudentIds : null,
    };
  }, [classes, students, studentsByClass, searchTerm]);

  const getClassStudents = (classId: string) => {
    const all = studentsByClass.get(classId) || [];
    if (!filteredData.matchingStudentIds) return all;
    // If searching, show matching students + highlight
    return all.filter(s => filteredData.matchingStudentIds!.has(s.id));
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-surface-50 border-b border-surface-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-surface-900">
              Klasser & Elever
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onCreateClass}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Klass
            </Button>
            <Button size="sm" onClick={() => onCreateStudent()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Elev
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Sök klass eller elev..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>
      </div>

      {/* Accordion list */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {filteredData.classes.length === 0 && filteredData.unassigned.length === 0 && (
          <div className="py-8 text-center text-sm text-surface-400">
            Inga klasser eller elever hittades
          </div>
        )}

        {filteredData.classes.map((schoolClass) => {
          const classStudents = getClassStudents(schoolClass.id);
          const allClassStudents = studentsByClass.get(schoolClass.id) || [];
          const isExpanded = expandedClassId === schoolClass.id;

          return (
            <div key={schoolClass.id} className="border-b border-surface-100 last:border-b-0">
              {/* Class header */}
              <button
                type="button"
                onClick={() => onToggleExpand(schoolClass.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-surface-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-surface-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-surface-900">
                      {schoolClass.name}
                    </span>
                    <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded-md text-xs font-medium">
                      {getGradeGroupLabel(schoolClass.grade_group)}
                    </span>
                    <span className="text-xs text-surface-400">
                      {allClassStudents.length} elever
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEditClass(schoolClass); }}
                  className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 hover:text-surface-600 transition-colors"
                  title="Redigera klass"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </button>

              {/* Expanded student list */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3">
                      {classStudents.length > 0 ? (
                        <div className="rounded-xl border border-surface-100 divide-y divide-surface-100 overflow-hidden">
                          {classStudents.map((student) => (
                            <StudentRow
                              key={student.id}
                              student={student}
                              onEdit={() => onEditStudent(student)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="py-3 text-center text-xs text-surface-400">
                          Inga elever i denna klass
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onCreateStudent(schoolClass.id)}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                      >
                        + Lägg till elev i {schoolClass.name}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Unassigned students */}
        {filteredData.unassigned.length > 0 && (
          <div className="border-b border-surface-100 last:border-b-0">
            <button
              type="button"
              onClick={() => onToggleExpand('__unassigned__')}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-50 transition-colors text-left"
            >
              {expandedClassId === '__unassigned__' ? (
                <ChevronDown className="h-4 w-4 text-surface-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-surface-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-surface-400" />
                  <span className="text-sm font-semibold text-surface-600">
                    Utan klass
                  </span>
                  <span className="text-xs text-surface-400">
                    {filteredData.unassigned.length} elever
                  </span>
                </div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedClassId === '__unassigned__' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3">
                    <div className="rounded-xl border border-surface-100 divide-y divide-surface-100 overflow-hidden">
                      {filteredData.unassigned.map((student) => (
                        <StudentRow
                          key={student.id}
                          student={student}
                          onEdit={() => onEditStudent(student)}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentRow({ student, onEdit }: { student: Student; onEdit: () => void }) {
  return (
    <div className="px-3 py-2 flex items-center gap-3 hover:bg-surface-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-900">
            {student.first_name} {student.last_name}
          </span>
          <span className="text-xs text-surface-400">Åk {student.grade}</span>
          {student.has_care_needs && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-accent-50 text-accent-700 rounded-md text-xs font-medium">
              <Star className="h-3 w-3" />
              Vårdbehov
            </span>
          )}
          {student.requires_double_staffing && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-warning-50 text-warning-700 rounded-md text-xs font-medium">
              <ShieldCheck className="h-3 w-3" />
              Dubbel
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 hover:text-surface-600 transition-colors"
        title="Redigera elev"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
