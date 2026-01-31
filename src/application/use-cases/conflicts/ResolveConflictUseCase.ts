import { Result, type ActionResult } from '@/application/common/ActionResult';
import type {
  AbsenceConflictEntity,
  IAbsenceConflictRepository,
} from '@/application/ports/repositories/IAbsenceConflictRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';

import type { ConflictResolution } from '@/lib/database.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ResolveConflictInput {
  conflictId: string;
  resolution: ConflictResolution;
  resolvedBy: string;
  /** Neues Datum für die Allocation (nur bei resolution='moved') */
  newDate?: Date;
}

export type ResolveConflictResult = ActionResult<{
  conflict: AbsenceConflictEntity;
}>;

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Case: Löst einen Abwesenheits-Konflikt.
 *
 * Optionen:
 * - 'moved': Verschiebt die Allocation auf ein neues Datum
 * - 'deleted': Löscht die Allocation
 * - 'ignored': Markiert den Konflikt als ignoriert (Allocation bleibt)
 */
export class ResolveConflictUseCase {
  constructor(
    private readonly conflictRepository: IAbsenceConflictRepository,
    private readonly allocationRepository: IAllocationRepository
  ) {}

  async execute(input: ResolveConflictInput): Promise<ResolveConflictResult> {
    try {
      // 1. Konflikt laden
      const conflict = await this.conflictRepository.findById(input.conflictId);

      if (!conflict) {
        return Result.fail('CONFLICT_NOT_FOUND', 'Konflikt nicht gefunden');
      }

      if (conflict.resolvedAt) {
        return Result.fail(
          'CONFLICT_ALREADY_RESOLVED',
          'Konflikt wurde bereits gelöst'
        );
      }

      // 2. Je nach Resolution-Typ handeln
      switch (input.resolution) {
        case 'deleted': {
          // Allocation löschen
          await this.allocationRepository.delete(conflict.allocationId);
          break;
        }

        case 'moved': {
          if (!input.newDate) {
            return Result.fail(
              'NEW_DATE_REQUIRED',
              'Neues Datum erforderlich für Verschieben'
            );
          }
          // Allocation auf neues Datum verschieben
          await this.allocationRepository.moveToDate(conflict.allocationId, input.newDate);
          break;
        }

        case 'ignored': {
          // Nichts tun - Allocation bleibt, Konflikt wird nur markiert
          break;
        }

        default:
          return Result.fail('INVALID_RESOLUTION', 'Ungültige Auflösungsart');
      }

      // 3. Konflikt als gelöst markieren
      const resolvedConflict = await this.conflictRepository.resolve(
        input.conflictId,
        input.resolution,
        input.resolvedBy
      );

      return Result.ok({ conflict: resolvedConflict });
    } catch (error) {
      return Result.fail(
        'RESOLVE_CONFLICT_FAILED',
        error instanceof Error ? error.message : 'Unbekannter Fehler'
      );
    }
  }
}
