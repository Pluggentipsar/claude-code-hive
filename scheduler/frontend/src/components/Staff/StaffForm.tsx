/**
 * Staff form - simplified for non-technical users
 */

import { useState } from 'react';
import type { Staff, StaffCreate, StaffUpdate } from '../../types';
import { Button } from '../Common/Button';
import { WorkHoursTable } from './WorkHoursTable';

interface StaffFormProps {
  staff?: Staff | null;
  onSubmit: (data: StaffCreate | StaffUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function StaffForm({ staff, onSubmit, onCancel, isLoading }: StaffFormProps) {
  const [formData, setFormData] = useState({
    personal_number: staff?.personal_number || '',
    first_name: staff?.first_name || '',
    last_name: staff?.last_name || '',
    role: staff?.role || 'elevassistent' as const,
    care_certifications: staff?.care_certifications?.join(', ') || '',
    schedule_type: staff?.schedule_type || 'fixed' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse certifications from comma-separated string
    const certifications = formData.care_certifications
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const submitData = {
      ...formData,
      care_certifications: certifications,
    };

    await onSubmit(submitData);
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

        {!staff && (
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
              placeholder="8503201234"
              pattern="\d{10,13}"
            />
            <p className="text-xs text-gray-500 mt-1">
              10 eller 12 siffror (ÅÅMMDDXXXX eller ÅÅÅÅMMDDXXXX)
            </p>
          </div>
        )}
      </div>

      {/* Role and schedule */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4">Tjänst</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Roll *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="elevassistent">👤 Elevassistent</option>
              <option value="pedagog">🎓 Pedagog</option>
              <option value="fritidspedagog">⚽ Fritidspedagog</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schematyp *
            </label>
            <select
              value={formData.schedule_type}
              onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="fixed">📅 Fast schema (varje vecka)</option>
              <option value="two_week_rotation">🔄 Tvåveckorsschema (rullande)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4">Vårdcertifieringar</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certifieringar (frivilligt)
          </label>
          <input
            type="text"
            value={formData.care_certifications}
            onChange={(e) => setFormData({ ...formData, care_certifications: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="epilepsi, diabetes, allergi"
          />
          <p className="text-xs text-gray-500 mt-1">
            ⚕️ Separera med komma. T.ex: "epilepsi, diabetes, allergi"
          </p>
        </div>
      </div>

      {/* Work Hours - Only show when editing existing staff */}
      {staff && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <WorkHoursTable staffId={staff.id} />
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
          {staff ? 'Uppdatera' : 'Skapa'} Personal
        </Button>
      </div>
    </form>
  );
}
