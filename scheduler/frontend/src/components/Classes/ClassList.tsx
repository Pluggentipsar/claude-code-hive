/**
 * School class list component with search and filters
 */

import { useState } from 'react';
import type { SchoolClass } from '../../types';
import { Button } from '../Common/Button';

interface ClassListProps {
  classes: SchoolClass[];
  onClassSelect: (schoolClass: SchoolClass) => void;
  onCreateNew: () => void;
}

export function ClassList({ classes, onClassSelect, onCreateNew }: ClassListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Filter classes
  const filteredClasses = classes.filter((schoolClass) => {
    const matchesSearch =
      searchTerm === '' ||
      schoolClass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schoolClass.academic_year.includes(searchTerm);

    const matchesActive =
      filterActive === null || schoolClass.active === filterActive;

    return matchesSearch && matchesActive;
  });

  // Helper to display grade group in Swedish
  const getGradeGroupLabel = (gradeGroup: string) => {
    return gradeGroup === 'grades_1_3' ? 'Årskurs 1-3' : 'Årskurs 4-6';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            📚 Klasser ({classes.length})
          </h2>
          <Button onClick={onCreateNew}>+ Ny Klass</Button>
        </div>

        {/* Search and filters */}
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Sök klass..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />

          <select
            value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
            onChange={(e) =>
              setFilterActive(
                e.target.value === 'all'
                  ? null
                  : e.target.value === 'active'
              )
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Alla</option>
            <option value="active">Aktiva</option>
            <option value="inactive">Inaktiva</option>
          </select>
        </div>
      </div>

      {/* Class list */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((schoolClass) => (
            <div
              key={schoolClass.id}
              onClick={() => onClassSelect(schoolClass)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {schoolClass.name}
                  </h3>
                  <div className="mt-1 flex items-center space-x-3 text-sm text-gray-600">
                    <span>{getGradeGroupLabel(schoolClass.grade_group)}</span>
                    <span>Läsår {schoolClass.academic_year}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {schoolClass.student_count} elever
                    </span>
                    {!schoolClass.active && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                        Inaktiv
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>Inga klasser hittades</p>
          </div>
        )}
      </div>
    </div>
  );
}
