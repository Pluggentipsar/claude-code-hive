/**
 * Work hours table with inline editing
 */

import { useState } from 'react';
import { useWorkHours, useCreateWorkHour, useUpdateWorkHour, useDeleteWorkHour } from '../../hooks/useStaff';
import type { WorkHour, WorkHourCreate } from '../../types';
import { Button } from '../Common/Button';

interface WorkHoursTableProps {
  staffId: string;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const WEEK_LABELS = ['Båda veckor', 'Vecka 1', 'Vecka 2'];

export function WorkHoursTable({ staffId }: WorkHoursTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: workHours, isLoading } = useWorkHours(staffId);
  const createMutation = useCreateWorkHour();
  const updateMutation = useUpdateWorkHour();
  const deleteMutation = useDeleteWorkHour();

  const [formData, setFormData] = useState<WorkHourCreate>({
    weekday: 0,
    week_number: 0,
    start_time: '08:00',
    end_time: '16:00',
    lunch_start: '12:00',
    lunch_end: '13:00',
  });

  const handleAdd = async () => {
    try {
      await createMutation.mutateAsync({ staffId, data: formData });
      setIsAdding(false);
      setFormData({
        weekday: 0,
        week_number: 0,
        start_time: '08:00',
        end_time: '16:00',
        lunch_start: '12:00',
        lunch_end: '13:00',
      });
    } catch (err) {
      console.error('Failed to create work hour:', err);
    }
  };

  const handleUpdate = async (workHour: WorkHour) => {
    try {
      await updateMutation.mutateAsync({
        id: workHour.id,
        staffId,
        data: {
          weekday: workHour.weekday,
          week_number: workHour.week_number,
          start_time: workHour.start_time,
          end_time: workHour.end_time,
          lunch_start: workHour.lunch_start || undefined,
          lunch_end: workHour.lunch_end || undefined,
        },
      });
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update work hour:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna arbetstid?')) return;

    try {
      await deleteMutation.mutateAsync({ id, staffId });
    } catch (err) {
      console.error('Failed to delete work hour:', err);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Laddar arbetstider...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">
          ⏰ Arbetstider ({workHours?.length || 0})
        </h4>
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          variant={isAdding ? 'secondary' : 'primary'}
        >
          {isAdding ? 'Avbryt' : '+ Lägg till arbetstid'}
        </Button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-6 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Veckodag
              </label>
              <select
                value={formData.weekday}
                onChange={(e) => setFormData({ ...formData, weekday: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              >
                {WEEKDAYS.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vecka
              </label>
              <select
                value={formData.week_number}
                onChange={(e) => setFormData({ ...formData, week_number: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              >
                {WEEK_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Slut
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lunch start
              </label>
              <input
                type="time"
                value={formData.lunch_start || ''}
                onChange={(e) => setFormData({ ...formData, lunch_start: e.target.value || undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lunch slut
              </label>
              <input
                type="time"
                value={formData.lunch_end || ''}
                onChange={(e) => setFormData({ ...formData, lunch_end: e.target.value || undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button size="sm" onClick={handleAdd} isLoading={createMutation.isPending}>
              Spara
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsAdding(false)}>
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {/* Work hours list */}
      {workHours && workHours.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Veckodag
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Vecka
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Starttid
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Sluttid
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Lunch
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workHours.map((workHour) => (
                <tr key={workHour.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {WEEKDAYS[workHour.weekday]}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {WEEK_LABELS[workHour.week_number]}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {workHour.start_time}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {workHour.end_time}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {workHour.lunch_start && workHour.lunch_end
                      ? `${workHour.lunch_start}-${workHour.lunch_end}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleDelete(workHour.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                      disabled={deleteMutation.isPending}
                    >
                      Ta bort
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg">
          Inga arbetstider inlagda än
        </div>
      )}
    </div>
  );
}
