/**
 * Staff list component — redesigned with Lucide icons and toast notifications
 */

import { useState } from 'react';
import { UserCircle, BookOpen, Palette, Briefcase, UserMinus, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Staff, AbsenceCreate, BulkAbsenceCreate } from '../../types';
import { Button } from '../Common/Button';
import { AbsenceForm } from './AbsenceForm';
import { staffApi } from '../../api/staff';
import { useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';

interface StaffListProps {
  staff: Staff[];
  onStaffSelect: (staff: Staff) => void;
  onCreateNew: () => void;
}

const roleIcons: Record<string, LucideIcon> = {
  elevassistent: UserCircle,
  pedagog: BookOpen,
  fritidspedagog: Palette,
};

const roleLabels: Record<string, string> = {
  elevassistent: 'Elevassistent',
  pedagog: 'Pedagog',
  fritidspedagog: 'Fritidspedagog',
};

export function StaffList({ staff, onStaffSelect, onCreateNew }: StaffListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [selectedStaffForAbsence, setSelectedStaffForAbsence] = useState<Staff | null>(null);
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
  const queryClient = useQueryClient();

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      searchTerm === '' ||
      member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => roleIcons[role] || Briefcase;
  const getRoleLabel = (role: string) => roleLabels[role] || role;

  const handleQuickAbsenceReport = (member: Staff, e: React.MouseEvent) => {
    e.stopPropagation();
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
      toast.error('Kunde inte anmäla frånvaro. Försök igen.');
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
      toast.success(parts.join(' '));
    } catch (error) {
      console.error('Failed to create bulk absences:', error);
      toast.error('Kunde inte anmäla frånvaro. Försök igen.');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-surface-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            Personal ({staff.length})
          </h2>
          <Button onClick={onCreateNew} size="sm">+ Ny Personal</Button>
        </div>

        {/* Search and filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Sök personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base flex-1"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input-base w-auto"
          >
            <option value="all">Alla roller</option>
            <option value="elevassistent">Elevassistent</option>
            <option value="pedagog">Pedagog</option>
            <option value="fritidspedagog">Fritidspedagog</option>
          </select>
        </div>
      </div>

      {/* Staff list */}
      <div className="divide-y divide-surface-100 max-h-[600px] overflow-y-auto">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((member) => {
            const RoleIcon = getRoleIcon(member.role);
            return (
              <div
                key={member.id}
                className="p-4 hover:bg-surface-50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onStaffSelect(member)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
                        <RoleIcon className="h-4 w-4 text-primary-600" />
                      </div>
                      <h3 className="font-medium text-surface-900">
                        {member.first_name} {member.last_name}
                      </h3>
                    </div>

                    <div className="mt-1.5 ml-10.5 flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium">
                        {getRoleLabel(member.role)}
                      </span>

                      {member.care_certifications.length > 0 && (
                        <span className="px-2 py-0.5 bg-success-50 text-success-700 rounded-lg text-xs font-medium">
                          {member.care_certifications.length} certifieringar
                        </span>
                      )}

                      {!member.active && (
                        <span className="px-2 py-0.5 bg-surface-100 text-surface-600 rounded-lg text-xs font-medium">
                          Inaktiv
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleQuickAbsenceReport(member, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded-xl transition-colors"
                      title="Snabb frånvaroanmälan"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Frånvaro
                    </button>
                    <button
                      onClick={() => onStaffSelect(member)}
                      className="text-surface-300 hover:text-surface-500 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-surface-400">
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
