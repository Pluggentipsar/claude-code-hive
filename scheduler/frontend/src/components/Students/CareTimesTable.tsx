/**
 * Care times table with inline editing
 */

import { useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { useCareTimes, useCreateCareTime, useDeleteCareTime } from '../../hooks/useStudents';
import type { CareTimeCreate } from '../../types';
import { Button } from '../Common/Button';

interface CareTimesTableProps {
  studentId: string;
  readOnly?: boolean;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

export function CareTimesTable({ studentId, readOnly }: CareTimesTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { data: careTimes, isLoading } = useCareTimes(studentId);
  const createMutation = useCreateCareTime();
  const deleteMutation = useDeleteCareTime();

  const [formData, setFormData] = useState<CareTimeCreate>({
    weekday: 0,
    start_time: '08:00',
    end_time: '16:00',
    valid_from: new Date().toISOString().split('T')[0],
  });

  const handleAdd = async () => {
    try {
      await createMutation.mutateAsync({ studentId, data: formData });
      setIsAdding(false);
      setFormData({
        weekday: 0,
        start_time: '08:00',
        end_time: '16:00',
        valid_from: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Failed to create care time:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna omsorgstid?')) return;

    try {
      await deleteMutation.mutateAsync({ id, studentId });
    } catch (err) {
      console.error('Failed to delete care time:', err);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-surface-400">Laddar omsorgstider...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary-500" />
          <h4 className="text-sm font-semibold text-surface-800">
            Omsorgstider ({careTimes?.length || 0})
          </h4>
        </div>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            variant={isAdding ? 'secondary' : 'primary'}
            icon={isAdding ? undefined : Plus}
          >
            {isAdding ? 'Avbryt' : 'Lägg till tid'}
          </Button>
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="label mb-1">Veckodag</label>
              <select
                value={formData.weekday}
                onChange={(e) => setFormData({ ...formData, weekday: Number(e.target.value) })}
                className="input-base w-full text-sm"
              >
                {WEEKDAYS.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-1">Starttid</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="input-base w-full text-sm"
              />
            </div>

            <div>
              <label className="label mb-1">Sluttid</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="input-base w-full text-sm"
              />
            </div>

            <div>
              <label className="label mb-1">Giltig från</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="input-base w-full text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} isLoading={createMutation.isPending}>
              Spara
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsAdding(false)}>
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {/* Care times list */}
      {careTimes && careTimes.length > 0 ? (
        <div className="border border-surface-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-surface-100">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">
                  Veckodag
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">
                  Starttid
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">
                  Sluttid
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">
                  Giltig från
                </th>
                {!readOnly && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-surface-500 uppercase">
                    Åtgärder
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {careTimes.map((careTime) => (
                <tr key={careTime.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-3 py-2 text-sm text-surface-800">
                    {WEEKDAYS[careTime.weekday]}
                  </td>
                  <td className="px-3 py-2 text-sm text-surface-800 tabular-nums">
                    {careTime.start_time}
                  </td>
                  <td className="px-3 py-2 text-sm text-surface-800 tabular-nums">
                    {careTime.end_time}
                  </td>
                  <td className="px-3 py-2 text-sm text-surface-500">
                    {new Date(careTime.valid_from).toLocaleDateString('sv-SE')}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2 text-sm text-right">
                      <button
                        onClick={() => handleDelete(careTime.id)}
                        className="inline-flex items-center gap-1 text-danger-600 hover:text-danger-700 font-medium text-xs transition-colors"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                        Ta bort
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-surface-400 border border-dashed border-surface-300 rounded-xl">
          Inga omsorgstider inlagda än
        </div>
      )}
    </div>
  );
}
