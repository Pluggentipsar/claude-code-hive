/**
 * AbsencePopover — inline popover for student absence type.
 * Appears when clicking the absence button in DayGrid.
 */

import { useState, useRef, useEffect } from 'react';
import type { AbsentType } from '../../types/weekSchedule';

interface AbsencePopoverProps {
  currentType: AbsentType;
  onChange: (type: AbsentType) => void;
}

const OPTIONS: { value: AbsentType; label: string; short: string; color: string }[] = [
  { value: 'none', label: 'N\u00e4rvarande', short: '\u2713', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
  { value: 'full_day', label: 'Heldag', short: 'H', color: 'text-red-600 bg-red-50 hover:bg-red-100' },
  { value: 'am', label: 'FM (f\u00f6re lunch)', short: 'FM', color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
  { value: 'pm', label: 'EM (efter lunch)', short: 'EM', color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
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
        className={`w-7 h-6 rounded text-xs font-bold transition-colors ${
          isAbsent
            ? currentType === 'full_day'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-orange-400 text-white hover:bg-orange-500'
            : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
        }`}
        title={current.label}
      >
        {isAbsent ? current.short : 'F'}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                currentType === opt.value ? 'font-semibold bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-xs font-bold ${opt.color}`}>
                {opt.short}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
