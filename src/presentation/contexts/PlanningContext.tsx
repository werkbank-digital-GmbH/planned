'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  AllocationWithDetails,
  DayData,
  WeekAllocationData,
  WeekSummary,
} from '@/application/queries';

import { getAllocationsForWeekAction } from '@/presentation/actions/allocations';

import { formatDateISO, getMonday } from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UserRowData {
  id: string;
  fullName: string;
  weeklyHours: number;
  avatarUrl?: string;
  allocations: AllocationWithDetails[];
}

interface PlanningFilters {
  projectId?: string;
  userId?: string;
}

interface PlanningContextValue {
  // State
  weekStart: Date;
  weekData: WeekAllocationData | null;
  isLoading: boolean;
  error: string | null;
  filters: PlanningFilters;

  // Navigation
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToToday: () => void;
  goToWeek: (date: Date) => void;

  // Filters
  setFilters: (filters: PlanningFilters) => void;

  // Computed
  userRows: UserRowData[];
  days: DayData[];
  summary: WeekSummary | null;

  // Actions
  refresh: () => Promise<void>;

  // Helpers
  getAllocationById: (id: string) => AllocationWithDetails | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const PlanningContext = createContext<PlanningContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface PlanningProviderProps {
  children: ReactNode;
  initialWeekStart?: Date;
}

export function PlanningProvider({
  children,
  initialWeekStart,
}: PlanningProviderProps) {
  // State
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMonday(initialWeekStart ?? new Date())
  );
  const [weekData, setWeekData] = useState<WeekAllocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlanningFilters>({});

  // Load week data
  const loadWeekData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllocationsForWeekAction({
        weekStart: formatDateISO(weekStart),
        projectId: filters.projectId,
        userId: filters.userId,
      });

      if (result.success) {
        setWeekData(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  }, [weekStart, filters]);

  // Initial load and reload on changes
  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  // Navigation functions
  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return getMonday(next);
    });
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return getMonday(next);
    });
  }, []);

  const goToToday = useCallback(() => {
    setWeekStart(getMonday(new Date()));
  }, []);

  const goToWeek = useCallback((date: Date) => {
    setWeekStart(getMonday(date));
  }, []);

  // Computed: Group allocations by user
  const userRows = useMemo((): UserRowData[] => {
    if (!weekData) return [];

    // Collect all unique users from allocations
    const userMap = new Map<string, UserRowData>();

    for (const day of weekData.days) {
      for (const alloc of day.allocations) {
        if (alloc.user) {
          const existing = userMap.get(alloc.user.id);
          if (existing) {
            existing.allocations.push(alloc);
          } else {
            userMap.set(alloc.user.id, {
              id: alloc.user.id,
              fullName: alloc.user.fullName,
              weeklyHours: alloc.user.weeklyHours,
              allocations: [alloc],
            });
          }
        }
      }
    }

    // Sort by name
    return Array.from(userMap.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'de')
    );
  }, [weekData]);

  // Helper: Get allocation by ID
  const getAllocationById = useCallback(
    (id: string): AllocationWithDetails | undefined => {
      if (!weekData) return undefined;

      for (const day of weekData.days) {
        const found = day.allocations.find((a) => a.id === id);
        if (found) return found;
      }

      return undefined;
    },
    [weekData]
  );

  // Context value
  const value: PlanningContextValue = {
    weekStart,
    weekData,
    isLoading,
    error,
    filters,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
    goToWeek,
    setFilters,
    userRows,
    days: weekData?.days ?? [],
    summary: weekData?.summary ?? null,
    refresh: loadWeekData,
    getAllocationById,
  };

  return (
    <PlanningContext.Provider value={value}>
      {children}
    </PlanningContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function usePlanning(): PlanningContextValue {
  const context = useContext(PlanningContext);

  if (!context) {
    throw new Error('usePlanning must be used within a PlanningProvider');
  }

  return context;
}
