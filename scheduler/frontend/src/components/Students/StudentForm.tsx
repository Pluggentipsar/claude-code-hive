/**
 * Student form - simplified for non-technical users
 */

import { useState } from 'react';
import type { Student, StudentCreate, StudentUpdate } from '../../types';
import { Button } from '../Common/Button';
import { CareTimesTable } from './CareTimesTable';

interface StudentFormProps {
  student?: Student | null;
  onSubmit: (data: StudentCreate | StudentUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function StudentForm({ student, onSubmit, onCancel, isLoading }: StudentFormProps) {
  const [formData, setFormData] = useState({
    personal_number: student?.personal_number || '',
    first_name: student?.first_name || '',
    last_name: student?.last_name || '',
    grade: student?.grade || 1,
    has_care_needs: student?.has_care_needs || false,
    requires_double_staffing: student?.requires_double_staffing || false,
    notes: student?.notes || '',
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Förnamn *
            </label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Anna"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Efternamn *
            </label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Andersson"
            />
          </div>
        </div>

        {!student && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personnummer * (YYMMDDXXXX)
            </label>
            <input
              type="text"
              required
              value={formData.personal_number}
              onChange={(e) =>
                setFormData({ ...formData, personal_number: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="0501011234"
              pattern="\d{10,13}"
            />
            <p className="text-xs text-gray-500 mt-1">
              10 eller 12 siffror (ÅÅMMDDXXXX eller ÅÅÅÅMMDDXXXX)
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Årskurs *
          </label>
          <select
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <option key={grade} value={grade}>
                Årskurs {grade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Special needs */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4">Särskilda behov</h3>

        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.has_care_needs}
              onChange={(e) =>
                setFormData({ ...formData, has_care_needs: e.target.checked })
              }
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              ⚕️ Har vårdbehov (kräver certifierad personal)
            </span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.requires_double_staffing}
              onChange={(e) =>
                setFormData({ ...formData, requires_double_staffing: e.target.checked })
              }
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              👥 Kräver dubbelbemanning
            </span>
          </label>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Anteckningar (frivilligt)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          placeholder="Eventuella anteckningar om eleven..."
        />
      </div>

      {/* Care Times - Only show when editing existing student */}
      {student && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <CareTimesTable studentId={student.id} />
        </div>
      )}

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
          {student ? 'Uppdatera' : 'Skapa'} Elev
        </Button>
      </div>
    </form>
  );
}
