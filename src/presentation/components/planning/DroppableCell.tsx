'use client';

import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { createDropZoneId, type DropZoneType } from './types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DroppableCellProps {
  /** User-ID (für User-Zeilen) */
  userId?: string;
  /** Resource-ID (für Resource-Zeilen) */
  resourceId?: string;
  /** Datum der Zelle */
  date: Date;
  /** Ob an diesem Tag eine Abwesenheit vorliegt */
  hasAbsence?: boolean;
  /** Kind-Elemente */
  children: ReactNode;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drop-Zone Zelle im Planning Grid.
 *
 * Ermöglicht das Ablegen von Allocations und Projekt-Phasen.
 * Zeigt visuelles Feedback:
 * - Grün: Valider Drop
 * - Orange: Drop mit Warnung (z.B. Abwesenheit)
 */
export function DroppableCell({
  userId,
  resourceId,
  date,
  hasAbsence,
  children,
  className,
}: DroppableCellProps) {
  const type: DropZoneType = userId ? 'user' : 'resource';
  const entityId = userId ?? resourceId ?? 'unknown';
  const dropZoneId = createDropZoneId(type, entityId, date);

  const { isOver, setNodeRef, active } = useDroppable({
    id: dropZoneId,
    disabled: !userId && !resourceId,
  });

  // Fallback wenn weder userId noch resourceId vorhanden
  if (!userId && !resourceId) {
    return <div className={className}>{children}</div>;
  }

  // Validierung: Kann hier gedroppt werden?
  const isValidDrop = active && !hasAbsence;
  const showWarning = active && hasAbsence;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative min-h-[80px] border-r p-2 transition-colors last:border-r-0',
        className,
        // Hover-State während Drag
        isOver && isValidDrop && 'bg-green-50 ring-2 ring-green-400 ring-inset',
        isOver && showWarning && 'bg-orange-50 ring-2 ring-orange-400 ring-inset',
        // Potenzielle Drop Zone während Drag (nicht hover)
        !isOver && active && 'bg-gray-50/50'
      )}
      data-user-id={userId}
      data-resource-id={resourceId}
      data-date={date.toISOString()}
    >
      {children}

      {/* Drop Indicator */}
      {isOver && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2">
          <div
            className={cn(
              'h-0.5 rounded-full',
              isValidDrop ? 'bg-green-500' : 'bg-orange-500'
            )}
          />
        </div>
      )}
    </div>
  );
}
