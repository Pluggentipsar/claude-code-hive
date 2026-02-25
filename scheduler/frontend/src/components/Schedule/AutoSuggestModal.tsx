/**
 * AutoSuggestModal — preview suggested assignments before applying.
 *
 * Shows a list of suggestions with checkboxes, scores, and reasons.
 * User can approve individual suggestions or apply all.
 */

import { useState } from 'react';
import { X, Wand2, Check, ArrowRight } from 'lucide-react';
import type { AssignmentSuggestion } from '../../types/weekSchedule';

interface AutoSuggestModalProps {
  suggestions: AssignmentSuggestion[];
  isLoading: boolean;
  onApply: (suggestions: AssignmentSuggestion[]) => void;
  onClose: () => void;
}

export function AutoSuggestModal({ suggestions, isLoading, onApply, onClose }: AutoSuggestModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(suggestions.map((s) => `${s.student_day_id}-${s.period}`))
  );

  const toggleAll = () => {
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((s) => `${s.student_day_id}-${s.period}`)));
    }
  };

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApply = () => {
    const toApply = suggestions.filter(
      (s) => selected.has(`${s.student_day_id}-${s.period}`)
    );
    onApply(toApply);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-elevated max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-surface-800">Föreslagna tilldelningar</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
              {suggestions.length} förslag
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <X className="h-5 w-5 text-surface-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-12 text-center text-surface-400">Beräknar förslag...</div>
          ) : suggestions.length === 0 ? (
            <div className="py-12 text-center text-surface-400">Inga förslag — nuvarande tilldelningar ser bra ut!</div>
          ) : (
            <div className="space-y-2">
              {/* Select all */}
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === suggestions.length}
                  onChange={toggleAll}
                  className="rounded text-primary-600"
                />
                <span className="text-sm font-medium text-surface-600">
                  Markera alla ({selected.size}/{suggestions.length})
                </span>
              </label>

              {suggestions.map((s) => {
                const key = `${s.student_day_id}-${s.period}`;
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                      selected.has(key)
                        ? 'bg-primary-50 border-primary-200'
                        : 'bg-white border-surface-200 hover:bg-surface-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                      className="rounded text-primary-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-800">{s.student_name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-surface-100 text-surface-500">
                          {s.period.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-surface-500">
                        {s.current_staff_name && (
                          <>
                            <span>{s.current_staff_name}</span>
                            <ArrowRight className="h-3 w-3" />
                          </>
                        )}
                        <span className="font-medium text-primary-700">{s.suggested_staff_name}</span>
                        <span className="text-surface-400 ml-1">({s.reason})</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      {s.score}p
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleApply}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
              bg-primary-600 text-white rounded-lg
              hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            <Check className="h-4 w-4" />
            Tillämpa {selected.size} förslag
          </button>
        </div>
      </div>
    </div>
  );
}
