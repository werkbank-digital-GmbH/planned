import { NotFoundError } from '@/domain/errors';

import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request für GetProjectPhaseSummary
 */
export interface GetProjectPhaseSummaryRequest {
  projectPhaseId: string;
}

/**
 * Zusammenfassung einer Projektphase mit SOLL/PLAN/IST
 */
export interface PhaseSummaryData {
  id: string;
  name: string;
  bereich: string;

  /** SOLL-Stunden aus Asana (budgetHours) */
  sollHours: number;

  /** PLAN-Stunden aus Allocations */
  planHours: number;

  /** IST-Stunden aus TimeEntries */
  istHours: number;

  /** PLAN in Prozent von SOLL */
  planPercentage: number;

  /** IST in Prozent von SOLL */
  istPercentage: number;

  /** Differenz: IST - SOLL */
  delta: number;

  /** Über Budget (IST > SOLL) */
  isOverBudget: boolean;

  /** Überplant (PLAN > SOLL) */
  isOverPlanned: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query: GetProjectPhaseSummary
 *
 * Lädt SOLL/PLAN/IST-Daten für eine Projektphase.
 *
 * Features:
 * - SOLL aus Phase.budgetHours (Asana Custom Field)
 * - PLAN aus Summe der Allocations
 * - IST aus Summe der TimeEntries
 * - Prozent-Berechnungen
 * - Über-Budget und Überplant Flags
 *
 * @example
 * ```typescript
 * const summary = await query.execute({ projectPhaseId: 'phase-123' });
 * // {
 * //   sollHours: 120,
 * //   planHours: 100,
 * //   istHours: 95,
 * //   planPercentage: 83,
 * //   istPercentage: 79,
 * //   ...
 * // }
 * ```
 */
export class GetProjectPhaseSummaryQuery {
  constructor(
    private readonly projectPhaseRepository: IProjectPhaseRepository
  ) {}

  async execute(request: GetProjectPhaseSummaryRequest): Promise<PhaseSummaryData> {
    const { projectPhaseId } = request;

    // Phase laden
    const phase = await this.projectPhaseRepository.findById(projectPhaseId);
    if (!phase) {
      throw new NotFoundError('ProjectPhase', projectPhaseId);
    }

    // SOLL aus Phase (budgetHours)
    const sollHours = phase.budgetHours ?? 0;

    // PLAN aus Allocations (bereits in der Phase als plannedHours via DB-Trigger)
    const planHours = phase.plannedHours;

    // IST aus TimeEntries (bereits in der Phase als actualHours via DB-Trigger)
    const istHours = phase.actualHours;

    // Prozente berechnen
    const planPercentage = sollHours > 0 ? Math.round((planHours / sollHours) * 100) : 0;
    const istPercentage = sollHours > 0 ? Math.round((istHours / sollHours) * 100) : 0;

    return {
      id: phase.id,
      name: phase.name,
      bereich: phase.bereich,
      sollHours,
      planHours,
      istHours,
      planPercentage,
      istPercentage,
      delta: istHours - sollHours,
      isOverBudget: sollHours > 0 && istHours > sollHours,
      isOverPlanned: sollHours > 0 && planHours > sollHours,
    };
  }

  /**
   * Lädt Summaries für mehrere Phasen (z.B. für Projekt-Übersicht).
   */
  async executeForProject(projectId: string): Promise<PhaseSummaryData[]> {
    const phases = await this.projectPhaseRepository.findActiveByProject(projectId);

    return phases.map((phase) => {
      const sollHours = phase.budgetHours ?? 0;
      const planHours = phase.plannedHours;
      const istHours = phase.actualHours;

      const planPercentage = sollHours > 0 ? Math.round((planHours / sollHours) * 100) : 0;
      const istPercentage = sollHours > 0 ? Math.round((istHours / sollHours) * 100) : 0;

      return {
        id: phase.id,
        name: phase.name,
        bereich: phase.bereich,
        sollHours,
        planHours,
        istHours,
        planPercentage,
        istPercentage,
        delta: istHours - sollHours,
        isOverBudget: sollHours > 0 && istHours > sollHours,
        isOverPlanned: sollHours > 0 && planHours > sollHours,
      };
    });
  }
}
