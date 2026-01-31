import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { UserForSelection } from '../types/selection';
import { useRangeSelection } from '../useRangeSelection';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockUsers: UserForSelection[] = [
  { id: 'user-1', fullName: 'Max Mustermann' },
  { id: 'user-2', fullName: 'Anna Schmidt' },
  { id: 'user-3', fullName: 'Peter Müller' },
];

// Montag der Testwoche
const weekStart = new Date('2026-02-02');

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useRangeSelection', () => {
  describe('initial state', () => {
    it('should start with empty selection', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      expect(result.current.rangeSelection.cells).toHaveLength(0);
      expect(result.current.rangeSelection.isDragging).toBe(false);
      expect(result.current.rangeSelection.previewCells).toHaveLength(0);
    });
  });

  describe('startRangeSelect', () => {
    it('should start range selection on mousedown', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      act(() => {
        result.current.startRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-02'),
        });
      });

      expect(result.current.rangeSelection.isDragging).toBe(true);
      expect(result.current.rangeSelection.startCell).toBeDefined();
      expect(result.current.rangeSelection.startCell?.userId).toBe('user-1');
    });

    it('should set both start and end cell to same position', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      act(() => {
        result.current.startRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-02'),
        });
      });

      expect(result.current.rangeSelection.endCell).toBeDefined();
      expect(result.current.rangeSelection.endCell?.userId).toBe('user-1');
    });
  });

  describe('updateRangeSelect', () => {
    it('should calculate rectangular selection for single user', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Start selection on Monday
      act(() => {
        result.current.startRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-02'), // Monday
        });
      });

      // Extend to Wednesday
      act(() => {
        result.current.updateRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-04'), // Wednesday
        });
      });

      // Should have 3 cells: Mo, Di, Mi
      expect(result.current.rangeSelection.previewCells).toHaveLength(3);
    });

    it('should calculate rectangular selection across multiple users', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Start selection on user-1, Monday
      act(() => {
        result.current.startRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-02'), // Monday
        });
      });

      // Extend to user-2, Wednesday
      act(() => {
        result.current.updateRangeSelect({
          userId: 'user-2',
          date: new Date('2026-02-04'), // Wednesday
        });
      });

      // Should have 6 cells: 2 users × 3 days
      expect(result.current.rangeSelection.previewCells).toHaveLength(6);
    });

    it('should not update if not dragging', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      act(() => {
        result.current.updateRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-02'),
        });
      });

      expect(result.current.rangeSelection.isDragging).toBe(false);
      expect(result.current.rangeSelection.previewCells).toHaveLength(0);
    });
  });

  describe('endRangeSelect', () => {
    it('should finalize selection and stop dragging', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      act(() => {
        result.current.startRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-02'),
        });
      });

      act(() => {
        result.current.updateRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-03'),
        });
      });

      act(() => {
        result.current.endRangeSelect();
      });

      expect(result.current.rangeSelection.isDragging).toBe(false);
      expect(result.current.rangeSelection.cells).toHaveLength(2);
    });

    it('should clear start and end cells after ending', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      act(() => {
        result.current.startRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-02'),
        });
      });

      act(() => {
        result.current.endRangeSelect();
      });

      expect(result.current.rangeSelection.startCell).toBeUndefined();
      expect(result.current.rangeSelection.endCell).toBeUndefined();
    });
  });

  describe('toggleCellSelection', () => {
    it('should select single cell without modifier', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          false
        );
      });

      expect(result.current.rangeSelection.cells).toHaveLength(1);
    });

    it('should add cells with addToSelection=true', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // First selection
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          false
        );
      });

      // Add another with Cmd/Ctrl
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-05') },
          true
        );
      });

      expect(result.current.rangeSelection.cells).toHaveLength(2);
    });

    it('should toggle off already selected cell with addToSelection=true', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Select cell
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          false
        );
      });

      // Toggle same cell off
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          true
        );
      });

      expect(result.current.rangeSelection.cells).toHaveLength(0);
    });

    it('should replace selection without modifier', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Select multiple cells
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          false
        );
      });
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-03') },
          true
        );
      });

      expect(result.current.rangeSelection.cells).toHaveLength(2);

      // Replace with new single selection
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-2', date: new Date('2026-02-04') },
          false
        );
      });

      expect(result.current.rangeSelection.cells).toHaveLength(1);
      expect(result.current.rangeSelection.cells[0].userId).toBe('user-2');
    });
  });

  describe('extendToCell', () => {
    it('should extend selection from last cell to new cell', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Initial selection
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          false
        );
      });

      // Extend with Shift+Click
      act(() => {
        result.current.extendToCell({
          userId: 'user-1',
          date: new Date('2026-02-04'),
        });
      });

      // Should now have 3 cells (Mo, Di, Mi)
      expect(result.current.rangeSelection.cells).toHaveLength(3);
    });

    it('should extend across multiple users', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Initial selection
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          false
        );
      });

      // Extend diagonally
      act(() => {
        result.current.extendToCell({
          userId: 'user-2',
          date: new Date('2026-02-04'),
        });
      });

      // Should have 6 cells: 2 users × 3 days
      expect(result.current.rangeSelection.cells).toHaveLength(6);
    });

    it('should select single cell if no previous selection', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      act(() => {
        result.current.extendToCell({
          userId: 'user-1',
          date: new Date('2026-02-02'),
        });
      });

      expect(result.current.rangeSelection.cells).toHaveLength(1);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Add some selections
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-02') },
          false
        );
      });
      act(() => {
        result.current.toggleCellSelection(
          { userId: 'user-1', date: new Date('2026-02-03') },
          true
        );
      });

      expect(result.current.rangeSelection.cells).toHaveLength(2);

      // Clear
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.rangeSelection.cells).toHaveLength(0);
      expect(result.current.rangeSelection.isDragging).toBe(false);
    });
  });

  describe('weekend handling', () => {
    it('should skip weekends in selection', () => {
      const { result } = renderHook(() =>
        useRangeSelection(mockUsers, weekStart)
      );

      // Select Friday to Monday (spans weekend)
      act(() => {
        result.current.startRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-06'), // Friday
        });
      });

      act(() => {
        result.current.updateRangeSelect({
          userId: 'user-1',
          date: new Date('2026-02-09'), // Next Monday
        });
      });

      // Should only have 2 cells (Fri + Mon), not 4
      expect(result.current.rangeSelection.previewCells).toHaveLength(2);
    });
  });
});
