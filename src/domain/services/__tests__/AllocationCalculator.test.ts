import { describe, it, expect } from 'vitest';

import { AllocationCalculator } from '../AllocationCalculator';

describe('AllocationCalculator', () => {
  describe('calculatePlannedHours', () => {
    it('should calculate 8h for single allocation with 40h/week', () => {
      const hours = AllocationCalculator.calculatePlannedHours(40, 1);
      expect(hours).toBe(8);
    });

    it('should calculate 4h for two allocations with 40h/week', () => {
      const hours = AllocationCalculator.calculatePlannedHours(40, 2);
      expect(hours).toBe(4);
    });

    it('should calculate 2.67h for three allocations with 40h/week', () => {
      const hours = AllocationCalculator.calculatePlannedHours(40, 3);
      expect(hours).toBeCloseTo(2.67, 2);
    });

    it('should handle 32h/week user', () => {
      const hours = AllocationCalculator.calculatePlannedHours(32, 1);
      expect(hours).toBe(6.4);
    });

    it('should handle 38.5h/week user', () => {
      const hours = AllocationCalculator.calculatePlannedHours(38.5, 1);
      expect(hours).toBe(7.7);
    });

    it('should handle part-time user with multiple allocations', () => {
      // 20h/week = 4h/day, split into 2 allocations = 2h each
      const hours = AllocationCalculator.calculatePlannedHours(20, 2);
      expect(hours).toBe(2);
    });

    it('should throw error for zero allocations', () => {
      expect(() => AllocationCalculator.calculatePlannedHours(40, 0)).toThrow(
        'Mindestens eine Allocation erforderlich'
      );
    });

    it('should throw error for negative allocations', () => {
      expect(() => AllocationCalculator.calculatePlannedHours(40, -1)).toThrow(
        'Mindestens eine Allocation erforderlich'
      );
    });

    it('should return 0 for user with 0 weekly hours', () => {
      const hours = AllocationCalculator.calculatePlannedHours(0, 1);
      expect(hours).toBe(0);
    });
  });

  describe('redistributeHours', () => {
    it('should redistribute hours evenly for two allocations', () => {
      const result = AllocationCalculator.redistributeHours(40, ['a', 'b']);

      expect(result.get('a')).toBe(4);
      expect(result.get('b')).toBe(4);
    });

    it('should redistribute hours evenly for three allocations', () => {
      const result = AllocationCalculator.redistributeHours(40, ['a', 'b', 'c']);

      expect(result.get('a')).toBeCloseTo(2.67, 2);
      expect(result.get('b')).toBeCloseTo(2.67, 2);
      expect(result.get('c')).toBeCloseTo(2.67, 2);
    });

    it('should handle single allocation', () => {
      const result = AllocationCalculator.redistributeHours(40, ['a']);

      expect(result.get('a')).toBe(8);
    });

    it('should return empty map for empty array', () => {
      const result = AllocationCalculator.redistributeHours(40, []);

      expect(result.size).toBe(0);
    });
  });

  describe('getDailyHours', () => {
    it('should calculate daily hours from weekly hours', () => {
      expect(AllocationCalculator.getDailyHours(40)).toBe(8);
      expect(AllocationCalculator.getDailyHours(32)).toBe(6.4);
      expect(AllocationCalculator.getDailyHours(20)).toBe(4);
    });
  });
});
