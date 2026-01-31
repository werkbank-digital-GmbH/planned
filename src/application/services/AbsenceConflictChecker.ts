import type { Absence } from '@/domain/entities/Absence';
import type { Allocation } from '@/domain/entities/Allocation';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';

/**
 * Service zur Erkennung von Konflikten zwischen Allocations und Abwesenheiten.
 *
 * Wichtig: Konflikte BLOCKIEREN NICHT, sondern WARNEN nur.
 * Es ist erlaubt, Allocations für abwesende Mitarbeiter anzulegen.
 *
 * @example
 * ```typescript
 * const checker = new AbsenceConflictChecker(absenceRepository);
 *
 * // Einzelne Konfliktprüfung
 * const hasConflict = await checker.hasConflict('user-123', new Date('2026-02-06'));
 *
 * // Batch-Prüfung für viele Allocations
 * const conflicts = await checker.getConflictsForAllocations(allocations);
 * ```
 */
export class AbsenceConflictChecker {
  constructor(private readonly absenceRepository: IAbsenceRepository) {}

  /**
   * Prüft ob ein Konflikt für einen User an einem Datum existiert.
   */
  async hasConflict(userId: string, date: Date): Promise<boolean> {
    const absence = await this.getConflictingAbsence(userId, date);
    return absence !== null;
  }

  /**
   * Gibt die konfliktierende Abwesenheit zurück oder null.
   */
  async getConflictingAbsence(userId: string, date: Date): Promise<Absence | null> {
    const absences = await this.absenceRepository.findByUserAndDateRange(userId, date, date);

    return absences.find((a) => a.includesDate(date)) ?? null;
  }

  /**
   * Batch-Prüfung: Findet Konflikte für mehrere Allocations.
   *
   * Optimiert durch Gruppierung nach User und Date-Range-Queries.
   *
   * @returns Map von Allocation-ID zu konfliktierende Absence
   */
  async getConflictsForAllocations(allocations: Allocation[]): Promise<Map<string, Absence>> {
    const conflicts = new Map<string, Absence>();

    // Filtere nur User-Allocations (keine Resource-Allocations)
    const userAllocations = allocations.filter((a) => a.userId);
    if (userAllocations.length === 0) {
      return conflicts;
    }

    // Gruppiere nach User und lade Absences effizient
    const userAllocationsMap = this.groupByUser(userAllocations);

    for (const [userId, userAllocs] of userAllocationsMap) {
      const dates = userAllocs.map((a) => a.date);
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      const absences = await this.absenceRepository.findByUserAndDateRange(
        userId,
        minDate,
        maxDate
      );

      for (const allocation of userAllocs) {
        const conflict = absences.find((a) => a.includesDate(allocation.date));
        if (conflict) {
          conflicts.set(allocation.id, conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Gruppiert Allocations nach User-ID.
   */
  private groupByUser(allocations: Allocation[]): Map<string, Allocation[]> {
    const map = new Map<string, Allocation[]>();

    for (const allocation of allocations) {
      if (!allocation.userId) continue;

      const existing = map.get(allocation.userId) ?? [];
      map.set(allocation.userId, [...existing, allocation]);
    }

    return map;
  }
}
