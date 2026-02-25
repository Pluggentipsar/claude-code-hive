/**
 * WeekDashboard — always-visible summary panel showing per-day stats with coverage bars.
 */

import { motion } from 'framer-motion';
import { Users, UserMinus, CheckCircle2, AlertTriangle, Sun, Moon } from 'lucide-react';
import type { WeekSummaryData, DaySummary } from '../../hooks/useWeekSummary';

const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'];

interface WeekDashboardProps {
  summary: WeekSummaryData;
  selectedWeekday: number;
  onSelectDay: (weekday: number) => void;
}

function coverageColor(coverage: number): string {
  if (coverage >= 0.9) return 'bg-success-500';
  if (coverage >= 0.6) return 'bg-warning-500';
  return 'bg-danger-500';
}

function coverageTextColor(coverage: number): string {
  if (coverage >= 0.9) return 'text-success-600';
  if (coverage >= 0.6) return 'text-warning-600';
  return 'text-danger-600';
}

function CoverageBar({ label, icon: Icon, coverage }: { label: string; icon: React.ComponentType<{ className?: string }>; coverage: number }) {
  const pct = Math.round(coverage * 100);
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 flex-shrink-0 ${coverageTextColor(coverage)}`} />
      <span className="text-[10px] font-medium text-surface-500 w-5">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${coverageColor(coverage)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-semibold tabular-nums w-7 text-right ${coverageTextColor(coverage)}`}>
        {pct}%
      </span>
    </div>
  );
}

function DayCard({ day, isSelected, onClick, index }: { day: DaySummary; isSelected: boolean; onClick: () => void; index: number }) {
  const totalUnassigned = day.unassignedFm + day.unassignedEm;
  const isFullyStaffed = totalUnassigned === 0;
  const hasErrors = day.errorCount > 0;
  const hasWarnings = day.warningCount > 0;
  const allGood = isFullyStaffed && !hasErrors && !hasWarnings;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      onClick={onClick}
      className={`rounded-xl p-3 text-left transition-all duration-150 border w-full ${
        isSelected
          ? 'border-primary-300 bg-primary-50 shadow-soft ring-1 ring-primary-200'
          : 'border-surface-100 hover:border-surface-200 hover:bg-surface-50'
      }`}
    >
      {/* Day name */}
      <div className="text-sm font-semibold text-surface-800 mb-2">{DAY_LABELS[day.weekday]}</div>

      {/* Students + absent */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-surface-500">{day.students} elever</span>
        {day.absentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-warning-600 font-medium">
            <UserMinus className="h-3 w-3" />
            {day.absentCount}
          </span>
        )}
      </div>

      {/* FM/EM coverage bars */}
      <div className="space-y-1 mb-2">
        <CoverageBar label="FM" icon={Sun} coverage={day.fmCoverage} />
        <CoverageBar label="EM" icon={Moon} coverage={day.emCoverage} />
      </div>

      {/* Staff count */}
      <div className="flex items-center gap-1 text-xs text-surface-500 mb-1.5">
        <Users className="h-3 w-3" />
        <span>{day.staffCount} personal</span>
      </div>

      {/* Status indicator */}
      <div className="pt-1.5 border-t border-surface-100">
        {allGood ? (
          <div className="flex items-center gap-1 text-success-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Fullt bemannat</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasErrors && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-danger-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {day.errorCount}
              </span>
            )}
            {hasWarnings && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-warning-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {day.warningCount}
              </span>
            )}
            {!isFullyStaffed && (
              <span className="text-[11px] text-warning-600 font-medium">
                {totalUnassigned} obem.
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export function WeekDashboard({ summary, selectedWeekday, onSelectDay }: WeekDashboardProps) {
  if (summary.isLoading) return null;

  const overallCoverage = (summary.overallFmCoverage + summary.overallEmCoverage) / 2;
  const overallPct = Math.round(overallCoverage * 100);

  return (
    <div className="card no-print overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-surface-100">
        <span className="text-sm font-semibold text-surface-700">Veckosummering</span>
        <div className="flex items-center gap-3 text-xs">
          <span className={`font-semibold ${coverageTextColor(overallCoverage)}`}>
            {overallPct}% bemannat
          </span>
          {summary.totalAbsent > 0 && (
            <span className="text-surface-400">
              {summary.totalAbsent} frånvarande
            </span>
          )}
          {summary.totalWarnings > 0 && (
            <span className="text-danger-600 font-medium">
              {summary.totalWarnings} varningar
            </span>
          )}
        </div>
      </div>

      {/* Day grid — always visible */}
      <div className="px-4 pb-3 pt-3">
        <div className="grid grid-cols-5 gap-2">
          {summary.days.map((day, idx) => (
            <DayCard
              key={idx}
              day={day}
              isSelected={idx === selectedWeekday}
              onClick={() => onSelectDay(idx)}
              index={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
