import { describe, expect, it } from 'vitest';

import type { DragData } from '../types/dnd';
import {
  createDropZoneId,
  createPhaseDropZoneId,
  isAllocationDragData,
  isAllocationSpanDragData,
  isPoolItemDragData,
  isProjectPhaseDragData,
  isResizeAllocationDragData,
  parseDropZoneId,
} from '../types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// createDropZoneId
// ═══════════════════════════════════════════════════════════════════════════

describe('createDropZoneId', () => {
  it('should create user drop zone id with correct format', () => {
    const date = new Date('2025-01-30T00:00:00.000Z');
    const id = createDropZoneId('user', 'user-123', date);
    expect(id).toBe('cell-user-user-123-2025-01-30');
  });

  it('should create resource drop zone id with correct format', () => {
    const date = new Date('2025-01-30T00:00:00.000Z');
    const id = createDropZoneId('resource', 'res-456', date);
    expect(id).toBe('cell-resource-res-456-2025-01-30');
  });

  it('should handle UUID entity ids', () => {
    const date = new Date('2025-02-15T00:00:00.000Z');
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const id = createDropZoneId('user', uuid, date);
    expect(id).toBe(`cell-user-${uuid}-2025-02-15`);
  });

  it('should format date as ISO YYYY-MM-DD', () => {
    const date = new Date('2025-12-05T15:30:00.000Z');
    const id = createDropZoneId('user', 'user-1', date);
    expect(id).toMatch(/-2025-12-05$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createPhaseDropZoneId
// ═══════════════════════════════════════════════════════════════════════════

describe('createPhaseDropZoneId', () => {
  it('should create phase drop zone id with correct format', () => {
    const date = new Date('2025-01-30T00:00:00.000Z');
    const phaseId = '550e8400-e29b-41d4-a716-446655440000';
    const projectId = '660e8400-e29b-41d4-a716-446655440001';
    const id = createPhaseDropZoneId(phaseId, projectId, date);
    expect(id).toBe(`phase-${phaseId}-${projectId}-2025-01-30`);
  });

  it('should include phase, project, and date components', () => {
    const date = new Date('2025-06-15T00:00:00.000Z');
    const id = createPhaseDropZoneId('phase-1', 'project-1', date);
    expect(id).toContain('phase-1');
    expect(id).toContain('project-1');
    expect(id).toContain('2025-06-15');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseDropZoneId
// ═══════════════════════════════════════════════════════════════════════════

describe('parseDropZoneId', () => {
  describe('user cells', () => {
    it('should parse user cell id correctly', () => {
      const result = parseDropZoneId('cell-user-user-123-2025-01-30');
      expect(result).toEqual({
        type: 'user',
        userId: 'user-123',
        resourceId: undefined,
        date: new Date('2025-01-30T00:00:00.000Z'),
      });
    });

    it('should parse user cell with UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = parseDropZoneId(`cell-user-${uuid}-2025-02-15`);
      expect(result?.type).toBe('user');
      expect(result?.userId).toBe(uuid);
    });
  });

  describe('resource cells', () => {
    it('should parse resource cell id correctly', () => {
      const result = parseDropZoneId('cell-resource-res-456-2025-01-30');
      expect(result).toEqual({
        type: 'resource',
        userId: undefined,
        resourceId: 'res-456',
        date: new Date('2025-01-30T00:00:00.000Z'),
      });
    });
  });

  describe('phase cells', () => {
    it('should parse phase cell id with UUIDs', () => {
      const phaseId = '550e8400-e29b-41d4-a716-446655440000';
      const projectId = '660e8400-e29b-41d4-a716-446655440001';
      const result = parseDropZoneId(`phase-${phaseId}-${projectId}-2025-03-20`);
      expect(result).toEqual({
        type: 'phase',
        phaseId,
        projectId,
        date: new Date('2025-03-20T00:00:00.000Z'),
      });
    });
  });

  describe('pool zone', () => {
    it('should parse pool-delete-zone', () => {
      const result = parseDropZoneId('pool-delete-zone');
      expect(result?.type).toBe('pool');
      expect(result?.date).toBeInstanceOf(Date);
    });
  });

  describe('invalid ids', () => {
    it('should return null for invalid id format', () => {
      expect(parseDropZoneId('invalid-id')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseDropZoneId('')).toBeNull();
    });

    it('should return null for malformed date', () => {
      expect(parseDropZoneId('cell-user-user-123-invalid-date')).toBeNull();
    });

    it('should return null for partial cell format', () => {
      expect(parseDropZoneId('cell-user-2025-01-30')).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
  describe('isAllocationDragData', () => {
    it('should return true for allocation type', () => {
      const data: DragData = {
        type: 'allocation',
        allocationId: 'alloc-1',
        sourceDate: new Date(),
        projectPhaseId: 'phase-1',
      };
      expect(isAllocationDragData(data)).toBe(true);
    });

    it('should return false for other types', () => {
      const data: DragData = {
        type: 'project-phase',
        projectPhaseId: 'phase-1',
        projectId: 'project-1',
        phaseName: 'Test Phase',
      };
      expect(isAllocationDragData(data)).toBe(false);
    });
  });

  describe('isProjectPhaseDragData', () => {
    it('should return true for project-phase type', () => {
      const data: DragData = {
        type: 'project-phase',
        projectPhaseId: 'phase-1',
        projectId: 'project-1',
        phaseName: 'Test Phase',
      };
      expect(isProjectPhaseDragData(data)).toBe(true);
    });

    it('should return false for other types', () => {
      const data: DragData = {
        type: 'allocation',
        allocationId: 'alloc-1',
        sourceDate: new Date(),
        projectPhaseId: 'phase-1',
      };
      expect(isProjectPhaseDragData(data)).toBe(false);
    });
  });

  describe('isPoolItemDragData', () => {
    it('should return true for pool-item type', () => {
      const data: DragData = {
        type: 'pool-item',
        itemType: 'user',
        itemId: 'user-1',
        itemName: 'Max Mustermann',
        dates: ['2025-01-30'],
      };
      expect(isPoolItemDragData(data)).toBe(true);
    });

    it('should return false for other types', () => {
      const data: DragData = {
        type: 'allocation-span',
        allocationIds: ['1', '2'],
        phaseId: 'phase-1',
        displayName: 'M. Müller',
        spanDays: 2,
        startDayIndex: 0,
      };
      expect(isPoolItemDragData(data)).toBe(false);
    });
  });

  describe('isAllocationSpanDragData', () => {
    it('should return true for allocation-span type', () => {
      const data: DragData = {
        type: 'allocation-span',
        allocationIds: ['alloc-1', 'alloc-2'],
        phaseId: 'phase-1',
        displayName: 'M. Müller',
        spanDays: 2,
        startDayIndex: 0,
      };
      expect(isAllocationSpanDragData(data)).toBe(true);
    });

    it('should return false for other types', () => {
      const data: DragData = {
        type: 'allocation',
        allocationId: 'alloc-1',
        sourceDate: new Date(),
        projectPhaseId: 'phase-1',
      };
      expect(isAllocationSpanDragData(data)).toBe(false);
    });
  });

  describe('isResizeAllocationDragData', () => {
    it('should return true for resize-allocation type', () => {
      const data: DragData = {
        type: 'resize-allocation',
        allocationId: 'alloc-1',
        allocationIds: ['alloc-1'],
        phaseId: 'phase-1',
        projectId: 'project-1',
        startDayIndex: 0,
        currentSpanDays: 1,
        displayName: 'M. Müller',
      };
      expect(isResizeAllocationDragData(data)).toBe(true);
    });

    it('should return true for resize with multiple allocations', () => {
      const data: DragData = {
        type: 'resize-allocation',
        allocationId: 'alloc-1',
        allocationIds: ['alloc-1', 'alloc-2', 'alloc-3'],
        phaseId: 'phase-1',
        projectId: 'project-1',
        startDayIndex: 0,
        currentSpanDays: 3,
        displayName: 'M. Müller',
        userId: 'user-1',
      };
      expect(isResizeAllocationDragData(data)).toBe(true);
    });

    it('should return true for resize with phase constraints', () => {
      const data: DragData = {
        type: 'resize-allocation',
        allocationId: 'alloc-1',
        allocationIds: ['alloc-1'],
        phaseId: 'phase-1',
        projectId: 'project-1',
        startDayIndex: 2,
        currentSpanDays: 1,
        displayName: 'Kran 1',
        resourceId: 'res-1',
        phaseStartDate: '2025-01-27',
        phaseEndDate: '2025-02-28',
      };
      expect(isResizeAllocationDragData(data)).toBe(true);
    });

    it('should return false for allocation type', () => {
      const data: DragData = {
        type: 'allocation',
        allocationId: 'alloc-1',
        sourceDate: new Date(),
        projectPhaseId: 'phase-1',
      };
      expect(isResizeAllocationDragData(data)).toBe(false);
    });

    it('should return false for allocation-span type', () => {
      const data: DragData = {
        type: 'allocation-span',
        allocationIds: ['alloc-1', 'alloc-2'],
        phaseId: 'phase-1',
        displayName: 'M. Müller',
        spanDays: 2,
        startDayIndex: 0,
      };
      expect(isResizeAllocationDragData(data)).toBe(false);
    });
  });
});
