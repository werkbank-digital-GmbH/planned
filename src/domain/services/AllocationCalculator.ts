import { WORK_DAYS_PER_WEEK } from '@/lib/constants';

/**
 * AllocationCalculator Domain Service
 *
 * Berechnet die geplanten Stunden pro Allocation.
 *
 * Regeln:
 * - Bei EINER Allocation am Tag: dailyHours = weeklyHours / 5
 * - Bei MEHREREN Allocations: dailyHours / anzahlAllocations
 *
 * @example
 * ```typescript
 * // User mit 40h/Woche, 1 Allocation → 8h
 * AllocationCalculator.calculatePlannedHours(40, 1); // 8
 *
 * // User mit 40h/Woche, 2 Allocations → 4h je
 * AllocationCalculator.calculatePlannedHours(40, 2); // 4
 * ```
 */
export class AllocationCalculator {
  /**
   * Berechnet die geplanten Stunden pro Allocation.
   *
   * @param weeklyHours - Wochenstunden des Users
   * @param allocationsOnSameDay - Anzahl Allocations am gleichen Tag
   * @returns Geplante Stunden für diese Allocation (auf 2 Dezimalstellen gerundet)
   * @throws Error wenn allocationsOnSameDay < 1
   */
  static calculatePlannedHours(
    weeklyHours: number,
    allocationsOnSameDay: number
  ): number {
    if (allocationsOnSameDay < 1) {
      throw new Error('Mindestens eine Allocation erforderlich');
    }

    const dailyHours = weeklyHours / WORK_DAYS_PER_WEEK;
    const hoursPerAllocation = dailyHours / allocationsOnSameDay;

    // Runden auf 2 Dezimalstellen
    return Number(hoursPerAllocation.toFixed(2));
  }

  /**
   * Verteilt Stunden gleichmäßig auf mehrere Allocations.
   *
   * @param weeklyHours - Wochenstunden des Users
   * @param allocationIds - IDs aller Allocations am gleichen Tag
   * @returns Map von Allocation-ID zu plannedHours
   */
  static redistributeHours(
    weeklyHours: number,
    allocationIds: string[]
  ): Map<string, number> {
    if (allocationIds.length === 0) {
      return new Map();
    }

    const hoursPerAllocation = this.calculatePlannedHours(
      weeklyHours,
      allocationIds.length
    );

    return new Map(allocationIds.map((id) => [id, hoursPerAllocation]));
  }

  /**
   * Berechnet die täglichen Arbeitsstunden aus den Wochenstunden.
   *
   * @param weeklyHours - Wochenstunden des Users
   * @returns Tägliche Arbeitsstunden
   */
  static getDailyHours(weeklyHours: number): number {
    return weeklyHours / WORK_DAYS_PER_WEEK;
  }
}
