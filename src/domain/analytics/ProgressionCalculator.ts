import type {
  PhaseSnapshot,
  BurnRateCalculation,
  ProgressionMetrics,
  InsightStatus,
  DataQuality,
} from './types';

/**
 * Berechnet Prognosen und Fortschritts-Metriken für Phasen.
 *
 * - Verbleibende Stunden (SOLL - IST)
 * - Progress-Prozent
 * - Arbeitstage bis Deadline (Mo-Fr)
 * - IST-Prognose (bei aktueller Rate)
 * - PLAN-Prognose (bei geplanter Rate)
 * - Capacity Gap (was noch geplant werden muss)
 */
export class ProgressionCalculator {
  private readonly hoursPerDay: number;

  constructor(hoursPerDay = 8) {
    this.hoursPerDay = hoursPerDay;
  }

  /**
   * Berechnet alle Progressions-Metriken.
   *
   * @param latestSnapshot - Der neueste Snapshot mit IST/PLAN/SOLL
   * @param burnRate - Berechnete Burn Rate (kann null sein)
   * @param deadline - Phase-Deadline als Date
   * @param today - Heutiges Datum (für Tests überschreibbar)
   */
  calculate(
    latestSnapshot: PhaseSnapshot,
    burnRate: BurnRateCalculation | null,
    deadline: Date | null,
    today: Date = new Date()
  ): ProgressionMetrics {
    const { ist_hours, plan_hours, soll_hours } = latestSnapshot;

    // Basis-Metriken
    const remainingHours = Math.max(0, soll_hours - ist_hours);
    const progressPercent = soll_hours > 0 ? Math.round((ist_hours / soll_hours) * 100) : 0;

    // Arbeitstage bis Deadline
    const daysUntilDeadline = deadline ? this.workingDaysBetween(today, deadline) : 0;

    // IST-Prognose
    let daysRemainingIst: number | null = null;
    let completionDateIst: Date | null = null;
    let deadlineDeltaIst: number | null = null;

    if (burnRate && burnRate.istBurnRate > 0) {
      daysRemainingIst = Math.ceil(remainingHours / burnRate.istBurnRate);
      completionDateIst = this.addWorkingDays(today, daysRemainingIst);

      if (deadline) {
        deadlineDeltaIst = daysRemainingIst - daysUntilDeadline;
      }
    }

    // PLAN-Prognose
    let daysRemainingPlan: number | null = null;
    let completionDatePlan: Date | null = null;
    let deadlineDeltaPlan: number | null = null;

    if (burnRate && burnRate.planBurnRate > 0) {
      daysRemainingPlan = Math.ceil(remainingHours / burnRate.planBurnRate);
      completionDatePlan = this.addWorkingDays(today, daysRemainingPlan);

      if (deadline) {
        deadlineDeltaPlan = daysRemainingPlan - daysUntilDeadline;
      }
    }

    // Capacity Gap: Was noch geplant werden muss
    // (verbleibende Stunden minus bereits geplante zukünftige Stunden)
    const futurePlanHours = Math.max(0, plan_hours - ist_hours);
    const capacityGapHours = Math.max(0, remainingHours - futurePlanHours);
    const capacityGapDays = capacityGapHours / this.hoursPerDay;

    return {
      remainingHours,
      progressPercent,
      daysUntilDeadline,
      daysRemainingIst,
      completionDateIst,
      deadlineDeltaIst,
      daysRemainingPlan,
      completionDatePlan,
      deadlineDeltaPlan,
      capacityGapHours,
      capacityGapDays,
    };
  }

  /**
   * Bestimmt den Status basierend auf der Deadline-Abweichung.
   */
  determineStatus(
    progressPercent: number,
    deadlineDelta: number | null,
    hasStarted: boolean,
    isCompleted: boolean
  ): InsightStatus {
    // Spezialfälle
    if (isCompleted || progressPercent >= 100) {
      return 'completed';
    }
    if (!hasStarted || progressPercent === 0) {
      return 'not_started';
    }
    if (deadlineDelta === null) {
      return 'unknown';
    }

    // Status basierend auf Deadline-Abweichung
    if (deadlineDelta <= -5) return 'ahead'; // 5+ Tage früher
    if (deadlineDelta <= 0) return 'on_track'; // Im Plan
    if (deadlineDelta <= 3) return 'at_risk'; // 1-3 Tage Verzug
    if (deadlineDelta <= 7) return 'behind'; // 4-7 Tage Verzug
    return 'critical'; // 7+ Tage Verzug
  }

  /**
   * Bestimmt die Datenqualität basierend auf der Anzahl Datenpunkte.
   */
  determineDataQuality(dataPoints: number): DataQuality {
    if (dataPoints >= 5) return 'good';
    if (dataPoints >= 3) return 'limited';
    return 'insufficient';
  }

  /**
   * Berechnet die Anzahl Arbeitstage (Mo-Fr) zwischen zwei Daten.
   */
  workingDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (current < endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Nicht Samstag oder Sonntag
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Addiert Arbeitstage zu einem Datum.
   */
  addWorkingDays(start: Date, days: number): Date {
    const result = new Date(start);
    let added = 0;

    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }

    return result;
  }
}

/**
 * Singleton-Instanz für einfachen Import.
 */
export const progressionCalculator = new ProgressionCalculator();
