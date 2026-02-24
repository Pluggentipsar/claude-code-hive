/**
 * Week navigation header with status and actions.
 */

import { Button } from '../Common/Button';
import type { WeekSchedule } from '../../types/weekSchedule';

interface WeekHeaderProps {
  year: number;
  week: number;
  weekSchedule: WeekSchedule | null;
  isLoading: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCreateWeek: () => void;
  onCopyWeek: () => void;
  isCreating: boolean;
  onToggleStatus?: () => void;
}

export function WeekHeader({
  year,
  week,
  weekSchedule,
  isLoading,
  onPrevWeek,
  onNextWeek,
  onCreateWeek,
  onCopyWeek,
  isCreating,
  onToggleStatus,
}: WeekHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        {/* Week navigation */}
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="secondary" onClick={onPrevWeek}>
            &larr;
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Vecka {week}, {year}
            </h1>
          </div>
          <Button size="sm" variant="secondary" onClick={onNextWeek}>
            &rarr;
          </Button>
        </div>

        {/* Actions + status */}
        <div className="flex items-center space-x-3">
          {!weekSchedule && !isLoading && (
            <>
              <Button onClick={onCreateWeek} isLoading={isCreating}>
                Ny vecka
              </Button>
              <Button variant="secondary" onClick={onCopyWeek}>
                Kopiera förra
              </Button>
            </>
          )}

          {weekSchedule && (
            <button
              type="button"
              onClick={onToggleStatus}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                weekSchedule.status === 'published'
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              }`}
              title={weekSchedule.status === 'published' ? 'Klicka f\u00f6r att avpublicera' : 'Klicka f\u00f6r att publicera'}
            >
              {weekSchedule.status === 'published' ? 'Publicerad' : 'Utkast'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
