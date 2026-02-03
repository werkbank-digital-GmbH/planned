import type { PhaseSnapshot, BurnRateCalculation, BurnRateTrend } from './types';

/**
 * Berechnet Burn Rates aus historischen Snapshots.
 *
 * IST-Burn-Rate: Differenz der IST-Stunden zwischen aufeinanderfolgenden Tagen
 * Trend-Erkennung: Vergleich erste/zweite Hälfte der Daten (up/down/stable)
 * PLAN-Burn-Rate: Durchschnittliche geplante Stunden pro Snapshot
 */
export class BurnRateCalculator {
  private readonly minDataPoints: number;

  constructor(minDataPoints = 3) {
    this.minDataPoints = minDataPoints;
  }

  /**
   * Berechnet Burn Rates aus einer Liste von Snapshots.
   *
   * @param snapshots - Chronologisch sortierte Snapshots (älteste zuerst)
   * @returns BurnRateCalculation oder null wenn zu wenig Daten
   */
  calculate(snapshots: PhaseSnapshot[]): BurnRateCalculation | null {
    if (snapshots.length < 2) {
      return null;
    }

    // Sortiere chronologisch (älteste zuerst)
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    );

    // IST-Deltas berechnen (Differenz zwischen aufeinanderfolgenden Tagen)
    const istDeltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i].ist_hours - sorted[i - 1].ist_hours;
      const daysBetween = this.daysDiff(sorted[i - 1].snapshot_date, sorted[i].snapshot_date);

      // Nur positive Deltas (Fortschritt) mit mindestens 1 Tag Abstand
      if (delta > 0 && daysBetween > 0) {
        istDeltas.push(delta / daysBetween); // Normalisiert auf Tage
      }
    }

    // IST Burn Rate
    const istBurnRate = this.average(istDeltas);
    const istDataPoints = istDeltas.length;

    // IST Trend: Vergleiche erste und zweite Hälfte
    const istTrend = this.calculateTrend(istDeltas);

    // PLAN-Deltas berechnen
    const planDeltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i].plan_hours - sorted[i - 1].plan_hours;
      const daysBetween = this.daysDiff(sorted[i - 1].snapshot_date, sorted[i].snapshot_date);

      if (daysBetween > 0) {
        planDeltas.push(delta / daysBetween);
      }
    }

    // PLAN Burn Rate (kann auch negativ sein wenn Allocations entfernt wurden)
    const planBurnRate = this.average(planDeltas);
    const planDataPoints = planDeltas.length;

    return {
      istBurnRate,
      istDataPoints,
      istTrend,
      planBurnRate,
      planDataPoints,
    };
  }

  /**
   * Prüft ob genügend Datenpunkte für eine zuverlässige Berechnung vorhanden sind.
   */
  hasEnoughData(snapshots: PhaseSnapshot[]): boolean {
    return snapshots.length >= this.minDataPoints;
  }

  /**
   * Berechnet den Trend basierend auf Vergleich der ersten und zweiten Hälfte.
   */
  private calculateTrend(deltas: number[]): BurnRateTrend {
    if (deltas.length < 4) {
      return 'stable'; // Zu wenig Daten für Trend
    }

    const mid = Math.floor(deltas.length / 2);
    const firstHalf = deltas.slice(0, mid);
    const secondHalf = deltas.slice(mid);

    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);

    // Threshold: 15% Unterschied für Trend
    if (secondAvg > firstAvg * 1.15) {
      return 'up';
    } else if (secondAvg < firstAvg * 0.85) {
      return 'down';
    }
    return 'stable';
  }

  /**
   * Berechnet den Durchschnitt eines Arrays.
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Berechnet die Differenz in Tagen zwischen zwei Datums-Strings.
   */
  private daysDiff(dateA: string, dateB: string): number {
    const a = new Date(dateA);
    const b = new Date(dateB);
    const diffMs = b.getTime() - a.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }
}

/**
 * Singleton-Instanz für einfachen Import.
 */
export const burnRateCalculator = new BurnRateCalculator();
