import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AllocationSnapshot, UndoableAction } from '../types/undo';
import { useUndoRedo } from '../useUndoRedo';

// Mock Server Actions
vi.mock('@/presentation/actions/allocations-direct', () => ({
  createAllocationDirect: vi.fn().mockResolvedValue(undefined),
  deleteAllocationDirect: vi.fn().mockResolvedValue(undefined),
  moveAllocationDirect: vi.fn().mockResolvedValue(undefined),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockAllocationSnapshot: AllocationSnapshot = {
  id: 'alloc-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  projectPhaseId: 'phase-1',
  date: '2025-01-30',
  plannedHours: 8,
  notes: 'Test',
};

const createAction = (id: string = 'alloc-1'): UndoableAction => ({
  type: 'CREATE_ALLOCATION',
  allocation: { ...mockAllocationSnapshot, id },
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useUndoRedo', () => {
  describe('initial state', () => {
    it('should start with empty stacks', () => {
      const { result } = renderHook(() => useUndoRedo());

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
    });

    it('should not be processing initially', () => {
      const { result } = renderHook(() => useUndoRedo());

      expect(result.current.isProcessing).toBe(false);
    });

    it('should have no lastAction initially', () => {
      const { result } = renderHook(() => useUndoRedo());

      expect(result.current.lastAction).toBeUndefined();
    });
  });

  describe('pushAction', () => {
    it('should enable undo after pushing action', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction(createAction());
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.undoCount).toBe(1);
    });

    it('should set lastAction description', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction(createAction());
      });

      expect(result.current.lastAction).toBe('Allocation erstellt');
    });

    it('should clear redo stack when pushing new action', async () => {
      const { result } = renderHook(() => useUndoRedo());

      // Push action
      act(() => {
        result.current.pushAction(createAction());
      });

      // Undo it
      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Push new action
      act(() => {
        result.current.pushAction(createAction('alloc-2'));
      });

      expect(result.current.canRedo).toBe(false);
      expect(result.current.redoCount).toBe(0);
    });

    it('should stack multiple actions', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction(createAction('alloc-1'));
        result.current.pushAction(createAction('alloc-2'));
        result.current.pushAction(createAction('alloc-3'));
      });

      expect(result.current.undoCount).toBe(3);
    });
  });

  describe('undo', () => {
    it('should move action to redo stack on undo', async () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction(createAction());
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(1);
    });

    it('should do nothing when undo stack is empty', async () => {
      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('redo', () => {
    it('should move action back to undo stack on redo', async () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction(createAction());
      });

      await act(async () => {
        await result.current.undo();
      });

      await act(async () => {
        await result.current.redo();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(1);
      expect(result.current.redoCount).toBe(0);
    });

    it('should do nothing when redo stack is empty', async () => {
      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.redo();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('stack limit', () => {
    it('should limit undo stack to 50 actions', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.pushAction(createAction(`alloc-${i}`));
        }
      });

      expect(result.current.undoCount).toBe(50);
    });

    it('should remove oldest actions when exceeding limit', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        for (let i = 0; i < 55; i++) {
          result.current.pushAction(createAction(`alloc-${i}`));
        }
      });

      // Should have the most recent 50 actions
      expect(result.current.undoCount).toBe(50);
    });
  });

  describe('clear', () => {
    it('should clear both stacks', async () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction(createAction('alloc-1'));
        result.current.pushAction(createAction('alloc-2'));
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.undoCount).toBe(1);
      expect(result.current.redoCount).toBe(1);

      act(() => {
        result.current.clear();
      });

      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('action descriptions', () => {
    it('should describe CREATE_ALLOCATION', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction({
          type: 'CREATE_ALLOCATION',
          allocation: mockAllocationSnapshot,
        });
      });

      expect(result.current.lastAction).toBe('Allocation erstellt');
    });

    it('should describe DELETE_ALLOCATION', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction({
          type: 'DELETE_ALLOCATION',
          allocation: mockAllocationSnapshot,
        });
      });

      expect(result.current.lastAction).toBe('Allocation gelöscht');
    });

    it('should describe MOVE_ALLOCATION', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction({
          type: 'MOVE_ALLOCATION',
          allocationId: 'alloc-1',
          from: { userId: 'user-1', date: '2025-01-30', projectPhaseId: 'phase-1' },
          to: { userId: 'user-2', date: '2025-01-31', projectPhaseId: 'phase-1' },
        });
      });

      expect(result.current.lastAction).toBe('Allocation verschoben');
    });

    it('should describe BATCH_CREATE with count', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction({
          type: 'BATCH_CREATE',
          allocations: [
            { ...mockAllocationSnapshot, id: 'alloc-1' },
            { ...mockAllocationSnapshot, id: 'alloc-2' },
            { ...mockAllocationSnapshot, id: 'alloc-3' },
          ],
        });
      });

      expect(result.current.lastAction).toBe('3 Allocations erstellt');
    });

    it('should describe BATCH_DELETE with count', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.pushAction({
          type: 'BATCH_DELETE',
          allocations: [
            { ...mockAllocationSnapshot, id: 'alloc-1' },
            { ...mockAllocationSnapshot, id: 'alloc-2' },
          ],
        });
      });

      expect(result.current.lastAction).toBe('2 Allocations gelöscht');
    });
  });
});
