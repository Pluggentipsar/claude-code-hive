/**
 * Care times table with inline editing
 */

import { useState } from 'react';
import { useCareTimes, useCreateCareTime, useDeleteCareTime } from '../../hooks/useStudents';
import type { CareTimeCreate } from '../../types';
import { Button } from '../Common/Button';

interface CareTimesTableProps {
  studentId: string;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

export function CareTimesTable({ studentId }: CareTimesTableProps) {
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
    return <div className="text-sm text-gray-500">Laddar omsorgstider...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">
          🕐 Omsorgstider ({careTimes?.length || 0})
        </h4>
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          variant={isAdding ? 'secondary' : 'primary'}
        >
          {isAdding ? 'Avbryt' : '+ Lägg till tid'}
        </Button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-4 gap-3 mb-3">
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
                Starttid
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
                Sluttid
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
                Giltig från
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
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

      {/* Care times list */}
      {careTimes && careTimes.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Veckodag
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Starttid
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Sluttid
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                  Giltig från
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {careTimes.map((careTime) => (
                <tr key={careTime.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {WEEKDAYS[careTime.weekday]}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {careTime.start_time}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {careTime.end_time}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {new Date(careTime.valid_from).toLocaleDateString('sv-SE')}
                  </td>
                  <td className="px-3 py-2 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleDelete(careTime.id)}
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
          Inga omsorgstider inlagda än
        </div>
      )}
    </div>
  );
}
