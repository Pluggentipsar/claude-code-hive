/**
 * Staff list component
 */

import { useState } from 'react';
import type { Staff, AbsenceCreate, BulkAbsenceCreate } from '../../types';
import { Button } from '../Common/Button';
import { AbsenceForm } from './AbsenceForm';
import { staffApi } from '../../api/staff';
import { useQueryClient } from '@tanstack/react-query';

interface StaffListProps {
  staff: Staff[];
  onStaffSelect: (staff: Staff) => void;
  onCreateNew: () => void;
}

export function StaffList({ staff, onStaffSelect, onCreateNew }: StaffListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [selectedStaffForAbsence, setSelectedStaffForAbsence] = useState<Staff | null>(null);
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
  const queryClient = useQueryClient();

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

  const handleQuickAbsenceReport = (member: Staff, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onStaffSelect
    setSelectedStaffForAbsence(member);
    setShowAbsenceForm(true);
  };

  const handleAbsenceSubmit = async (data: AbsenceCreate) => {
    if (!selectedStaffForAbsence) return;

    setIsSubmittingAbsence(true);
    try {
      await staffApi.createAbsence(selectedStaffForAbsence.id, data);

      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });

      setShowAbsenceForm(false);
      setSelectedStaffForAbsence(null);
    } catch (error) {
      console.error('Failed to create absence:', error);
      alert('Kunde inte anmäla frånvaro. Försök igen.');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  const handleBulkAbsenceSubmit = async (data: BulkAbsenceCreate) => {
    if (!selectedStaffForAbsence) return;

    setIsSubmittingAbsence(true);
    try {
      const result = await staffApi.createBulkAbsences(selectedStaffForAbsence.id, data);

      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });

      setShowAbsenceForm(false);
      setSelectedStaffForAbsence(null);

      const parts = [`${result.count} frånvarodagar skapade.`];
      if (result.skipped_weekends > 0) parts.push(`${result.skipped_weekends} helgdagar hoppades över.`);
      if (result.skipped_existing > 0) parts.push(`${result.skipped_existing} befintliga frånvarodagar hoppades över.`);
      if (result.regenerated_weeks.length > 0) parts.push(`Schema omgenererat för vecka ${result.regenerated_weeks.join(', ')}.`);
      alert(parts.join('\n'));
    } catch (error) {
      console.error('Failed to create bulk absences:', error);
      alert('Kunde inte anmäla frånvaro. Försök igen.');
    } finally {
      setIsSubmittingAbsence(false);
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
              className="p-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onStaffSelect(member)}
                >
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

                {/* Quick action buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleQuickAbsenceReport(member, e)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Snabb frånvaroanmälan"
                  >
                    🤒 Anmäl frånvaro
                  </button>
                  <button
                    onClick={() => onStaffSelect(member)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>Ingen personal hittades</p>
          </div>
        )}
      </div>

      {/* Absence form modal */}
      {showAbsenceForm && selectedStaffForAbsence && (
        <AbsenceForm
          staff={selectedStaffForAbsence}
          onClose={() => {
            setShowAbsenceForm(false);
            setSelectedStaffForAbsence(null);
          }}
          onSubmit={handleAbsenceSubmit}
          onSubmitBulk={handleBulkAbsenceSubmit}
          isSubmitting={isSubmittingAbsence}
        />
      )}
    </div>
  );
}
