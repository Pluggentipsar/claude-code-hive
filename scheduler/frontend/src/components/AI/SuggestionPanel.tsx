/**
 * AI Suggestion Panel - Shows AI-generated suggestions for conflicts
 */

import { useState } from 'react';
import type { AISuggestion } from '../../types';
import { Button } from '../Common/Button';

interface SuggestionPanelProps {
  suggestions: AISuggestion[];
  onApplySuggestion?: (suggestionId: string, actionIndex: number) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
  isLoading?: boolean;
}

export function SuggestionPanel({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  isLoading,
}: SuggestionPanelProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  const toggleExpanded = (suggestionId: string) => {
    setExpandedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'Hög säkerhet';
      case 'medium':
        return 'Medel säkerhet';
      case 'low':
        return 'Låg säkerhet';
      default:
        return confidence;
    }
  };

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'reassign':
        return '🔄';
      case 'substitute':
        return '👤';
      case 'reduce_hours':
        return '⏰';
      case 'merge_classes':
        return '🔗';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Hämtar AI-förslag...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <span className="text-4xl mb-3 block">✓</span>
          <p className="text-gray-600">Inga konflikter hittades</p>
          <p className="text-sm text-gray-500 mt-1">Schemat ser bra ut!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="text-lg font-bold">AI-assistent</h2>
            <p className="text-sm text-primary-100">
              {suggestions.length} konflikt{suggestions.length !== 1 ? 'er' : ''} hittad
              {suggestions.length !== 1 ? 'e' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Suggestions list */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {suggestions.map((suggestion, index) => {
          const isExpanded = expandedSuggestions.has(suggestion.conflict_id);

          return (
            <div key={suggestion.conflict_id} className="p-4">
              {/* Suggestion header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">⚠️</span>
                    <h3 className="font-semibold text-gray-900">Konflikt #{index + 1}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{suggestion.root_cause}</p>
                </div>

                <button
                  onClick={() => toggleExpanded(suggestion.conflict_id)}
                  className="text-gray-400 hover:text-gray-600 ml-3"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              </div>

              {/* Actions */}
              {isExpanded && (
                <div className="mt-4 space-y-3 pl-7">
                  {suggestion.actions.map((action, actionIndex) => (
                    <div
                      key={actionIndex}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      {/* Action header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <span className="text-xl">{getActionTypeIcon(action.type)}</span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{action.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(
                                  action.confidence
                                )}`}
                              >
                                {getConfidenceLabel(action.confidence)}
                              </span>
                              {action.estimated_cost_sek && (
                                <span className="text-xs text-gray-500">
                                  ~{action.estimated_cost_sek} kr
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <p className="text-sm text-gray-600 mt-2 italic">{action.reasoning}</p>

                      {/* Affected parties */}
                      {(action.affected_staff.length > 0 ||
                        action.affected_students.length > 0) && (
                        <div className="mt-3 text-xs text-gray-500">
                          {action.affected_staff.length > 0 && (
                            <p>
                              Påverkad personal:{' '}
                              {action.affected_staff.slice(0, 3).join(', ')}
                              {action.affected_staff.length > 3 &&
                                ` +${action.affected_staff.length - 3} till`}
                            </p>
                          )}
                          {action.affected_students.length > 0 && (
                            <p>
                              Påverkade elever:{' '}
                              {action.affected_students.slice(0, 3).join(', ')}
                              {action.affected_students.length > 3 &&
                                ` +${action.affected_students.length - 3} till`}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex space-x-2 mt-3">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() =>
                            onApplySuggestion?.(suggestion.conflict_id, actionIndex)
                          }
                        >
                          ✓ Godkänn
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onDismissSuggestion?.(suggestion.conflict_id)}
                        >
                          ✗ Avslå
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">
          💡 AI-förslag genereras av Claude Sonnet 4.5 baserat på dina schemaläggningsregler
        </p>
      </div>
    </div>
  );
}
