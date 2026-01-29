/**
 * Impact Summary Component - Shows impact of an absence on scheduling
 */

import type { AbsenceImpactResponse } from '../../types';

interface ImpactSummaryProps {
  impact: AbsenceImpactResponse | null;
  isLoading?: boolean;
}

const SEVERITY_COLORS = {
  no_impact: 'bg-green-50 border-green-200 text-green-800',
  minor: 'bg-blue-50 border-blue-200 text-blue-800',
  major: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
};

const SEVERITY_ICONS = {
  no_impact: '✅',
  minor: 'ℹ️',
  major: '⚠️',
  critical: '🚨',
};

const SEVERITY_LABELS = {
  no_impact: 'Ingen påverkan',
  minor: 'Mindre påverkan',
  major: 'Större påverkan',
  critical: 'Kritisk påverkan',
};

export function ImpactSummary({ impact, isLoading }: ImpactSummaryProps) {
  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          <span className="text-gray-600">Kontrollerar påverkan...</span>
        </div>
      </div>
    );
  }

  if (!impact) {
    return null;
  }

  const colorClass = SEVERITY_COLORS[impact.severity];
  const icon = SEVERITY_ICONS[impact.severity];
  const label = SEVERITY_LABELS[impact.severity];

  return (
    <div className={`border-2 rounded-lg p-4 ${colorClass}`}>
      {/* Severity header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h4 className="font-bold text-lg">{label}</h4>
        </div>
        {impact.can_generate ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            Schema kan genereras
          </span>
        ) : (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            Schema kan EJ genereras
          </span>
        )}
      </div>

      {/* Message */}
      {impact.message && (
        <p className="text-sm mb-3 font-medium">{impact.message}</p>
      )}

      {/* Affected students */}
      {impact.affected_students.length > 0 && (
        <div className="mb-3">
          <h5 className="font-semibold text-sm mb-2">
            Påverkade elever ({impact.affected_students.length})
          </h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {impact.affected_students.map((student) => (
              <div
                key={student.id}
                className="text-sm bg-white bg-opacity-50 rounded px-2 py-1 flex items-center justify-between"
              >
                <span>{student.full_name}</span>
                <span className="text-xs text-gray-600">
                  Årskurs {student.grade}
                  {student.requires_double_staffing && ' • Dubbelbemanning'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative staff suggestions */}
      {impact.alternative_staff.length > 0 && (
        <div>
          <h5 className="font-semibold text-sm mb-2">
            Möjliga ersättare ({impact.alternative_staff.length})
          </h5>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {impact.alternative_staff.map((staff) => (
              <div
                key={staff.id}
                className="text-sm bg-white bg-opacity-50 rounded px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{staff.full_name}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {Math.round(staff.match_score)}% match
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {staff.reason}
                </div>
                {staff.matching_certifications.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Certifieringar: {staff.matching_certifications.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No alternatives warning */}
      {impact.alternative_staff.length === 0 && impact.affected_students.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-300 rounded px-3 py-2 text-sm">
          <strong>⚠️ Ingen ersättare hittad</strong>
          <p className="text-xs mt-1">
            Ingen personal med rätt certifieringar och tillgänglighet hittades.
            Du kan behöva boka vikarie eller ändra elevers omsorgstider.
          </p>
        </div>
      )}

      {/* No impact message */}
      {impact.severity === 'no_impact' && (
        <p className="text-sm text-green-700">
          Denna frånvaro påverkar inte schemat. Personal arbetar inte denna dag/tid.
        </p>
      )}
    </div>
  );
}
