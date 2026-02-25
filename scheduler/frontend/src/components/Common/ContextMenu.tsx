/**
 * ContextMenu — reusable context menu component.
 * Portals to document.body, positioned at (x, y) with viewport edge detection.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Viewport edge detection
  const adjustedPosition = useAdjustedPosition(x, y);

  return createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      className="fixed z-50 min-w-[180px] bg-white shadow-float rounded-xl border border-surface-200/50 py-1.5 overflow-hidden"
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 rounded-lg mx-0.5 transition-colors ${
              item.danger
                ? 'text-danger-600 hover:bg-danger-50'
                : 'text-surface-700 hover:bg-surface-50'
            }`}
            style={{ width: 'calc(100% - 4px)' }}
          >
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            {item.label}
          </button>
        );
      })}
    </motion.div>,
    document.body
  );
}

function useAdjustedPosition(x: number, y: number) {
  // Simple edge detection - adjust if menu would go off screen
  const menuWidth = 200;
  const menuHeight = 150;
  const padding = 8;

  let adjustedX = x;
  let adjustedY = y;

  if (typeof window !== 'undefined') {
    if (x + menuWidth > window.innerWidth - padding) {
      adjustedX = x - menuWidth;
    }
    if (y + menuHeight > window.innerHeight - padding) {
      adjustedY = y - menuHeight;
    }
    if (adjustedX < padding) adjustedX = padding;
    if (adjustedY < padding) adjustedY = padding;
  }

  return { x: adjustedX, y: adjustedY };
}
