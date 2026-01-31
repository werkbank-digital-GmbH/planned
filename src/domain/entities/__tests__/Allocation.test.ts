import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { Allocation, type CreateAllocationProps } from '../Allocation';

describe('Allocation', () => {
  const baseProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    projectPhaseId: 'phase-123e4567-e89b-12d3-a456-426614174000',
    date: new Date('2026-02-05'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('User XOR Resource', () => {
    it('should accept allocation with userId only', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
      });

      expect(allocation.userId).toBe('user-123');
      expect(allocation.resourceId).toBeUndefined();
      expect(allocation.isUserAllocation).toBe(true);
      expect(allocation.isResourceAllocation).toBe(false);
    });

    it('should accept allocation with resourceId only', () => {
      const allocation = Allocation.create({
        ...baseProps,
        resourceId: 'resource-123',
      });

      expect(allocation.resourceId).toBe('resource-123');
      expect(allocation.userId).toBeUndefined();
      expect(allocation.isUserAllocation).toBe(false);
      expect(allocation.isResourceAllocation).toBe(true);
    });

    it('should reject allocation with both userId and resourceId', () => {
      expect(() =>
        Allocation.create({
          ...baseProps,
          userId: 'user-123',
          resourceId: 'resource-123',
        })
      ).toThrow(ValidationError);
      expect(() =>
        Allocation.create({
          ...baseProps,
          userId: 'user-123',
          resourceId: 'resource-123',
        })
      ).toThrow('Allocation kann nicht User UND Resource haben');
    });

    it('should reject allocation without userId or resourceId', () => {
      expect(() => Allocation.create(baseProps as CreateAllocationProps)).toThrow(
        ValidationError
      );
      expect(() => Allocation.create(baseProps as CreateAllocationProps)).toThrow(
        'Allocation braucht User ODER Resource'
      );
    });
  });

  describe('create', () => {
    it('should create a valid user allocation', () => {
      const props: CreateAllocationProps = {
        ...baseProps,
        userId: 'user-123',
        plannedHours: 8,
        notes: 'Test notes',
      };

      const allocation = Allocation.create(props);

      expect(allocation.id).toBe(props.id);
      expect(allocation.tenantId).toBe(props.tenantId);
      expect(allocation.projectPhaseId).toBe(props.projectPhaseId);
      expect(allocation.date).toEqual(new Date('2026-02-05'));
      expect(allocation.plannedHours).toBe(8);
      expect(allocation.notes).toBe('Test notes');
    });

    it('should create a valid resource allocation without plannedHours', () => {
      const props: CreateAllocationProps = {
        ...baseProps,
        resourceId: 'resource-123',
        plannedHours: 8, // Should be ignored for resources
      };

      const allocation = Allocation.create(props);

      expect(allocation.resourceId).toBe('resource-123');
      expect(allocation.plannedHours).toBeUndefined();
    });

    it('should default plannedHours to undefined for user allocations', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
      });

      expect(allocation.plannedHours).toBeUndefined();
    });

    it('should throw ValidationError for invalid date', () => {
      expect(() =>
        Allocation.create({
          ...baseProps,
          userId: 'user-123',
          date: new Date('invalid'),
        })
      ).toThrow(ValidationError);
      expect(() =>
        Allocation.create({
          ...baseProps,
          userId: 'user-123',
          date: new Date('invalid'),
        })
      ).toThrow('Gültiges Datum erforderlich');
    });

    it('should trim notes', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
        notes: '  Trimmed notes  ',
      });

      expect(allocation.notes).toBe('Trimmed notes');
    });
  });

  describe('withPlannedHours', () => {
    it('should update plannedHours and return new instance', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
        plannedHours: 8,
      });

      const updated = allocation.withPlannedHours(4);

      expect(updated).not.toBe(allocation); // Immutability
      expect(updated.plannedHours).toBe(4);
      expect(allocation.plannedHours).toBe(8); // Original unchanged
    });

    it('should throw ValidationError for resource allocation', () => {
      const allocation = Allocation.create({
        ...baseProps,
        resourceId: 'resource-123',
      });

      expect(() => allocation.withPlannedHours(4)).toThrow(ValidationError);
      expect(() => allocation.withPlannedHours(4)).toThrow(
        'Resources haben keine plannedHours'
      );
    });

    it('should throw ValidationError for negative hours', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
        plannedHours: 8,
      });

      expect(() => allocation.withPlannedHours(-1)).toThrow(ValidationError);
      expect(() => allocation.withPlannedHours(-1)).toThrow(
        'PlannedHours dürfen nicht negativ sein'
      );
    });

    it('should allow setting plannedHours to 0', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
        plannedHours: 8,
      });

      const updated = allocation.withPlannedHours(0);

      expect(updated.plannedHours).toBe(0);
    });
  });

  describe('withNotes', () => {
    it('should update notes and return new instance', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
        notes: 'Original',
      });

      const updated = allocation.withNotes('Updated notes');

      expect(updated).not.toBe(allocation); // Immutability
      expect(updated.notes).toBe('Updated notes');
      expect(allocation.notes).toBe('Original'); // Original unchanged
    });

    it('should allow empty notes', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
        notes: 'Original',
      });

      const updated = allocation.withNotes('');

      expect(updated.notes).toBe('');
    });
  });

  describe('withDate', () => {
    it('should update date and return new instance', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
      });

      const newDate = new Date('2026-02-10');
      const updated = allocation.withDate(newDate);

      expect(updated).not.toBe(allocation); // Immutability
      expect(updated.date).toEqual(newDate);
      expect(allocation.date).toEqual(new Date('2026-02-05')); // Original unchanged
    });

    it('should throw ValidationError for invalid date', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
      });

      expect(() => allocation.withDate(new Date('invalid'))).toThrow(ValidationError);
    });
  });

  describe('dateString', () => {
    it('should return ISO date string (YYYY-MM-DD)', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
        date: new Date('2026-02-05'),
      });

      expect(allocation.dateString).toBe('2026-02-05');
    });
  });
});
