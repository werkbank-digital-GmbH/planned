'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import type { AllocationWithDetails } from '@/application/queries';

import { cn } from '@/lib/utils';

import { AllocationCard } from './AllocationCard';
import type { AllocationDragData } from './types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DraggableAllocationCardProps {
  allocation: AllocationWithDetails;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrapper für AllocationCard mit Drag-Funktionalität.
 *
 * Macht eine Allocation per Drag verschiebbar.
 * Zeigt einen Ghost-Effekt während des Drags.
 */
export function DraggableAllocationCard({
  allocation,
}: DraggableAllocationCardProps) {
  const dragData: AllocationDragData = {
    type: 'allocation',
    allocationId: allocation.id,
    sourceUserId: allocation.user?.id,
    sourceResourceId: allocation.resource?.id,
    sourceDate: allocation.date,
    projectPhaseId: allocation.projectPhase.id,
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `allocation-${allocation.id}`,
    data: dragData,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isDragging && 'opacity-40'
      )}
      {...listeners}
      {...attributes}
    >
      <AllocationCard
        allocation={allocation}
      />
    </div>
  );
}
