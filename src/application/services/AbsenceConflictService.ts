import type { Absence } from '@/domain/entities/Absence';

import type {
  AbsenceConflictEntity,
  CreateConflictInput,
  IAbsenceConflictRepository,
} from '@/application/ports/repositories/IAbsenceConflictRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';

import type { ConflictResolution } from '@/lib/database.types';

/**
 * Service zur Erkennung und Verwaltung von Konflikten zwischen Allocations und Abwesenheiten.
 *
 * Wichtig: Konflikte BLOCKIEREN NICHT, sondern WARNEN nur.
 * Es ist erlaubt, Allocations für abwesende Mitarbeiter anzulegen.
 *
 * Dieser Service erweitert den AbsenceConflictChecker um:
 * - Persistierung von Konflikten in der Datenbank
 * - Auflösung von Konflikten (moved, deleted, ignored)
 * - Automatisches Entfernen von Konflikten bei Absence-Löschung
 *
 * @example
 * ```typescript
 * const service = new AbsenceConflictService(
 *   allocationRepository,
 *   conflictRepository
 * );
 *
 * // Konflikte für eine Absence erkennen und speichern
 * const conflicts = await service.detectAndRecordConflicts(absence);
 *
 * // Konflikt lösen
 * await service.resolveConflict(conflictId, 'moved', userId);
 * ```
 */
export class AbsenceConflictService {
  constructor(
    private readonly allocationRepository: IAllocationRepository,
    private readonly conflictRepository: IAbsenceConflictRepository
  ) {}

  /**
   * Erkennt und speichert Konflikte für eine Abwesenheit.
   *
   * Findet alle Allocations im Abwesenheitszeitraum und erstellt
   * für jede eine Konflikt-Entität (falls nicht bereits vorhanden).
   *
   * @param absence Die zu prüfende Abwesenheit
   * @returns Array der neu erstellten Konflikte
   */
  async detectAndRecordConflicts(absence: Absence): Promise<AbsenceConflictEntity[]> {
    // Alle Allocations im Abwesenheits-Zeitraum finden
    const allocations = await this.allocationRepository.findByUserAndDateRange(
      absence.userId,
      absence.startDate,
      absence.endDate
    );

    const newConflicts: CreateConflictInput[] = [];

    for (const allocation of allocations) {
      // Prüfen ob bereits ein Konflikt existiert
      const existing = await this.conflictRepository.findByAllocationAndAbsence(
        allocation.id,
        absence.id
      );

      if (!existing) {
        newConflicts.push({
          tenantId: absence.tenantId,
          allocationId: allocation.id,
          absenceId: absence.id,
          userId: absence.userId,
          date: allocation.date,
          absenceType: absence.type,
        });
      }
    }

    if (newConflicts.length === 0) {
      return [];
    }

    // Alle neuen Konflikte in einer Batch-Operation speichern
    return this.conflictRepository.saveMany(newConflicts);
  }

  /**
   * Löst einen Konflikt.
   *
   * @param conflictId Die ID des Konflikts
   * @param resolution Wie der Konflikt gelöst wurde: moved, deleted, ignored
   * @param resolvedBy Die User-ID des Lösenden
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    resolvedBy: string
  ): Promise<AbsenceConflictEntity> {
    return this.conflictRepository.resolve(conflictId, resolution, resolvedBy);
  }

  /**
   * Entfernt alle Konflikte für eine Abwesenheit.
   *
   * Wird aufgerufen wenn eine Abwesenheit gelöscht wird.
   * (Auch automatisch via ON DELETE CASCADE in der DB)
   *
   * @param absenceId Die ID der gelöschten Abwesenheit
   */
  async removeConflictsForAbsence(absenceId: string): Promise<void> {
    await this.conflictRepository.deleteByAbsenceId(absenceId);
  }

  /**
   * Entfernt alle Konflikte für eine Allocation.
   *
   * Wird aufgerufen wenn eine Allocation gelöscht wird.
   * (Auch automatisch via ON DELETE CASCADE in der DB)
   *
   * @param allocationId Die ID der gelöschten Allocation
   */
  async removeConflictsForAllocation(allocationId: string): Promise<void> {
    await this.conflictRepository.deleteByAllocationId(allocationId);
  }

  /**
   * Aktualisiert Konflikte wenn eine Abwesenheit geändert wird.
   *
   * - Entfernt Konflikte die nicht mehr im neuen Zeitraum liegen
   * - Erstellt neue Konflikte für erweiterten Zeitraum
   *
   * @param oldAbsence Die alte Abwesenheit (vor der Änderung)
   * @param newAbsence Die neue Abwesenheit (nach der Änderung)
   */
  async updateConflictsForAbsence(
    oldAbsence: Absence,
    newAbsence: Absence
  ): Promise<AbsenceConflictEntity[]> {
    // Wenn sich User oder Zeitraum geändert hat, alle alten Konflikte entfernen
    // und neu erkennen
    if (
      oldAbsence.userId !== newAbsence.userId ||
      oldAbsence.startDate.getTime() !== newAbsence.startDate.getTime() ||
      oldAbsence.endDate.getTime() !== newAbsence.endDate.getTime()
    ) {
      await this.removeConflictsForAbsence(oldAbsence.id);
      return this.detectAndRecordConflicts(newAbsence);
    }

    // Nur Typ geändert - keine Neuberechnung nötig
    return [];
  }
}
