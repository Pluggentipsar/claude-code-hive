/**
 * Quick Work Hour Edit Modal - Fast editing of staff work hours
 */

import { useState } from 'react';
import type { WorkHour } from '../../types';
import { Button } from '../Common/Button';

interface QuickWorkHourEditProps {
  workHour: WorkHour;
  staffName: string;
  onClose: () => void;
  onSave: (data: { start_time: string; end_time: string; lunch_start?: string; lunch_end?: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

export function QuickWorkHourEdit({
  workHour,
  staffName,
  onClose,
  onSave,
  isSubmitting,
}: QuickWorkHourEditProps) {
  const [formData, setFormData] = useState({
    start_time: workHour.start_time,
    end_time: workHour.end_time,
    lunch_start: workHour.lunch_start || '',
    lunch_end: workHour.lunch_end || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      start_time: formData.start_time,
      end_time: formData.end_time,
      lunch_start: formData.lunch_start || undefined,
      lunch_end: formData.lunch_end || undefined,
    });
  };

  const weekdayName = WEEKDAYS[workHour.weekday];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Header */}
          <div className="border-b pb-3">
            <h2 className="text-xl font-bold text-gray-900">Ändra arbetstid</h2>
            <p className="text-sm text-gray-600 mt-1">
              {staffName} • {weekdayName}
            </p>
          </div>

          {/* Work hours */}
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

          {/* Lunch hours (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lunch (valfritt)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="time"
                value={formData.lunch_start}
                onChange={(e) => setFormData({ ...formData, lunch_start: e.target.value })}
                placeholder="Från"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="time"
                value={formData.lunch_end}
                onChange={(e) => setFormData({ ...formData, lunch_end: e.target.value })}
                placeholder="Till"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Arbetstid:</span>
              <span className="font-medium">
                {formData.start_time} - {formData.end_time}
              </span>
            </div>
            {formData.lunch_start && formData.lunch_end && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-600">Lunch:</span>
                <span className="font-medium">
                  {formData.lunch_start} - {formData.lunch_end}
                </span>
              </div>
            )}
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
