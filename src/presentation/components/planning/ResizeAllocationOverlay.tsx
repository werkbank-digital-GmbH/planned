'use client';

import { MoveHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ResizeAllocationOverlayProps {
  displayName: string;
  currentSpanDays: number;
  isUser: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Overlay das während des Resize-Drags angezeigt wird.
 *
 * Zeigt:
 * - Resize-Icon
 * - Display-Name
 * - Aktuelle Span-Länge in Tagen
 */
export function ResizeAllocationOverlay({
  displayName,
  currentSpanDays,
  isUser,
}: ResizeAllocationOverlayProps) {
  const daysLabel = currentSpanDays === 1 ? '1 Tag' : `${currentSpanDays} Tage`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border',
        'cursor-col-resize pointer-events-none',
        isUser
          ? 'bg-blue-100 border-blue-300 text-blue-800'
          : 'bg-orange-100 border-orange-300 text-orange-800'
      )}
    >
      <MoveHorizontal className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium truncate">{displayName}</span>
      <span className="text-xs opacity-70 whitespace-nowrap">{daysLabel}</span>
    </div>
  );
}
