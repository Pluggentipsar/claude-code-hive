/**
 * AnalyticsPanel — tabbed container for all analytics views.
 *
 * Tabs: Personal, Klassbalans, Vikarie, Sårbarhet, Välmående
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Scale, FileText, Shield, Heart } from 'lucide-react';
import { StaffSummary } from './StaffSummary';
import { CoverageTimeline } from './CoverageTimeline';
import { StaffShiftTable } from './StaffShiftTable';
import { ClassBalancing } from './ClassBalancing';
import { SubstituteReport } from './SubstituteReport';
import { VulnerabilityMap } from './VulnerabilityMap';
import { StaffWellbeingPanel } from './StaffWellbeingPanel';
import { WarningBar } from './WarningBar';
import type { StudentDay, ScheduleWarning, StaffShift, CoverageSlot, VulnerabilityItem } from '../../types/weekSchedule';
import type { ClassBalanceResponse, SubstituteReportResponse, VulnerabilityMapResponse, StaffWellbeingResponse } from '../../types/weekSchedule';

interface AnalyticsPanelProps {
  // Personal tab
  studentDays: StudentDay[];
  staffShifts: StaffShift[];
  onUpdateShift: (shiftId: string, data: import('../../types/weekSchedule').StaffShiftUpdate) => void;
  onStaffAbsence?: (staffId: string, staffName: string) => void;
  absentStaffIds: Set<string>;
  coverageSlots?: CoverageSlot[];
  searchTerm?: string;

  // Klassbalans tab
  classBalance?: ClassBalanceResponse;

  // Vikarie tab
  substituteReport?: SubstituteReportResponse;

  // Sårbarhet tab
  vulnerabilityMap?: VulnerabilityMapResponse;
  warnings: ScheduleWarning[];
  vulnerabilities?: VulnerabilityItem[];

  // Välmående tab
  staffWellbeing?: StaffWellbeingResponse;
}

type TabKey = 'personal' | 'classbalance' | 'substitute' | 'vulnerability' | 'wellbeing';

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Users;
  badge?: () => string | null;
}

export function AnalyticsPanel({
  studentDays,
  staffShifts,
  onUpdateShift,
  onStaffAbsence,
  absentStaffIds,
  coverageSlots,
  searchTerm,
  classBalance,
  substituteReport,
  vulnerabilityMap,
  warnings,
  vulnerabilities,
  staffWellbeing,
}: AnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('personal');

  // Compute badge values
  const deficitClasses = classBalance
    ? [...classBalance.low_grades, ...classBalance.high_grades].filter(c => c.status === 'deficit').length
    : 0;
  const deficitHours = substituteReport?.total_deficit_hours ?? 0;
  const vulnSummary = vulnerabilityMap?.summary;
  const vulnCount = vulnSummary ? vulnSummary.black + vulnSummary.red + vulnSummary.yellow : 0;
  const wellbeingAlerts = staffWellbeing?.staff_with_alerts ?? 0;

  const nonCriticalWarnings = warnings.filter(w => w.severity !== 'error');
  const nonCriticalVulnerabilities = vulnerabilities?.filter(v => v.severity !== 'critical') ?? [];

  const tabs: TabDef[] = [
    { key: 'personal', label: 'Personal', icon: Users },
    {
      key: 'classbalance',
      label: 'Klassbalans',
      icon: Scale,
      badge: () => deficitClasses > 0 ? String(deficitClasses) : null,
    },
    {
      key: 'substitute',
      label: 'Vikarie',
      icon: FileText,
      badge: () => deficitHours > 0 ? `${deficitHours}h` : null,
    },
    {
      key: 'vulnerability',
      label: 'Sårbarhet',
      icon: Shield,
      badge: () => vulnCount > 0 ? String(vulnCount) : null,
    },
    {
      key: 'wellbeing',
      label: 'Välmående',
      icon: Heart,
      badge: () => wellbeingAlerts > 0 ? String(wellbeingAlerts) : null,
    },
  ];

  // Filter staff shifts by search term
  const filteredShifts = searchTerm
    ? staffShifts.filter(s => (s.staff_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : staffShifts;

  return (
    <div className="card no-print overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 pt-3 pb-0 border-b border-surface-100 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const badgeValue = tab.badge?.();

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive ? 'text-primary-700' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {badgeValue && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-500'
                }`}>
                  {badgeValue}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="analytics-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="p-4"
        >
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <StaffSummary studentDays={studentDays} variant="embedded" />
              {coverageSlots && coverageSlots.length > 0 && (
                <CoverageTimeline slots={coverageSlots} variant="embedded" />
              )}
              <div>
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
                  Arbetspass
                </h4>
                <StaffShiftTable
                  shifts={filteredShifts}
                  onUpdateShift={onUpdateShift}
                  onStaffAbsence={onStaffAbsence}
                  absentStaffIds={absentStaffIds}
                />
              </div>
            </div>
          )}

          {activeTab === 'classbalance' && classBalance && (
            <ClassBalancing data={classBalance} variant="embedded" />
          )}
          {activeTab === 'classbalance' && !classBalance && (
            <div className="text-sm text-surface-400 text-center py-8">Ingen data tillgänglig</div>
          )}

          {activeTab === 'substitute' && substituteReport && (
            <SubstituteReport data={substituteReport} variant="embedded" />
          )}
          {activeTab === 'substitute' && !substituteReport && (
            <div className="text-sm text-surface-400 text-center py-8">Ingen data tillgänglig</div>
          )}

          {activeTab === 'vulnerability' && (
            <div className="space-y-4">
              {vulnerabilityMap && (
                <VulnerabilityMap data={vulnerabilityMap} variant="embedded" />
              )}
              {/* Non-critical warnings go here */}
              {(nonCriticalWarnings.length > 0 || nonCriticalVulnerabilities.length > 0) && (
                <WarningBar
                  warnings={nonCriticalWarnings}
                  vulnerabilities={nonCriticalVulnerabilities.length > 0 ? nonCriticalVulnerabilities : undefined}
                />
              )}
              {!vulnerabilityMap && nonCriticalWarnings.length === 0 && (
                <div className="text-sm text-surface-400 text-center py-8">Inga sårbarheter</div>
              )}
            </div>
          )}

          {activeTab === 'wellbeing' && staffWellbeing && (
            <StaffWellbeingPanel data={staffWellbeing} variant="embedded" />
          )}
          {activeTab === 'wellbeing' && !staffWellbeing && (
            <div className="text-sm text-surface-400 text-center py-8">Ingen data tillgänglig</div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
