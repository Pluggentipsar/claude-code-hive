/**
 * Quick Care Time Edit Modal - Fast editing of student care times
 */

import { useState } from 'react';
import type { CareTime } from '../../types';
import { Button } from '../Common/Button';

interface QuickCareTimeEditProps {
  careTime: CareTime;
  studentName: string;
  onClose: () => void;
  onSave: (data: { start_time: string; end_time: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

export function QuickCareTimeEdit({
  careTime,
  studentName,
  onClose,
  onSave,
  isSubmitting,
}: QuickCareTimeEditProps) {
  const [formData, setFormData] = useState({
    start_time: careTime.start_time,
    end_time: careTime.end_time,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      start_time: formData.start_time,
      end_time: formData.end_time,
    });
  };

  // Calculate duration
  const calculateDuration = () => {
    if (!formData.start_time || !formData.end_time) return '';

    const [startHour, startMin] = formData.start_time.split(':').map(Number);
    const [endHour, endMin] = formData.end_time.split(':').map(Number);

    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}min`;
  };

  const weekdayName = WEEKDAYS[careTime.weekday];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Header */}
          <div className="border-b pb-3">
            <h2 className="text-xl font-bold text-gray-900">Ändra omsorgstid</h2>
            <p className="text-sm text-gray-600 mt-1">
              {studentName} • {weekdayName}
            </p>
          </div>

          {/* Care times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start tid *
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slut tid *
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Omsorgstid:</span>
              <span className="font-medium">
                {formData.start_time} - {formData.end_time}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Total tid:</span>
              <span className="font-medium">{calculateDuration()}</span>
            </div>
          </div>

          {/* Helper text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            💡 Ändringen gäller framåt från dagens datum. Tidigare scheman påverkas inte.
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSubmitting}
            >
              Spara ändring
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
