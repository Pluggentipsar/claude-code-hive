/**
 * Student form - simplified for non-technical users
 */

import { useState } from 'react';
import type { Student, StudentCreate, StudentUpdate, SchoolClass } from '../../types';
import { Button } from '../Common/Button';
import { CareTimesTable } from './CareTimesTable';

interface StudentFormProps {
  student?: Student | null;
  onSubmit: (data: StudentCreate | StudentUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  classes?: SchoolClass[];
  defaultClassId?: string;
}

export function StudentForm({ student, onSubmit, onCancel, isLoading, classes, defaultClassId }: StudentFormProps) {
  const [formData, setFormData] = useState({
    personal_number: student?.personal_number || '',
    first_name: student?.first_name || '',
    last_name: student?.last_name || '',
    class_id: student?.class_id || defaultClassId || '',
    grade: student?.grade || 1,
    has_care_needs: student?.has_care_needs || false,
    requires_double_staffing: student?.requires_double_staffing || false,
    notes: student?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { class_id, ...rest } = formData;
    await onSubmit({ ...rest, class_id: class_id || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-surface-50 p-4 rounded-xl">
        <h3 className="text-sm font-semibold text-surface-800 mb-4">Grunduppgifter</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label mb-1">Förnamn *</label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="input-base w-full"
              placeholder="Anna"
            />
          </div>

          <div>
            <label className="label mb-1">Efternamn *</label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="input-base w-full"
              placeholder="Andersson"
            />
          </div>
        </div>

        {!student && (
          <div className="mt-4">
            <label className="label mb-1">Personnummer * (YYMMDDXXXX)</label>
            <input
              type="text"
              required
              value={formData.personal_number}
              onChange={(e) =>
                setFormData({ ...formData, personal_number: e.target.value })
              }
              className="input-base w-full"
              placeholder="0501011234"
              pattern="\d{10,13}"
            />
            <p className="text-xs text-surface-400 mt-1">
              10 eller 12 siffror (ÅÅMMDDXXXX eller ÅÅÅÅMMDDXXXX)
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="label mb-1">Årskurs *</label>
          <select
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
            className="input-base w-full"
          >
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <option key={grade} value={grade}>
                Årskurs {grade}
              </option>
            ))}
          </select>
        </div>

        {classes && classes.length > 0 && (
          <div className="mt-4">
            <label className="label mb-1">Klass</label>
            <select
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              className="input-base w-full"
            >
              <option value="">Ingen klass</option>
              {classes.filter(c => c.active).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Special needs */}
      <div className="bg-surface-50 p-4 rounded-xl">
        <h3 className="text-sm font-semibold text-surface-800 mb-4">Särskilda behov</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.has_care_needs}
              onChange={(e) =>
                setFormData({ ...formData, has_care_needs: e.target.checked })
              }
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
            />
            <span className="text-sm text-surface-700">
              Har vårdbehov (kräver certifierad personal)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requires_double_staffing}
              onChange={(e) =>
                setFormData({ ...formData, requires_double_staffing: e.target.checked })
              }
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
            />
            <span className="text-sm text-surface-700">
              Kräver dubbelbemanning
            </span>
          </label>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label mb-1">Anteckningar (frivilligt)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="input-base w-full"
          placeholder="Eventuella anteckningar om eleven..."
        />
      </div>

      {/* Care Times - Only show when editing existing student */}
      {student && (
        <div className="bg-surface-50 p-4 rounded-xl">
          <CareTimesTable studentId={student.id} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-surface-200">
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
