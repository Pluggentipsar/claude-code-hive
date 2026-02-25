/**
 * DayTabs — Apple-style segmented control with animated indicator
 */

import { motion } from 'framer-motion';

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

interface DayTabsProps {
  selected: number;
  onSelect: (idx: number) => void;
  warningDays?: Set<number>;
}

export function DayTabs({ selected, onSelect, warningDays }: DayTabsProps) {
  return (
    <div className="card p-1 flex gap-1">
      {DAY_NAMES.map((name, idx) => {
        const isActive = selected === idx;
        const hasWarning = warningDays?.has(idx);
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`relative flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors duration-150 ${
              isActive
                ? 'text-primary-700'
                : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="day-tab-indicator"
                className="absolute inset-0 bg-primary-50 rounded-xl"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {name}
              {hasWarning && (
                <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
