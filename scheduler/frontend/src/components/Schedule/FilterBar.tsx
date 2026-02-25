/**
 * FilterBar — compact filter row above the student/staff tables.
 */

import { Search, X, Wand2, Eye } from 'lucide-react';

export type QuickFilter = 'all' | 'missing_staff' | 'special_needs' | 'warnings';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedClass: string;
  onClassChange: (value: string) => void;
  classList: { id: string; name: string }[];
  quickFilter: QuickFilter;
  onQuickFilterChange: (value: QuickFilter) => void;
  onReset: () => void;
  resultCount: { shown: number; total: number };
  hasActiveFilters: boolean;
  onAutoAssign?: () => void;
  isAutoAssigning?: boolean;
  onSuggestAssignments?: () => void;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  selectedClass,
  onClassChange,
  classList,
  quickFilter,
  onQuickFilterChange,
  onReset,
  resultCount,
  hasActiveFilters,
  onAutoAssign,
  isAutoAssigning,
  onSuggestAssignments,
}: FilterBarProps) {
  return (
    <div className="card px-4 py-2.5 flex items-center gap-3 flex-wrap">
      {/* Text search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök elev/personal..."
          className="input-base pl-9"
        />
      </div>

      {/* Class dropdown */}
      <select
        value={selectedClass}
        onChange={(e) => onClassChange(e.target.value)}
        className="input-base w-auto min-w-[140px]"
      >
        <option value="">Alla klasser</option>
        {classList.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Quick filter dropdown */}
      <select
        value={quickFilter}
        onChange={(e) => onQuickFilterChange(e.target.value as QuickFilter)}
        className="input-base w-auto min-w-[160px]"
      >
        <option value="all">Visa: Alla</option>
        <option value="missing_staff">Saknar personal</option>
        <option value="special_needs">Specialbehov</option>
        <option value="warnings">Varningar</option>
      </select>

      {/* Auto-assign buttons */}
      {onAutoAssign && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAutoAssign}
            disabled={isAutoAssigning}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
              bg-primary-50 text-primary-700 border border-primary-200
              hover:bg-primary-100 hover:border-primary-300
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            <Wand2 className={`h-3.5 w-3.5 ${isAutoAssigning ? 'animate-spin' : ''}`} />
            {isAutoAssigning ? 'Tilldelar...' : 'Auto-tilldela'}
          </button>
          {onSuggestAssignments && (
            <button
              onClick={onSuggestAssignments}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                bg-surface-50 text-surface-700 border border-surface-200
                hover:bg-surface-100 hover:border-surface-300
                transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Förhandsgranska
            </button>
          )}
        </div>
      )}

      {/* Reset button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Rensa
        </button>
      )}

      {/* Result counter */}
      {hasActiveFilters && (
        <span className="text-xs text-surface-400 ml-auto whitespace-nowrap">
          Visar {resultCount.shown} av {resultCount.total} elever
        </span>
      )}
    </div>
  );
}
