/**
 * Week navigation header with status and actions.
 */

import { ChevronLeft, ChevronRight, Plus, Copy, CheckCircle2, PenLine } from 'lucide-react';
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
    <div className="card p-4">
      <div className="flex items-center justify-between">
        {/* Week navigation */}
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={onPrevWeek} icon={ChevronLeft}>
            <span className="sr-only">Föregående</span>
          </Button>
          <div className="text-center min-w-[140px]">
            <h1 className="text-xl font-semibold text-surface-900 text-display">
              Vecka {week}, {year}
            </h1>
          </div>
          <Button size="sm" variant="ghost" onClick={onNextWeek} icon={ChevronRight}>
            <span className="sr-only">Nästa</span>
          </Button>
        </div>

        {/* Actions + status */}
        <div className="flex items-center gap-3">
          {!weekSchedule && !isLoading && (
            <>
              <Button onClick={onCreateWeek} isLoading={isCreating} icon={Plus}>
                Ny vecka
              </Button>
              <Button variant="outline" onClick={onCopyWeek} icon={Copy}>
                Kopiera förra
              </Button>
            </>
          )}

          {weekSchedule && (
            <button
              type="button"
              onClick={onToggleStatus}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                weekSchedule.status === 'published'
                  ? 'bg-success-50 text-success-700 hover:bg-success-100'
                  : 'bg-warning-50 text-warning-700 hover:bg-warning-100'
              }`}
              title={weekSchedule.status === 'published' ? 'Klicka för att avpublicera' : 'Klicka för att publicera'}
            >
              {weekSchedule.status === 'published' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
              {weekSchedule.status === 'published' ? 'Publicerad' : 'Utkast'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
