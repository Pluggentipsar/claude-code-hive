/**
 * Student list component with search and filters
 */

import { useState } from 'react';
import type { Student } from '../../types';
import { Button } from '../Common/Button';

interface StudentListProps {
  students: Student[];
  onStudentSelect: (student: Student) => void;
  onCreateNew: () => void;
}

export function StudentList({ students, onStudentSelect, onCreateNew }: StudentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      searchTerm === '' ||
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.personal_number.includes(searchTerm);

    const matchesActive =
      filterActive === null || student.active === filterActive;

    return matchesSearch && matchesActive;
  });

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            👨‍🎓 Elever ({students.length})
          </h2>
          <Button onClick={onCreateNew}>+ Ny Elev</Button>
        </div>

        {/* Search and filters */}
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Sök elev..."
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

      {/* Student list */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => onStudentSelect(student)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {student.first_name} {student.last_name}
                  </h3>
                  <div className="mt-1 flex items-center space-x-3 text-sm text-gray-600">
                    <span>Årskurs {student.grade}</span>
                    {student.has_care_needs && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                        ⚕️ Vårdbehov
                      </span>
                    )}
                    {student.requires_double_staffing && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                        👥 Dubbelbemanning
                      </span>
                    )}
                    {!student.active && (
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
            <p>Inga elever hittades</p>
          </div>
        )}
      </div>
    </div>
  );
}
