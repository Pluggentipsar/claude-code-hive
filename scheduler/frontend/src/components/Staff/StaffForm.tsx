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
    grade_group: (staff?.grade_group || '') as string,
    care_certifications: staff?.care_certifications?.join(', ') || '',
    schedule_type: staff?.schedule_type || 'fixed' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const certifications = formData.care_certifications
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    const submitData = {
      ...formData,
      grade_group: (formData.grade_group || null) as 'grades_1_3' | 'grades_4_6' | null,
      care_certifications: certifications,
    };
    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-surface-50 p-4 rounded-xl">
        <h3 className="font-semibold text-surface-900 mb-4">Grunduppgifter</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Förnamn *</label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="input-base"
              placeholder="Anna"
            />
          </div>
          <div>
            <label className="label">Efternamn *</label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="input-base"
              placeholder="Andersson"
            />
          </div>
        </div>

        {!staff && (
          <div className="mt-4">
            <label className="label">Personnummer * (YYMMDDXXXX)</label>
            <input
              type="text"
              required
              value={formData.personal_number}
              onChange={(e) =>
                setFormData({ ...formData, personal_number: e.target.value })
              }
              className="input-base"
              placeholder="8503201234"
              pattern="\d{10,13}"
            />
            <p className="text-xs text-surface-400 mt-1.5">
              10 eller 12 siffror (ÅÅMMDDXXXX eller ÅÅÅÅMMDDXXXX)
            </p>
          </div>
        )}
      </div>

      {/* Role and schedule */}
      <div className="bg-surface-50 p-4 rounded-xl">
        <h3 className="font-semibold text-surface-900 mb-4">Tjänst</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Roll *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="input-base"
            >
              <option value="elevassistent">Elevassistent</option>
              <option value="pedagog">Pedagog</option>
              <option value="fritidspedagog">Fritidspedagog</option>
            </select>
          </div>
          <div>
            <label className="label">Schematyp *</label>
            <select
              value={formData.schedule_type}
              onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as any })}
              className="input-base"
            >
              <option value="fixed">Fast schema (varje vecka)</option>
              <option value="two_week_rotation">Tvåveckorsschema (rullande)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Stadium</label>
          <select
            value={formData.grade_group}
            onChange={(e) => setFormData({ ...formData, grade_group: e.target.value })}
            className="input-base"
          >
            <option value="">Båda stadier</option>
            <option value="grades_1_3">Lågstadium (1-3)</option>
            <option value="grades_4_6">Mellanstadium (4-6)</option>
          </select>
          <p className="text-xs text-surface-400 mt-1.5">
            Används för att rekommendera personal vid FM/EM-tilldelning.
          </p>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-surface-50 p-4 rounded-xl">
        <h3 className="font-semibold text-surface-900 mb-4">Vårdcertifieringar</h3>

        <div>
          <label className="label">Certifieringar (frivilligt)</label>
          <input
            type="text"
            value={formData.care_certifications}
            onChange={(e) => setFormData({ ...formData, care_certifications: e.target.value })}
            className="input-base"
            placeholder="epilepsi, diabetes, allergi"
          />
          <p className="text-xs text-surface-400 mt-1.5">
            Separera med komma. T.ex: "epilepsi, diabetes, allergi"
          </p>
        </div>
      </div>

      {/* Work Hours */}
      {staff && (
        <div className="bg-surface-50 p-4 rounded-xl">
          <WorkHoursTable staffId={staff.id} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-surface-100">
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
