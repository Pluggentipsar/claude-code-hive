/**
 * BulkAssignBar — floating bar shown when students are selected.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Staff } from '../../types';

interface BulkAssignBarProps {
  selectedCount: number;
  staffList: Staff[];
  onAssign: (staffId: string | null, field: 'fm_staff_id' | 'em_staff_id') => void;
  onClear: () => void;
}

export function BulkAssignBar({ selectedCount, staffList, onAssign, onClear }: BulkAssignBarProps) {
  const [staffId, setStaffId] = useState('');
  const [field, setField] = useState<'fm_staff_id' | 'em_staff_id'>('fm_staff_id');

  const handleAssign = () => {
    onAssign(staffId || null, field);
    setStaffId('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-primary-700 text-white rounded-2xl shadow-float px-5 py-3 flex items-center gap-4 flex-wrap"
    >
      <span className="text-sm font-medium">
        {selectedCount} elev{selectedCount !== 1 ? 'er' : ''} markerade
      </span>

      <select
        value={field}
        onChange={(e) => setField(e.target.value as 'fm_staff_id' | 'em_staff_id')}
        className="text-sm rounded-xl px-3 py-1.5 text-surface-900 border-0 bg-white/90"
      >
        <option value="fm_staff_id">FM Fritids</option>
        <option value="em_staff_id">EM Fritids</option>
      </select>

      <select
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
        className="text-sm rounded-xl px-3 py-1.5 text-surface-900 border-0 bg-white/90 min-w-[160px]"
      >
        <option value="">-- Ingen (ta bort) --</option>
        {staffList.map((s) => (
          <option key={s.id} value={s.id}>
            {s.first_name} {s.last_name}
          </option>
        ))}
      </select>

      <button
        onClick={handleAssign}
        className="bg-white text-primary-700 text-sm font-medium px-4 py-1.5 rounded-xl hover:bg-primary-50 transition-colors"
      >
        Tilldela
      </button>

      <button
        onClick={onClear}
        className="text-primary-200 hover:text-white text-sm underline underline-offset-2 ml-auto transition-colors"
      >
        Avmarkera alla
      </button>
    </motion.div>
  );
}
