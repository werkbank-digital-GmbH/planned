'use client';

import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectPhaseOverlayProps {
  phaseName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Overlay für eine Projekt-Phase die aus der Sidebar gezogen wird.
 *
 * Zeigt eine minimalistische Karte mit Phase-Name und Plus-Icon
 * um anzuzeigen, dass eine neue Allocation erstellt wird.
 */
export function ProjectPhaseOverlay({ phaseName }: ProjectPhaseOverlayProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-primary/50 bg-primary/10 p-2 shadow-lg',
        'cursor-grabbing'
      )}
      style={{ minWidth: '120px' }}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <Plus className="h-3 w-3" />
        <span className="truncate">{phaseName}</span>
      </div>
    </div>
  );
}
