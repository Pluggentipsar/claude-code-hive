/**
 * Gap Indicator Component - Visual indicator for coverage gaps in schedule
 */

import type { TimeslotGap } from '../../types';

interface GapIndicatorProps {
  gap: TimeslotGap;
  onClick?: () => void;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

const SEVERITY_COLORS = {
  critical: 'bg-red-100 border-red-500 text-red-800',
  warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  ok: 'bg-green-100 border-green-500 text-green-800',
};

const SEVERITY_ICONS = {
  critical: '🚨',
  warning: '⚠️',
  ok: '✓',
};

export function GapIndicator({ gap, onClick }: GapIndicatorProps) {
  const colorClass = SEVERITY_COLORS[gap.severity];
  const icon = SEVERITY_ICONS[gap.severity];
  const shortage = gap.required_staff - gap.available_staff;

  return (
    <div
      onClick={onClick}
      className={`
        border-l-4 rounded p-3 mb-2 cursor-pointer
        transition-all hover:shadow-md
        ${colorClass}
        ${onClick ? 'hover:scale-[1.02]' : ''}
      `}
      title="Klicka för detaljer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{icon}</span>
            <span className="font-bold text-sm">LUCKA</span>
          </div>

          <div className="text-xs space-y-0.5">
            <div>
              <strong>Tid:</strong> {gap.start_time} - {gap.end_time}
            </div>
            <div>
              <strong>Saknas:</strong> {shortage} personal
              {shortage > 1 && <span className="ml-1">(kritiskt)</span>}
            </div>
            <div className="text-xs opacity-75">
              {gap.available_staff}/{gap.required_staff} personal tillgängliga
            </div>
          </div>
        </div>

        {gap.affected_students.length > 0 && (
          <div className="ml-2">
            <div className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-medium">
              {gap.affected_students.length} elever
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Gap Details Modal - Shows detailed information about a gap
 */
interface GapDetailsModalProps {
  gap: TimeslotGap;
  onClose: () => void;
}

export function GapDetailsModal({ gap, onClose }: GapDetailsModalProps) {
  const shortage = gap.required_staff - gap.available_staff;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="border-b pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <span>{SEVERITY_ICONS[gap.severity]}</span>
            <span>Täckningslucka</span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {WEEKDAYS[gap.weekday]} • {gap.start_time} - {gap.end_time}
          </p>
        </div>

        <div className="space-y-4">
          {/* Shortage summary */}
          <div className={`p-3 rounded-lg ${SEVERITY_COLORS[gap.severity]}`}>
            <div className="font-bold mb-1">
              {shortage} personal saknas
            </div>
            <div className="text-sm">
              Behövs: {gap.required_staff} • Tillgängligt: {gap.available_staff}
            </div>
          </div>

          {/* Affected students */}
          {gap.affected_students.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">
                Påverkade elever ({gap.affected_students.length})
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                <ul className="space-y-1 text-sm">
                  {gap.affected_students.map((studentId, index) => (
                    <li key={studentId} className="text-gray-700">
                      {index + 1}. Elev-ID: {studentId.substring(0, 8)}...
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-blue-900 mb-2">
              💡 Rekommendationer
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              {shortage >= 2 ? (
                <>
                  <li>• Kritisk brist - boka vikarier omedelbart</li>
                  <li>• Kontakta ansvarig chef för eskalering</li>
                  <li>• Överväg att minska elevers omsorgstider om möjligt</li>
                </>
              ) : (
                <>
                  <li>• Kontrollera om personal kan arbeta övertid</li>
                  <li>• Se om personal från andra klasser kan hjälpa till</li>
                  <li>• Boka vikarie om tillgängligt</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
