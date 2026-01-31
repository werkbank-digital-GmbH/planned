'use client';

import { ExternalLink, Layers } from 'lucide-react';

import type { PhaseDetailDTO } from '@/presentation/actions/project-details';
import { Button } from '@/presentation/components/ui/button';

import { PhaseCard } from './PhaseCard';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectPhasesSectionProps {
  phases: PhaseDetailDTO[];
  asanaUrl?: string;
  onEditPhase?: (phaseId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Phasen-Sektion der Projekt-Detailseite.
 *
 * Zeigt:
 * - Section-Header mit Titel und Asana-Link
 * - Liste aller Projektphasen als PhaseCards
 */
export function ProjectPhasesSection({
  phases,
  asanaUrl,
  onEditPhase,
}: ProjectPhasesSectionProps) {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">PHASEN</h2>
        </div>

        {asanaUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={asanaUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              In Asana öffnen
            </a>
          </Button>
        )}
      </div>

      {/* Phases List */}
      {phases.length > 0 ? (
        <div className="space-y-3">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              onEdit={onEditPhase}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          <Layers className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Keine Phasen vorhanden</p>
          <p className="text-sm text-gray-400 mt-1">
            Phasen werden aus Asana synchronisiert
          </p>
        </div>
      )}
    </section>
  );
}
