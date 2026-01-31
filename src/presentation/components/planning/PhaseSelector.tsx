'use client';

import { useEffect, useState } from 'react';

import {
  getProjectPhasesAction,
  type ProjectPhaseDTO,
} from '@/presentation/actions/projects';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const BEREICH_LABELS: Record<string, string> = {
  Produktion: 'Produktion',
  Montage: 'Montage',
  Planung: 'Planung',
  Sonstiges: 'Sonstiges',
};

const BEREICH_COLORS: Record<string, string> = {
  Produktion: 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900',
  Montage: 'border-green-300 bg-green-50 hover:bg-green-100 text-green-900',
  Planung: 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900',
  Sonstiges: 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900',
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseSelectorProps {
  /** Projekt-ID dessen Phasen geladen werden */
  projectId: string;
  /** Ausgewählte Phase-ID */
  value?: string;
  /** Callback wenn eine Phase ausgewählt wird */
  onChange: (phaseId: string) => void;
  /** Fehlermeldung */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auswahl der Projektphase, gruppiert nach Bereich.
 *
 * Lädt automatisch die Phasen des ausgewählten Projekts.
 */
export function PhaseSelector({
  projectId,
  value,
  onChange,
  error,
}: PhaseSelectorProps) {
  const [phases, setPhases] = useState<ProjectPhaseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lade Phasen wenn Projekt sich ändert
  useEffect(() => {
    if (!projectId) {
      setPhases([]);
      return;
    }

    const loadPhases = async () => {
      setIsLoading(true);
      try {
        const result = await getProjectPhasesAction(projectId);
        if (result.success) {
          setPhases(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPhases();
  }, [projectId]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Lade Phasen...</div>;
  }

  if (phases.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Keine Phasen für dieses Projekt
      </div>
    );
  }

  // Gruppieren nach Bereich
  const grouped = phases.reduce(
    (acc, phase) => {
      const bereich = phase.bereich || 'Sonstiges';
      if (!acc[bereich]) {
        acc[bereich] = [];
      }
      acc[bereich].push(phase);
      return acc;
    },
    {} as Record<string, ProjectPhaseDTO[]>
  );

  // Sortierte Bereiche
  const sortedBereiche = Object.keys(grouped).sort((a, b) => {
    const order = ['Produktion', 'Montage', 'Planung', 'Sonstiges'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div className="space-y-3">
      {sortedBereiche.map((bereich) => (
        <div key={bereich}>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            {BEREICH_LABELS[bereich] ?? bereich}
          </div>
          <div className="flex flex-wrap gap-2">
            {grouped[bereich].map((phase) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => onChange(phase.id)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  BEREICH_COLORS[bereich] ?? BEREICH_COLORS.Sonstiges,
                  value === phase.id && 'ring-2 ring-primary ring-offset-1'
                )}
              >
                {phase.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
