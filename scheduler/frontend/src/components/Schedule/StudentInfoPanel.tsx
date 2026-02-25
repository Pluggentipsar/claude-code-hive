/**
 * StudentInfoPanel — slide-over modal showing student details.
 * Used from DayGrid context menu "Visa elevinfo".
 */

import { X, Star, ShieldCheck, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudent } from '../../hooks/useStudents';
import { CareTimesTable } from '../Students/CareTimesTable';
import { useNavigate } from 'react-router-dom';

interface StudentInfoPanelProps {
  studentId: string;
  onClose: () => void;
}

export function StudentInfoPanel({ studentId, onClose }: StudentInfoPanelProps) {
  const { data: student, isLoading } = useStudent(studentId);
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-surface-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-md bg-white shadow-modal h-full overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-surface-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-surface-900">Elevinfo</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading && (
          <div className="p-6 text-center text-surface-400">Laddar elevinfo...</div>
        )}

        {student && (
          <div className="p-6 space-y-6">
            {/* Name and basic info */}
            <div>
              <h3 className="text-xl font-semibold text-surface-900">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-sm text-surface-500 mt-1">Årskurs {student.grade}</p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {student.has_care_needs && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent-50 text-accent-700 rounded-lg text-sm font-medium">
                  <Star className="h-3.5 w-3.5" />
                  Vårdbehov
                </span>
              )}
              {student.requires_double_staffing && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-warning-50 text-warning-700 rounded-lg text-sm font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Dubbelbemanning
                </span>
              )}
              {!student.has_care_needs && !student.requires_double_staffing && (
                <span className="text-sm text-surface-400">Inga särskilda behov</span>
              )}
            </div>

            {/* Notes */}
            {student.notes && (
              <div className="bg-surface-50 p-4 rounded-xl">
                <h4 className="text-sm font-semibold text-surface-800 mb-2">Anteckningar</h4>
                <p className="text-sm text-surface-600">{student.notes}</p>
              </div>
            )}

            {/* Care Times */}
            <div className="bg-surface-50 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-surface-800 mb-3">Omsorgstider</h4>
              <CareTimesTable studentId={studentId} readOnly />
            </div>

            {/* Link to edit */}
            <button
              type="button"
              onClick={() => {
                navigate('/classes');
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Redigera i Klasser & Elever
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
