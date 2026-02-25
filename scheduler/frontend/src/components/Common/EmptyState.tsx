/**
 * EmptyState — icon + title + description + optional action button
 */

import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-surface-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-surface-700">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-surface-500 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
