/**
 * WeekPlanningWizard — step-by-step guide for weekly schedule planning.
 *
 * Steps:
 * 1. Skapa vecka (Create week)
 * 2. Hantera frånvaro (Handle absences)
 * 3. Auto-tilldela (Auto-assign staff)
 * 4. Klassbalansering (Class balancing)
 * 5. Specialbehov (Special needs / vulnerability check)
 * 6. Vikarierapport (Substitute report)
 * 7. Publicera (Publish)
 */

import { useState } from 'react';
import {
  X,
  Calendar,
  UserX,
  Wand2,
  Scale,
  Shield,
  FileText,
  Send,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: typeof Calendar;
  actionLabel: string;
}

const STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Skapa vecka',
    description: 'Skapa ett nytt veckoschema eller kopiera från föregående vecka. Elevernas standardtider och personalens arbetspass fylls i automatiskt.',
    icon: Calendar,
    actionLabel: 'Skapa vecka',
  },
  {
    id: 2,
    title: 'Hantera frånvaro',
    description: 'Registrera sjukanmälningar och frånvaro för personal. Klicka på personalnamn i passlistan för att markera som frånvarande.',
    icon: UserX,
    actionLabel: 'Gå till frånvaropanelen',
  },
  {
    id: 3,
    title: 'Auto-tilldela personal',
    description: 'Kör smart auto-tilldelning för varje dag. Systemet matchar personal baserat på certifieringar, preferenser, årskursgrupp och belastning.',
    icon: Wand2,
    actionLabel: 'Kör auto-tilldelning',
  },
  {
    id: 4,
    title: 'Klassbalansering',
    description: 'Granska personalfördelningen mellan klasser. Flytta personal från klasser med överskott till klasser med underskott inom samma årskursgrupp.',
    icon: Scale,
    actionLabel: 'Visa klassbalansering',
  },
  {
    id: 5,
    title: 'Specialbehov & Sårbarheter',
    description: 'Kontrollera att alla elever med vårdbehov har kvalificerad personal. Granska sårbarhetskartan för att hitta single-points-of-failure.',
    icon: Shield,
    actionLabel: 'Visa sårbarhetskarta',
  },
  {
    id: 6,
    title: 'Vikarierapport',
    description: 'Generera en sammanställning av vikarietimmar som behöver bokas. Rapporten visar underskott per dag, frånvarande personal och otäckta behov.',
    icon: FileText,
    actionLabel: 'Visa vikarierapport',
  },
  {
    id: 7,
    title: 'Publicera schema',
    description: 'När schemat är klart, publicera det så att all personal kan se det. Du kan alltid avpublicera och göra ändringar senare.',
    icon: Send,
    actionLabel: 'Publicera',
  },
];

interface WeekPlanningWizardProps {
  hasSchedule: boolean;
  isPublished: boolean;
  onClose: () => void;
  onCreateWeek: () => void;
  onCopyWeek: () => void;
  onAutoAssign: () => void;
  onPublish: () => void;
  onGoToStep: (step: number) => void;
  completedSteps: Set<number>;
}

export function WeekPlanningWizard({
  hasSchedule,
  isPublished,
  onClose,
  onCreateWeek,
  onCopyWeek,
  onAutoAssign,
  onPublish,
  onGoToStep,
  completedSteps,
}: WeekPlanningWizardProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    // Start at first incomplete step
    if (!hasSchedule) return 1;
    for (let i = 2; i <= 7; i++) {
      if (!completedSteps.has(i)) return i;
    }
    return 7;
  });

  const step = STEPS[currentStep - 1];
  const StepIcon = step.icon;

  const handleAction = () => {
    switch (currentStep) {
      case 1:
        // Let user choose between create new or copy
        break;
      case 3:
        onAutoAssign();
        break;
      case 7:
        onPublish();
        break;
      default:
        onGoToStep(currentStep);
        break;
    }
  };

  const canGoNext = currentStep < 7;
  const canGoBack = currentStep > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-elevated max-w-2xl w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-surface-800">Veckoplaneringsguide</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <X className="h-5 w-5 text-surface-400" />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const isActive = s.id === currentStep;
              const isComplete = completedSteps.has(s.id) || (s.id === 1 && hasSchedule) || (s.id === 7 && isPublished);
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(s.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50'
                      : 'hover:bg-surface-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isComplete
                        ? 'bg-emerald-100 text-emerald-600'
                        : isActive
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-surface-100 text-surface-400'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium leading-tight text-center ${
                      isActive ? 'text-primary-700' : 'text-surface-400'
                    }`}
                  >
                    {s.title}
                  </span>
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-6 flex-1">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              completedSteps.has(currentStep) || (currentStep === 1 && hasSchedule) || (currentStep === 7 && isPublished)
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-primary-100 text-primary-600'
            }`}>
              <StepIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-surface-800 mb-1">
                Steg {currentStep}: {step.title}
              </h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {/* Step-specific actions */}
          <div className="mt-6">
            {currentStep === 1 && !hasSchedule && (
              <div className="flex gap-3">
                <button
                  onClick={onCreateWeek}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Skapa ny vecka
                </button>
                <button
                  onClick={onCopyWeek}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-100 text-surface-700 text-sm font-medium hover:bg-surface-200 transition-colors"
                >
                  Kopiera förra veckan
                </button>
              </div>
            )}

            {currentStep === 1 && hasSchedule && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                Veckoschema finns redan. Gå vidare till nästa steg.
              </div>
            )}

            {currentStep === 2 && (
              <div className="px-4 py-3 rounded-xl bg-surface-50 text-surface-600 text-sm">
                Klicka på personalnamn i passlistan nedan för att registrera frånvaro.
                Frånvaropanelen visas automatiskt när personal är markerade som frånvarande.
              </div>
            )}

            {currentStep === 3 && hasSchedule && (
              <button
                onClick={onAutoAssign}
                className="w-full px-4 py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Kör auto-tilldelning för alla dagar
              </button>
            )}

            {(currentStep === 4 || currentStep === 5 || currentStep === 6) && (
              <div className="px-4 py-3 rounded-xl bg-surface-50 text-surface-600 text-sm">
                {currentStep === 4 && 'Klassbalanseringen visas längre ner på sidan. Scrolla ner för att se fördelningen.'}
                {currentStep === 5 && 'Sårbarhetskartan visas längre ner på sidan. Granska risk-matrisen för att säkerställa täckning.'}
                {currentStep === 6 && 'Vikarierapporten visas längre ner på sidan. Exportera vid behov.'}
              </div>
            )}

            {currentStep === 7 && (
              <button
                onClick={onPublish}
                disabled={isPublished}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isPublished ? (
                  <>
                    <Check className="h-4 w-4" />
                    Redan publicerat
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publicera schema
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200">
          <button
            onClick={() => setCurrentStep((p) => Math.max(1, p - 1))}
            disabled={!canGoBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Föregående
          </button>
          <span className="text-xs text-surface-400">
            Steg {currentStep} av {STEPS.length}
          </span>
          <button
            onClick={() => setCurrentStep((p) => Math.min(7, p + 1))}
            disabled={!canGoNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Nästa
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
