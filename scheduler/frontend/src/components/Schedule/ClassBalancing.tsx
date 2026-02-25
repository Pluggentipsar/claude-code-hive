/**
 * ClassBalancing — two-column view showing class staffing balance.
 *
 * Left: Grades 1-3 (Lågstadium)
 * Right: Grades 4-6 (Mellanstadium)
 *
 * Each class card shows student count, staff count, ratio, and status.
 * Rebalancing suggestions shown at the bottom.
 */

import { useState } from 'react';
import { Users, ArrowRight, ChevronDown, ChevronUp, Scale } from 'lucide-react';
import type { ClassBalanceResponse, ClassBalanceItem, RebalancingSuggestion } from '../../types/weekSchedule';

interface ClassBalancingProps {
  data: ClassBalanceResponse;
  onApplySuggestion?: (suggestion: RebalancingSuggestion) => void;
}

const STATUS_CONFIG = {
  surplus: { bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-700', label: 'Överskott' },
  balanced: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Balanserat' },
  deficit: { bg: 'bg-danger-50', border: 'border-danger-200', text: 'text-danger-700', label: 'Underskott' },
};

function ClassCard({ item }: { item: ClassBalanceItem }) {
  const config = STATUS_CONFIG[item.status];

  return (
    <div className={`rounded-xl border p-3 ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-surface-800">{item.class_name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
          {config.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-surface-700">{item.student_count}</div>
          <div className="text-xs text-surface-400">Elever</div>
        </div>
        <div>
          <div className="text-lg font-bold text-surface-700">{item.staff_count}</div>
          <div className="text-xs text-surface-400">Personal</div>
        </div>
        <div>
          <div className={`text-lg font-bold ${config.text}`}>{item.ratio}:1</div>
          <div className="text-xs text-surface-400">Kvot</div>
        </div>
      </div>
    </div>
  );
}

export function ClassBalancing({ data, onApplySuggestion }: ClassBalancingProps) {
  const [expanded, setExpanded] = useState(false);

  const totalDeficit = [...data.low_grades, ...data.high_grades].filter(c => c.status === 'deficit').length;

  return (
    <div className="card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Scale className="h-4 w-4 text-surface-400" />
          <span className="text-sm font-semibold text-surface-700">Klassbalansering</span>
          {totalDeficit > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-danger-100 text-danger-700">
              {totalDeficit} klass{totalDeficit !== 1 ? 'er' : ''} med underskott
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low grades */}
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">
                Lågstadium (Åk 1-3)
              </h4>
              <div className="space-y-2">
                {data.low_grades.length > 0 ? (
                  data.low_grades.map((item) => <ClassCard key={item.class_id} item={item} />)
                ) : (
                  <div className="text-sm text-surface-400 py-4 text-center">Inga klasser</div>
                )}
              </div>
            </div>

            {/* High grades */}
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">
                Mellanstadium (Åk 4-6)
              </h4>
              <div className="space-y-2">
                {data.high_grades.length > 0 ? (
                  data.high_grades.map((item) => <ClassCard key={item.class_id} item={item} />)
                ) : (
                  <div className="text-sm text-surface-400 py-4 text-center">Inga klasser</div>
                )}
              </div>
            </div>
          </div>

          {/* Rebalancing suggestions */}
          {data.rebalancing_suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">
                Ombalanseringsförslag
              </h4>
              <div className="space-y-1.5">
                {data.rebalancing_suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-50 border border-surface-200"
                  >
                    <Users className="h-4 w-4 text-surface-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-sm">
                      <span className="font-medium">{s.staff_name}</span>
                      <span className="text-surface-400 mx-1.5">
                        {s.from_class_name}
                      </span>
                      <ArrowRight className="h-3 w-3 inline text-surface-400" />
                      <span className="text-surface-400 mx-1.5">
                        {s.to_class_name}
                      </span>
                    </div>
                    {onApplySuggestion && (
                      <button
                        onClick={() => onApplySuggestion(s)}
                        className="text-xs px-2 py-1 rounded-lg bg-primary-50 text-primary-700
                          border border-primary-200 hover:bg-primary-100 transition-colors"
                      >
                        Flytta
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
