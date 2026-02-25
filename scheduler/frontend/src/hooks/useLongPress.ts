/**
 * useLongPress — detects long press on mobile (touch) and desktop (mouse).
 * Triggers callback after specified delay. Cancels on drag/move.
 */

import { useCallback, useRef } from 'react';

export function useLongPress(
  callback: (e: React.TouchEvent | React.MouseEvent) => void,
  delay = 500
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger on left-click (not right-click — that's native context menu)
      if (e.button !== 0) return;
      triggeredRef.current = false;
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        callback(e);
      }, delay);
    },
    [callback, delay]
  );

  const onMouseUp = useCallback(() => {
    clear();
  }, [clear]);

  const onMouseLeave = useCallback(() => {
    clear();
  }, [clear]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      triggeredRef.current = false;
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        callback(e);
      }, delay);
    },
    [callback, delay]
  );

  const onTouchEnd = useCallback(() => {
    clear();
  }, [clear]);

  const onTouchMove = useCallback(() => {
    clear();
  }, [clear]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
  };
}
