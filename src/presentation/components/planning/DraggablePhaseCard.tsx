'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import type { PhaseBereich } from '@/domain/types';

import { formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { ProjectPhaseDragData } from './types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PhaseCardData {
  id: string;
  name: string;
  bereich: PhaseBereich;
  projectId: string;
  projectName: string;
  budgetHours?: number;
}

interface DraggablePhaseCardProps {
  phase: PhaseCardData;
}

// Bereich zu Tailwind Farben mapping
const BEREICH_BG_COLORS: Record<PhaseBereich, string> = {
  produktion: 'bg-green-50 border-green-200 hover:bg-green-100',
  montage: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  externes_gewerk: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  nicht_definiert: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
};

const BEREICH_DOT_COLORS: Record<PhaseBereich, string> = {
  produktion: 'bg-green-500',
  montage: 'bg-orange-500',
  externes_gewerk: 'bg-blue-500',
  nicht_definiert: 'bg-gray-500',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draggable Karte für eine Projektphase in der Sidebar.
 *
 * Kann auf das Planning Grid gezogen werden um neue Allocations zu erstellen.
 * Zeigt Phase-Name und Bereich-Farbe.
 */
export function DraggablePhaseCard({ phase }: DraggablePhaseCardProps) {
  const dragData: ProjectPhaseDragData = {
    type: 'project-phase',
    projectPhaseId: phase.id,
    projectId: phase.projectId,
    phaseName: phase.name,
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `phase-${phase.id}`,
      data: dragData,
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const bgColor = BEREICH_BG_COLORS[phase.bereich];
  const dotColor = BEREICH_DOT_COLORS[phase.bereich];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex cursor-grab items-center gap-2 rounded border px-2 py-1.5 text-xs transition-colors',
        bgColor,
        isDragging && 'cursor-grabbing opacity-50'
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-3 w-3 flex-shrink-0 text-gray-400" />
      <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', dotColor)} />
      <span className="truncate">{phase.name}</span>
      {phase.budgetHours !== undefined && (
        <span className="ml-auto flex-shrink-0 text-[10px] text-gray-500">
          {formatHoursWithUnit(phase.budgetHours)}
        </span>
      )}
    </div>
  );
}
