/**
 * Simple undo stack for schedule mutations.
 * Stores the previous value and a function to revert.
 */

import { useState, useCallback } from 'react';

export interface UndoEntry {
  label: string;
  revert: () => void;
}

export function useUndo(maxSize = 20) {
  const [stack, setStack] = useState<UndoEntry[]>([]);

  const push = useCallback((entry: UndoEntry) => {
    setStack(prev => [...prev.slice(-(maxSize - 1)), entry]);
  }, [maxSize]);

  const undo = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      last.revert();
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  return {
    canUndo: stack.length > 0,
    lastLabel: stack.length > 0 ? stack[stack.length - 1].label : null,
    push,
    undo,
    clear,
  };
}
