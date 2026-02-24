/**
 * UndoToast — floating toast at the bottom showing an undo button.
 */

interface UndoToastProps {
  label: string;
  onUndo: () => void;
}

export function UndoToast({ label, onUndo }: UndoToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 no-print">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3">
        <span className="text-sm">{label}</span>
        <button
          onClick={onUndo}
          className="text-sm font-medium text-blue-300 hover:text-blue-200 underline"
        >
          Ångra
        </button>
      </div>
    </div>
  );
}
