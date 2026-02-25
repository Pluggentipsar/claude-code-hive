/**
 * UndoToast — floating toast at the bottom showing an undo button.
 */

import { motion } from 'framer-motion';

interface UndoToastProps {
  label: string;
  onUndo: () => void;
}

export function UndoToast({ label, onUndo }: UndoToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 no-print">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="bg-surface-900 text-white rounded-2xl shadow-float px-5 py-3 flex items-center gap-4"
      >
        <span className="text-sm">{label}</span>
        <button
          onClick={onUndo}
          className="text-sm font-medium text-primary-300 hover:text-primary-200 underline underline-offset-2 transition-colors"
        >
          Ångra
        </button>
      </motion.div>
    </div>
  );
}
