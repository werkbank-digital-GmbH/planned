'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { OptimisticAllocation } from '@/presentation/contexts/PlanningContext';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ResizeActionsContextValue {
  /** Montag der aktuellen Woche (für getWeekDates-Berechnung) */
  weekStart: Date;
  /** Allocation optimistisch hinzufügen (vor Server-Call) */
  addAllocationOptimistic: (allocation: OptimisticAllocation) => void;
  /** Allocation optimistisch entfernen (vor Server-Call) */
  removeAllocationOptimistic: (allocationId: string) => void;
  /** Temporäre ID durch echte ID ersetzen (nach Server-Response) */
  replaceAllocationId: (tempId: string, realId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const ResizeActionsContext = createContext<ResizeActionsContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface ResizeActionsProviderProps {
  children: ReactNode;
  weekStart: Date;
  addAllocationOptimistic: (allocation: OptimisticAllocation) => void;
  removeAllocationOptimistic: (allocationId: string) => void;
  replaceAllocationId: (tempId: string, realId: string) => void;
}

/**
 * Leichtgewichtiger Context für Resize-Aktionen in AssignmentCards.
 *
 * Entkoppelt die Cards von PlanningContext, sodass sie nur die für
 * Resize benötigten Funktionen konsumieren. Dies verhindert unnötige
 * Re-Renders wenn sich andere PlanningContext-Werte ändern.
 *
 * Wird im DndProvider gewrappt, der ohnehin Zugriff auf usePlanning() hat.
 */
export function ResizeActionsProvider({
  children,
  weekStart,
  addAllocationOptimistic,
  removeAllocationOptimistic,
  replaceAllocationId,
}: ResizeActionsProviderProps) {
  const value = useMemo(
    () => ({
      weekStart,
      addAllocationOptimistic,
      removeAllocationOptimistic,
      replaceAllocationId,
    }),
    [weekStart, addAllocationOptimistic, removeAllocationOptimistic, replaceAllocationId]
  );

  return (
    <ResizeActionsContext.Provider value={value}>
      {children}
    </ResizeActionsContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für Resize-relevante Aktionen in AssignmentCard / SpanningAssignmentCard.
 *
 * Ersetzt `usePlanning()` in diesen Komponenten und reduziert die
 * Kopplung an den großen PlanningContext.
 */
export function useResizeActions(): ResizeActionsContextValue {
  const context = useContext(ResizeActionsContext);
  if (!context) {
    throw new Error('useResizeActions must be used within a ResizeActionsProvider');
  }
  return context;
}
