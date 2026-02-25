/**
 * Error message component with Lucide icon and optional retry
 */

import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-2xl bg-danger-50 p-4 border border-danger-100 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-danger-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-danger-800">Ett fel uppstod</h3>
          <p className="mt-1 text-sm text-danger-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-danger-700 hover:text-danger-900 underline underline-offset-2"
            >
              Försök igen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
