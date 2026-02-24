/**
 * FilterBar — compact filter row above the student/staff tables.
 * Search, class dropdown, quick filter, reset button, and result counter.
 */

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
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-3 flex-wrap">
      {/* Text search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <span className="absolute inset-y-0 left-2 flex items-center text-gray-400 pointer-events-none text-sm">
          &#128269;
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök elev/personal..."
          className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
        />
      </div>

      {/* Class dropdown */}
      <select
        value={selectedClass}
        onChange={(e) => onClassChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value="all">Visa: Alla</option>
        <option value="missing_staff">Saknar personal</option>
        <option value="special_needs">Specialbehov</option>
        <option value="warnings">Varningar</option>
      </select>

      {/* Reset button — only shown when filters are active */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Rensa
        </button>
      )}

      {/* Result counter */}
      {hasActiveFilters && (
        <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
          Visar {resultCount.shown} av {resultCount.total} elever
        </span>
      )}
    </div>
  );
}
