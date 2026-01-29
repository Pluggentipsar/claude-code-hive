/**
 * School class form - simplified for non-technical users
 */

import { useState } from 'react';
import type { SchoolClass, SchoolClassCreate, SchoolClassUpdate } from '../../types';
import { Button } from '../Common/Button';

interface ClassFormProps {
  schoolClass?: SchoolClass | null;
  onSubmit: (data: SchoolClassCreate | SchoolClassUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClassForm({ schoolClass, onSubmit, onCancel, isLoading }: ClassFormProps) {
  const [formData, setFormData] = useState({
    name: schoolClass?.name || '',
    grade_group: schoolClass?.grade_group || 'grades_1_3' as const,
    academic_year: schoolClass?.academic_year || getCurrentAcademicYear(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4">Grunduppgifter</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Klassnamn *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Klass 1A"
            />
            <p className="text-xs text-gray-500 mt-1">
              T.ex: "Klass 1A", "Årskurs 2", "Blå gruppen"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Årskursgrupp *
            </label>
            <select
              value={formData.grade_group}
              onChange={(e) => setFormData({ ...formData, grade_group: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="grades_1_3">📗 Årskurs 1-3</option>
              <option value="grades_4_6">📘 Årskurs 4-6</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Avgör vilka elever som kan vara i denna klass
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Läsår *
            </label>
            <input
              type="text"
              required
              value={formData.academic_year}
              onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="2025/2026"
              pattern="\d{4}/\d{4}"
            />
            <p className="text-xs text-gray-500 mt-1">
              📅 Format: ÅÅÅÅ/ÅÅÅÅ (t.ex. 2025/2026)
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
          disabled={isLoading}
        >
          Avbryt
        </Button>
        <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
          {schoolClass ? 'Uppdatera' : 'Skapa'} Klass
        </Button>
      </div>
    </form>
  );
}

/**
 * Helper function to get current academic year
 */
function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Academic year starts in August (month 7)
  if (month >= 7) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}
