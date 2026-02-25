/**
 * AbsencePopover — inline popover for student absence type.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AbsentType } from '../../types/weekSchedule';

interface AbsencePopoverProps {
  currentType: AbsentType;
  onChange: (type: AbsentType) => void;
}

const OPTIONS: { value: AbsentType; label: string; short: string; color: string }[] = [
  { value: 'none', label: 'Närvarande', short: '\u2713', color: 'text-success-600 bg-success-50 hover:bg-success-100' },
  { value: 'full_day', label: 'Heldag', short: 'H', color: 'text-danger-600 bg-danger-50 hover:bg-danger-100' },
  { value: 'am', label: 'FM (före lunch)', short: 'FM', color: 'text-warning-600 bg-warning-50 hover:bg-warning-100' },
  { value: 'pm', label: 'EM (efter lunch)', short: 'EM', color: 'text-warning-600 bg-warning-50 hover:bg-warning-100' },
];

export function AbsencePopover({ currentType, onChange }: AbsencePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = OPTIONS.find(o => o.value === currentType) || OPTIONS[0];
  const isAbsent = currentType !== 'none';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-7 h-6 rounded-lg text-xs font-bold transition-colors ${
          isAbsent
            ? currentType === 'full_day'
              ? 'bg-danger-500 text-white hover:bg-danger-600'
              : 'bg-warning-400 text-white hover:bg-warning-500'
            : 'bg-surface-200 text-surface-400 hover:bg-surface-300'
        }`}
        title={current.label}
      >
        {isAbsent ? current.short : 'F'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-50 mt-1 w-44 bg-white border border-surface-200 rounded-xl shadow-elevated overflow-hidden"
          >
            {OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  currentType === opt.value ? 'font-semibold bg-primary-50' : 'hover:bg-surface-50'
                }`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span className={`inline-flex items-center justify-center w-6 h-5 rounded-md text-xs font-bold ${opt.color}`}>
                  {opt.short}
                </span>
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
