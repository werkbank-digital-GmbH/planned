import { describe, it, expect } from 'vitest';

import { ProgressionCalculator } from '../ProgressionCalculator';
import { createSnapshot, createBurnRate } from './test-helpers';

describe('ProgressionCalculator', () => {
  const calc = new ProgressionCalculator();
  const today = new Date('2025-02-03'); // Monday

  describe('calculate()', () => {
    it('calculates basic metrics: remaining, progress, daysUntilDeadline', () => {
      const snapshot = createSnapshot({ ist_hours: 50, plan_hours: 60, soll_hours: 100 });
      const burnRate = createBurnRate({ istBurnRate: 8 });
      const deadline = new Date('2025-02-14'); // Friday, 9 working days away

      const result = calc.calculate(snapshot, burnRate, deadline, today);

      expect(result.remainingHours).toBe(50);
      expect(result.progressPercent).toBe(50);
      expect(result.daysUntilDeadline).toBe(9);
    });

    it('calculates IST completion projection', () => {
      const snapshot = createSnapshot({ ist_hours: 60, soll_hours: 100 });
      const burnRate = createBurnRate({ istBurnRate: 8 });

      const result = calc.calculate(snapshot, burnRate, null, today);

      // remaining=40, rate=8 → 40/8=5 working days
      expect(result.daysRemainingIst).toBe(5);
      expect(result.completionDateIst).toEqual(
        calc.addWorkingDays(today, 5)
      );
    });

    it('calculates PLAN completion projection', () => {
      const snapshot = createSnapshot({ ist_hours: 60, soll_hours: 100 });
      const burnRate = createBurnRate({ istBurnRate: 8, planBurnRate: 10 });

      const result = calc.calculate(snapshot, burnRate, null, today);

      // remaining=40, planRate=10 → 40/10=4
      expect(result.daysRemainingPlan).toBe(4);
    });

    it('calculates positive deadline delta (late)', () => {
      const snapshot = createSnapshot({ ist_hours: 50, soll_hours: 100 });
      // remaining=50, rate=4 → 13 days, deadline 9 days away → delta=+4
      const burnRate = createBurnRate({ istBurnRate: 4 });
      const deadline = new Date('2025-02-14');

      const result = calc.calculate(snapshot, burnRate, deadline, today);

      expect(result.daysRemainingIst).toBe(13);
      expect(result.deadlineDeltaIst).toBe(4); // 13-9=4 days late
    });

    it('calculates negative deadline delta (early)', () => {
      const snapshot = createSnapshot({ ist_hours: 60, soll_hours: 100 });
      // remaining=40, rate=8 → 5 days, deadline 9 days away → delta=-4
      const burnRate = createBurnRate({ istBurnRate: 8 });
      const deadline = new Date('2025-02-14');

      const result = calc.calculate(snapshot, burnRate, deadline, today);

      expect(result.daysRemainingIst).toBe(5);
      expect(result.deadlineDeltaIst).toBe(-4);
    });

    it('returns null projections when burnRate is null', () => {
      const snapshot = createSnapshot({ ist_hours: 50, soll_hours: 100 });

      const result = calc.calculate(snapshot, null, new Date('2025-02-14'), today);

      expect(result.daysRemainingIst).toBeNull();
      expect(result.completionDateIst).toBeNull();
      expect(result.deadlineDeltaIst).toBeNull();
    });

    it('returns null projections when IST burn rate is 0', () => {
      const snapshot = createSnapshot({ ist_hours: 50, soll_hours: 100 });
      const burnRate = createBurnRate({ istBurnRate: 0 });

      const result = calc.calculate(snapshot, burnRate, new Date('2025-02-14'), today);

      expect(result.daysRemainingIst).toBeNull();
    });

    it('returns daysUntilDeadline=0 when no deadline', () => {
      const snapshot = createSnapshot({ ist_hours: 50, soll_hours: 100 });
      const burnRate = createBurnRate({ istBurnRate: 8 });

      const result = calc.calculate(snapshot, burnRate, null, today);

      expect(result.daysUntilDeadline).toBe(0);
      expect(result.deadlineDeltaIst).toBeNull();
    });

    it('calculates capacity gap (plan insufficient)', () => {
      // soll=100, ist=30, plan=50 → remaining=70, futurePlan=max(0,50-30)=20, gap=70-20=50
      const snapshot = createSnapshot({ ist_hours: 30, plan_hours: 50, soll_hours: 100 });

      const result = calc.calculate(snapshot, null, null, today);

      expect(result.capacityGapHours).toBe(50);
      expect(result.capacityGapDays).toBe(50 / 8);
    });

    it('calculates capacity gap = 0 when enough planned', () => {
      // soll=100, ist=30, plan=100 → remaining=70, futurePlan=70, gap=0
      const snapshot = createSnapshot({ ist_hours: 30, plan_hours: 100, soll_hours: 100 });

      const result = calc.calculate(snapshot, null, null, today);

      expect(result.capacityGapHours).toBe(0);
    });

    it('clamps remaining to 0 when IST > SOLL', () => {
      const snapshot = createSnapshot({ ist_hours: 110, soll_hours: 100 });

      const result = calc.calculate(snapshot, null, null, today);

      expect(result.remainingHours).toBe(0);
      expect(result.progressPercent).toBe(110);
    });

    it('handles SOLL = 0 gracefully', () => {
      const snapshot = createSnapshot({ ist_hours: 0, soll_hours: 0 });

      const result = calc.calculate(snapshot, null, null, today);

      expect(result.progressPercent).toBe(0);
      expect(result.remainingHours).toBe(0);
    });
  });

  describe('determineStatus()', () => {
    it('returns "completed" when isCompleted=true', () => {
      expect(calc.determineStatus(100, 0, true, true)).toBe('completed');
    });

    it('returns "completed" when progress ≥ 100 (even if not flagged)', () => {
      expect(calc.determineStatus(110, 5, true, false)).toBe('completed');
    });

    it('returns "not_started" when not started', () => {
      expect(calc.determineStatus(0, null, false, false)).toBe('not_started');
    });

    it('returns "unknown" when delta is null but started', () => {
      expect(calc.determineStatus(50, null, true, false)).toBe('unknown');
    });

    it('returns "ahead" when delta ≤ -5', () => {
      expect(calc.determineStatus(50, -5, true, false)).toBe('ahead');
      expect(calc.determineStatus(50, -10, true, false)).toBe('ahead');
    });

    it('returns "on_track" when delta ≤ 0', () => {
      expect(calc.determineStatus(50, 0, true, false)).toBe('on_track');
      expect(calc.determineStatus(50, -4, true, false)).toBe('on_track');
    });

    it('returns "at_risk" when delta 1-3', () => {
      expect(calc.determineStatus(50, 1, true, false)).toBe('at_risk');
      expect(calc.determineStatus(50, 3, true, false)).toBe('at_risk');
    });

    it('returns "behind" when delta 4-7', () => {
      expect(calc.determineStatus(50, 4, true, false)).toBe('behind');
      expect(calc.determineStatus(50, 7, true, false)).toBe('behind');
    });

    it('returns "critical" when delta > 7', () => {
      expect(calc.determineStatus(50, 8, true, false)).toBe('critical');
      expect(calc.determineStatus(50, 20, true, false)).toBe('critical');
    });

    it('boundary: delta=-4 is on_track (not ahead)', () => {
      expect(calc.determineStatus(50, -4, true, false)).toBe('on_track');
    });
  });

  describe('determineDataQuality()', () => {
    it('returns "good" for ≥5 data points', () => {
      expect(calc.determineDataQuality(5)).toBe('good');
      expect(calc.determineDataQuality(10)).toBe('good');
    });

    it('returns "limited" for 3-4 data points', () => {
      expect(calc.determineDataQuality(3)).toBe('limited');
      expect(calc.determineDataQuality(4)).toBe('limited');
    });

    it('returns "insufficient" for <3 data points', () => {
      expect(calc.determineDataQuality(2)).toBe('insufficient');
      expect(calc.determineDataQuality(0)).toBe('insufficient');
    });
  });

  describe('workingDaysBetween()', () => {
    it('counts Mo-Fr in same week', () => {
      const mon = new Date('2025-02-03');
      const fri = new Date('2025-02-07');
      expect(calc.workingDaysBetween(mon, fri)).toBe(4);
    });

    it('counts across weekend', () => {
      const fri = new Date('2025-02-07');
      const mon = new Date('2025-02-10');
      expect(calc.workingDaysBetween(fri, mon)).toBe(1);
    });

    it('counts across two full weeks', () => {
      const mon1 = new Date('2025-02-03');
      const fri2 = new Date('2025-02-14');
      expect(calc.workingDaysBetween(mon1, fri2)).toBe(9);
    });

    it('returns 0 for same day', () => {
      const mon = new Date('2025-02-03');
      expect(calc.workingDaysBetween(mon, mon)).toBe(0);
    });
  });

  describe('addWorkingDays()', () => {
    it('adds 5 working days from Monday → next Monday', () => {
      const mon = new Date('2025-02-03');
      const result = calc.addWorkingDays(mon, 5);
      expect(result.toISOString().split('T')[0]).toBe('2025-02-10');
    });

    it('adds 1 working day from Friday → next Monday', () => {
      const fri = new Date('2025-02-07');
      const result = calc.addWorkingDays(fri, 1);
      expect(result.toISOString().split('T')[0]).toBe('2025-02-10');
    });

    it('adds 0 working days → same date', () => {
      const mon = new Date('2025-02-03');
      const result = calc.addWorkingDays(mon, 0);
      expect(result.toISOString().split('T')[0]).toBe('2025-02-03');
    });
  });
});
