/**
 * BulkAssignBar — floating bar shown when students are selected.
 * Allows assigning one staff member to FM/EM for all selected students at once.
 */

import { useState } from 'react';
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
    <div className="bg-blue-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 flex-wrap">
      <span className="text-sm font-medium">
        {selectedCount} elev{selectedCount !== 1 ? 'er' : ''} markerade
      </span>

      <select
        value={field}
        onChange={(e) => setField(e.target.value as 'fm_staff_id' | 'em_staff_id')}
        className="text-sm rounded px-2 py-1.5 text-gray-900 border-0"
      >
        <option value="fm_staff_id">FM Fritids</option>
        <option value="em_staff_id">EM Fritids</option>
      </select>

      <select
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
        className="text-sm rounded px-2 py-1.5 text-gray-900 border-0 min-w-[160px]"
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
        className="bg-white text-blue-600 text-sm font-medium px-3 py-1.5 rounded hover:bg-blue-50"
      >
        Tilldela
      </button>

      <button
        onClick={onClear}
        className="text-blue-200 hover:text-white text-sm underline ml-auto"
      >
        Avmarkera alla
      </button>
    </div>
  );
}
