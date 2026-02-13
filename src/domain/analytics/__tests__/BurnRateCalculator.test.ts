import { describe, it, expect } from 'vitest';

import { BurnRateCalculator } from '../BurnRateCalculator';
import { createSnapshot } from './test-helpers';

describe('BurnRateCalculator', () => {
  const calc = new BurnRateCalculator();

  describe('calculate()', () => {
    it('returns null for empty array', () => {
      expect(calc.calculate([])).toBeNull();
    });

    it('returns null for a single snapshot (needs ≥2)', () => {
      expect(calc.calculate([createSnapshot()])).toBeNull();
    });

    it('calculates linear IST burn rate from 2 snapshots', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 8 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istBurnRate).toBe(8);
      expect(result.istDataPoints).toBe(1);
      expect(result.istTrend).toBe('stable');
    });

    it('calculates even IST burn rate from 5 snapshots', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 16 }),
        createSnapshot({ snapshot_date: '2025-01-09', ist_hours: 24 }),
        createSnapshot({ snapshot_date: '2025-01-10', ist_hours: 32 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istBurnRate).toBe(8);
      expect(result.istTrend).toBe('stable');
    });

    it('returns 0 burn rate when IST does not progress', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 10 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 10 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 10 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istBurnRate).toBe(0);
      expect(result.istDataPoints).toBe(0);
    });

    it('ignores negative IST deltas', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 20 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 15 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 10 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istBurnRate).toBe(0);
    });

    it('sorts unsorted snapshots chronologically', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-10', ist_hours: 32 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 16 }),
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-09', ist_hours: 24 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 8 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istBurnRate).toBe(8);
    });

    it('normalizes burn rate for day gaps (weekends)', () => {
      // Mo→Mi: 2 days, 16h delta → 8h/day
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 16 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istBurnRate).toBe(8);
    });

    it('calculates positive PLAN burn rate', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', plan_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', plan_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-08', plan_hours: 16 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.planBurnRate).toBe(8);
    });

    it('allows negative PLAN burn rate (allocations removed)', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', plan_hours: 16 }),
        createSnapshot({ snapshot_date: '2025-01-07', plan_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-08', plan_hours: 0 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.planBurnRate).toBe(-8);
    });

    it('counts only positive IST deltas as dataPoints', () => {
      // day1→2: +8 (positive), day2→3: 0 (stagnation), day3→4: +8 (positive), day4→5: +8 (positive)
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-09', ist_hours: 16 }),
        createSnapshot({ snapshot_date: '2025-01-10', ist_hours: 24 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istDataPoints).toBe(3);
      expect(result.istBurnRate).toBe(8);
    });
  });

  describe('trend calculation', () => {
    it('detects trend "up" when second half is >15% faster', () => {
      // 6 snapshots: first half +4/day, second half +8/day (100% increase)
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 4 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-09', ist_hours: 12 }),
        createSnapshot({ snapshot_date: '2025-01-10', ist_hours: 20 }),
        createSnapshot({ snapshot_date: '2025-01-13', ist_hours: 28 }),
        createSnapshot({ snapshot_date: '2025-01-14', ist_hours: 36 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istTrend).toBe('up');
    });

    it('detects trend "down" when second half is <85% of first', () => {
      // 6 snapshots: first half +8/day, second half +4/day (50%)
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 16 }),
        createSnapshot({ snapshot_date: '2025-01-09', ist_hours: 24 }),
        createSnapshot({ snapshot_date: '2025-01-10', ist_hours: 28 }),
        createSnapshot({ snapshot_date: '2025-01-13', ist_hours: 32 }),
        createSnapshot({ snapshot_date: '2025-01-14', ist_hours: 36 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istTrend).toBe('down');
    });

    it('returns "stable" for consistent rate (no weekend gaps)', () => {
      // All consecutive days to avoid normalization artifacts from weekend gaps
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 8 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 16 }),
        createSnapshot({ snapshot_date: '2025-01-09', ist_hours: 24 }),
        createSnapshot({ snapshot_date: '2025-01-10', ist_hours: 32 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istTrend).toBe('stable');
    });

    it('returns "stable" when too few data points for trend (<4 deltas)', () => {
      const snapshots = [
        createSnapshot({ snapshot_date: '2025-01-06', ist_hours: 0 }),
        createSnapshot({ snapshot_date: '2025-01-07', ist_hours: 4 }),
        createSnapshot({ snapshot_date: '2025-01-08', ist_hours: 16 }),
      ];
      const result = calc.calculate(snapshots)!;
      expect(result.istTrend).toBe('stable');
    });
  });

  describe('hasEnoughData()', () => {
    it('returns false with 2 snapshots (default min=3)', () => {
      const snapshots = [createSnapshot(), createSnapshot({ id: 'snap-2' })];
      expect(calc.hasEnoughData(snapshots)).toBe(false);
    });

    it('returns true with 3 snapshots (default min=3)', () => {
      const snapshots = [
        createSnapshot(),
        createSnapshot({ id: 'snap-2' }),
        createSnapshot({ id: 'snap-3' }),
      ];
      expect(calc.hasEnoughData(snapshots)).toBe(true);
    });

    it('respects custom minDataPoints=5: returns false with 4', () => {
      const customCalc = new BurnRateCalculator(5);
      const snapshots = Array.from({ length: 4 }, (_, i) =>
        createSnapshot({ id: `snap-${i}` })
      );
      expect(customCalc.hasEnoughData(snapshots)).toBe(false);
    });

    it('respects custom minDataPoints=5: returns true with 5', () => {
      const customCalc = new BurnRateCalculator(5);
      const snapshots = Array.from({ length: 5 }, (_, i) =>
        createSnapshot({ id: `snap-${i}` })
      );
      expect(customCalc.hasEnoughData(snapshots)).toBe(true);
    });
  });
});
