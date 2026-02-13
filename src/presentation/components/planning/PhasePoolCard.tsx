'use client';

import { useDraggable } from '@dnd-kit/core';

import { Badge } from '@/presentation/components/ui/badge';
import type { TeamPhasePoolItem } from '@/presentation/contexts/PlanningContext';

import { cn } from '@/lib/utils';

import type { ProjectPhaseDragData } from './types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhasePoolCardProps {
  phase: TeamPhasePoolItem;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getBereichColor(bereich: string): string {
  switch (bereich) {
    case 'montage':
      return 'bg-orange-100 text-orange-700';
    case 'produktion':
      return 'bg-purple-100 text-purple-700';
    case 'externes_gewerk':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getBereichLabel(bereich: string): string {
  const labels: Record<string, string> = {
    produktion: 'PROD',
    montage: 'MONT',
    externes_gewerk: 'EXT',
  };
  return labels[bereich] ?? bereich.toUpperCase().slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draggable Phasen-Karte für den Team View ResourcePool.
 *
 * Wird aus dem Pool auf UserRow-Tageszellen gezogen,
 * um neue Allocations zu erstellen.
 */
export function PhasePoolCard({ phase }: PhasePoolCardProps) {
  const dragData: ProjectPhaseDragData = {
    type: 'project-phase',
    projectPhaseId: phase.phaseId,
    projectId: phase.projectId,
    phaseName: phase.phaseName,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-phase-${phase.phaseId}`,
    data: dragData,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md border border-gray-200 bg-white',
        'cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-sm transition-all',
        isDragging && 'opacity-50'
      )}
    >
      <Badge variant="outline" className={cn('text-[9px] px-1 py-0 border-0 shrink-0', getBereichColor(phase.bereich))}>
        {getBereichLabel(phase.bereich)}
      </Badge>
      <span className="text-xs truncate">{phase.phaseName}</span>
    </div>
  );
}
