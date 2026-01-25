/**
 * Main schedule page
 */

import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useScheduleByWeek, useGenerateSchedule, useAISuggestions } from '../hooks/useSchedule';
import { WeekView } from '../components/Schedule/WeekView';
import { DayView } from '../components/Schedule/DayView';
import { Button } from '../components/Common/Button';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { SuggestionPanel, ConflictIndicator } from '../components/AI';
import { getErrorMessage } from '../api';

export function SchedulePage() {
  const {
    currentWeek,
    currentYear,
    selectedView,
    selectedWeekday,
    setCurrentWeek,
    setView,
    setSelectedWeekday,
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
        force_regenerate: false,
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
              {/* View toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setView('week')}
                  className={`px-4 py-2 text-sm font-medium ${
                    selectedView === 'week'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📅 Veckovy
                </button>
                <button
                  onClick={() => setView('day')}
                  className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
                    selectedView === 'day'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📋 Dagvy
                </button>
              </div>

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

        {/* Day selector for day view */}
        {selectedView === 'day' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2">
              {['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'].map((day, index) => (
                <button
                  key={day}
                  onClick={() => setSelectedWeekday(index)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedWeekday === index
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule view */}
          <div className={showAIPanel ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {selectedView === 'week' ? (
              <WeekView
                schedule={schedule || null}
                isLoading={isLoading}
                onAssignmentClick={(assignment) => {
                  console.log('Clicked assignment:', assignment);
                  // TODO: Show assignment details modal
                }}
              />
            ) : (
              schedule && (
                <DayView
                  weekday={selectedWeekday}
                  assignments={schedule.assignments}
                  onAssignmentClick={(assignment) => {
                    console.log('Clicked assignment:', assignment);
                    // TODO: Show assignment details modal
                  }}
                />
              )
            )}
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
