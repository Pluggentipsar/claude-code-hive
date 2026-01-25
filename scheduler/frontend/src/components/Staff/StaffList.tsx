/**
 * Staff list component
 */

import { useState } from 'react';
import type { Staff } from '../../types';
import { Button } from '../Common/Button';

interface StaffListProps {
  staff: Staff[];
  onStaffSelect: (staff: Staff) => void;
  onCreateNew: () => void;
}

export function StaffList({ staff, onStaffSelect, onCreateNew }: StaffListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      searchTerm === '' ||
      member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || member.role === filterRole;

    return matchesSearch && matchesRole;
  });

  // Role labels
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'elevassistent':
        return 'Elevassistent';
      case 'pedagog':
        return 'Pedagog';
      case 'fritidspedagog':
        return 'Fritidspedagog';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'elevassistent':
        return '👤';
      case 'pedagog':
        return '📚';
      case 'fritidspedagog':
        return '🎨';
      default:
        return '👔';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            👥 Personal ({staff.length})
          </h2>
          <Button onClick={onCreateNew}>+ Ny Personal</Button>
        </div>

        {/* Search and filters */}
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Sök personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Alla roller</option>
            <option value="elevassistent">Elevassistent</option>
            <option value="pedagog">Pedagog</option>
            <option value="fritidspedagog">Fritidspedagog</option>
          </select>
        </div>
      </div>

      {/* Staff list */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((member) => (
            <div
              key={member.id}
              onClick={() => onStaffSelect(member)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getRoleIcon(member.role)}</span>
                    <h3 className="font-semibold text-gray-900">
                      {member.first_name} {member.last_name}
                    </h3>
                  </div>

                  <div className="mt-1 flex items-center space-x-3 text-sm text-gray-600">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {getRoleLabel(member.role)}
                    </span>

                    {member.care_certifications.length > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        ⚕️ {member.care_certifications.length} certifieringar
                      </span>
                    )}

                    {!member.active && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                        Inaktiv
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>Ingen personal hittades</p>
          </div>
        )}
      </div>
    </div>
  );
}
