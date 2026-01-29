/**
 * Main schedule page
 */

import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useScheduleByWeek, useGenerateSchedule, useAISuggestions } from '../hooks/useSchedule';
import { ScheduleViewTabs } from '../components/Schedule/ScheduleViewTabs';
import { Button } from '../components/Common/Button';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { SuggestionPanel, ConflictIndicator } from '../components/AI';
import { getErrorMessage } from '../api';

export function SchedulePage() {
  const {
    currentWeek,
    currentYear,
    setCurrentWeek,
  } = useAppStore();

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Fetch schedule for current week
  const { data: schedule, isLoading, error } = useScheduleByWeek(currentYear, currentWeek);

  // Fetch AI suggestions if schedule exists
  const {
    data: aiSuggestions,
    isLoading: aiLoading,
    refetch: refetchSuggestions,
  } = useAISuggestions(schedule?.id || null);

  // Generate schedule mutation
  const generateMutation = useGenerateSchedule();

  const handleGenerateSchedule = async () => {
    try {
      await generateMutation.mutateAsync({
        week_number: currentWeek,
        year: currentYear,
        force_regenerate: !!schedule, // true if regenerating, false if creating new
      });
      setShowGenerateModal(false);
    } catch (err) {
      console.error('Failed to generate schedule:', err);
    }
  };

  const handlePreviousWeek = () => {
    if (currentWeek > 1) {
      setCurrentWeek(currentWeek - 1, currentYear);
    } else {
      setCurrentWeek(52, currentYear - 1);
    }
  };

  const handleNextWeek = () => {
    if (currentWeek < 52) {
      setCurrentWeek(currentWeek + 1, currentYear);
    } else {
      setCurrentWeek(1, currentYear + 1);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with controls */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            {/* Week navigation */}
            <div className="flex items-center space-x-4">
              <Button size="sm" variant="secondary" onClick={handlePreviousWeek}>
                ← Föregående
              </Button>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Vecka {currentWeek}, {currentYear}
                </h1>
              </div>
              <Button size="sm" variant="secondary" onClick={handleNextWeek}>
                Nästa →
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              {/* Generate button */}
              {!schedule && !isLoading && (
                <Button onClick={() => setShowGenerateModal(true)}>
                  ⚡ Generera Schema
                </Button>
              )}

              {schedule && (
                <Button variant="secondary" onClick={() => setShowGenerateModal(true)}>
                  🔄 Omgenerera
                </Button>
              )}

              {/* AI Suggestions button */}
              {schedule && (
                <>
                  {aiSuggestions && aiSuggestions.length > 0 && (
                    <ConflictIndicator
                      count={aiSuggestions.length}
                      severity="medium"
                      onClick={() => setShowAIPanel(!showAIPanel)}
                    />
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAIPanel(!showAIPanel);
                      if (!showAIPanel) refetchSuggestions();
                    }}
                  >
                    🤖 AI-förslag
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <ErrorMessage
            message={`Kunde inte hämta schema: ${getErrorMessage(error)}`}
          />
        )}

        {/* Generate error */}
        {generateMutation.isError && (
          <ErrorMessage
            message={`Misslyckades generera schema: ${getErrorMessage(generateMutation.error)}`}
          />
        )}

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule view with tabs */}
          <div className={showAIPanel ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <ScheduleViewTabs
              schedule={schedule || null}
              isLoading={isLoading}
            />
          </div>

          {/* AI Panel */}
          {showAIPanel && schedule && (
            <div className="lg:col-span-1">
              <SuggestionPanel
                suggestions={aiSuggestions || []}
                isLoading={aiLoading}
                onApplySuggestion={(suggestionId, actionIndex) => {
                  console.log('Apply suggestion:', suggestionId, actionIndex);
                  // TODO: Implement suggestion application
                  alert('Tillämpning av AI-förslag kommer snart!');
                }}
                onDismissSuggestion={(suggestionId) => {
                  console.log('Dismiss suggestion:', suggestionId);
                  // TODO: Implement suggestion dismissal
                }}
              />
            </div>
          )}
        </div>

        {/* Generate modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Generera Schema
              </h2>
              <p className="text-gray-600 mb-6">
                {schedule
                  ? 'Vill du omgenerera schemat för denna vecka? Befintligt schema kommer att ersättas.'
                  : `Generera schema för vecka ${currentWeek}, ${currentYear}. Detta kan ta upp till 60 sekunder.`}
              </p>

              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowGenerateModal(false)}
                  disabled={generateMutation.isPending}
                >
                  Avbryt
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleGenerateSchedule}
                  isLoading={generateMutation.isPending}
                >
                  {schedule ? 'Omgenerera' : 'Generera'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
