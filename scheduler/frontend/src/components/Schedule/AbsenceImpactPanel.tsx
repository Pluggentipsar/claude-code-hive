/**
 * Absence Impact Panel — shows the impact of absent staff on students.
 *
 * Displays affected students grouped by severity,
 * replacement candidates, and bulk reassignment actions.
 */

import { useState } from 'react';
import { AlertTriangle, UserX, Shield, ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { AbsenceImpactResult, SuggestedReassignment } from '../../types/weekSchedule';

interface AbsenceImpactPanelProps {
  impact: AbsenceImpactResult;
  onApplyReassignment: (studentId: string, period: 'fm' | 'em', staffId: string) => void;
  onApplyAll: (reassignments: SuggestedReassignment[]) => void;
}

const SEVERITY_CONFIG = {
  critical: { label: 'Kritisk', bg: 'bg-danger-50', text: 'text-danger-700', border: 'border-danger-200', icon: Shield },
  high: { label: 'Hög', bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-200', icon: AlertTriangle },
  medium: { label: 'Medel', bg: 'bg-surface-50', text: 'text-surface-700', border: 'border-surface-200', icon: UserX },
};

export function AbsenceImpactPanel({ impact, onApplyReassignment, onApplyAll }: AbsenceImpactPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  if (impact.absent_count === 0 || impact.affected_students.length === 0) {
    return null;
  }

  const criticalCount = impact.affected_students.filter(s => s.severity === 'critical').length;
  const hasSuggestions = impact.suggested_reassignments.length > 0;

  const handleApply = (r: SuggestedReassignment) => {
    onApplyReassignment(r.student_id, r.period, r.suggested_staff_id);
    setAppliedIds(prev => new Set([...prev, `${r.student_id}-${r.period}`]));
  };

  const handleApplyAll = () => {
    const unapplied = impact.suggested_reassignments.filter(
      r => !appliedIds.has(`${r.student_id}-${r.period}`)
    );
    onApplyAll(unapplied);
    setAppliedIds(new Set(impact.suggested_reassignments.map(r => `${r.student_id}-${r.period}`)));
  };

  return (
    <div className={`rounded-2xl border-l-4 ${criticalCount > 0 ? 'border-danger-500 bg-danger-50/50' : 'border-warning-500 bg-warning-50/50'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <UserX className={`h-5 w-5 ${criticalCount > 0 ? 'text-danger-500' : 'text-warning-500'}`} />
          <span className="text-sm font-semibold text-surface-800">
            {impact.absent_count} personal frånvarande
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${criticalCount > 0 ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'}`}>
            {impact.affected_students.length} elever drabbade
            {criticalCount > 0 && ` (${criticalCount} kritiska)`}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Affected students */}
          <div className="space-y-1.5">
            {impact.affected_students.map((student) => {
              const config = SEVERITY_CONFIG[student.severity];
              const Icon = config.icon;
              const suggestion = impact.suggested_reassignments.find(
                r => r.student_id === student.student_id
              );
              const isApplied = appliedIds.has(`${student.student_id}-${student.missing_period}`);

              return (
                <div
                  key={`${student.student_id}-${student.missing_period}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl ${config.bg} ${config.border} border`}
                >
                  <Icon className={`h-4 w-4 ${config.text} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-surface-800">{student.student_name}</span>
                    {student.class_name && (
                      <span className="text-xs text-surface-500 ml-2">{student.class_name}</span>
                    )}
                    <span className="text-xs text-surface-400 ml-2">
                      {student.missing_period === 'both' ? 'FM+EM' : student.missing_period.toUpperCase()}
                    </span>
                    {student.care_requirements.length > 0 && (
                      <span className="text-xs text-danger-600 ml-2">
                        Behov: {student.care_requirements.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Suggestion or applied */}
                  {isApplied ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tillsatt
                    </span>
                  ) : suggestion ? (
                    <button
                      onClick={() => handleApply(suggestion)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                        bg-primary-50 text-primary-700 border border-primary-200
                        hover:bg-primary-100 transition-colors"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {suggestion.suggested_staff_name}
                    </button>
                  ) : (
                    <span className="text-xs text-surface-400">Ingen ersättare</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bulk action */}
          {hasSuggestions && appliedIds.size < impact.suggested_reassignments.length && (
            <button
              onClick={handleApplyAll}
              className="w-full text-center text-sm py-2 rounded-xl
                bg-primary-50 text-primary-700 border border-primary-200
                hover:bg-primary-100 transition-colors font-medium"
            >
              Tillsätt alla förslag ({impact.suggested_reassignments.length - appliedIds.size} kvar)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
