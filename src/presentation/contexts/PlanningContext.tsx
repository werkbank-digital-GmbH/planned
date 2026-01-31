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
  PoolItem,
  ProjectRowData,
  WeekProjectData,
  WeekSummary,
} from '@/application/queries';

import { getProjectWeekDataAction } from '@/presentation/actions/allocations';

import {
  addMonths,
  formatDateISO,
  getFirstOfMonth,
  getLastOfMonth,
  getMonday,
  getMonthDates,
  getMonthName,
  getWeekDates as getWeekDatesUtil,
} from '@/lib/date-utils';

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

export type ViewMode = 'week' | 'month';

interface PlanningContextValue {
  // State
  weekStart: Date;
  weekEnd: Date;
  calendarWeek: number;
  weekData: WeekProjectData | null;
  isLoading: boolean;
  error: string | null;
  filters: PlanningFilters;
  viewMode: ViewMode;

  // Navigation
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToToday: () => void;
  goToWeek: (date: Date) => void;
  goToNextPeriod: () => void;
  goToPreviousPeriod: () => void;

  // View Mode
  setViewMode: (mode: ViewMode) => void;

  // Filters
  setFilters: (filters: PlanningFilters) => void;

  // Computed - Project-centric (NEU)
  projectRows: ProjectRowData[];
  poolItems: PoolItem[];
  summary: WeekSummary | null;

  // Computed - Period-based (for Month View)
  periodStart: Date;
  periodEnd: Date;
  periodDates: Date[];
  periodLabel: string;

  // Computed - Legacy (für Rückwärtskompatibilität)
  userRows: UserRowData[];
  days: DayData[];

  // Actions
  refresh: () => Promise<void>;
  toggleProjectExpanded: (projectId: string) => void;

  // Helpers
  getAllocationById: (id: string) => AllocationWithDetails | undefined;
  getWeekDates: () => Date[];
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
  const [weekData, setWeekData] = useState<WeekProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlanningFilters>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Load week data
  const loadWeekData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getProjectWeekDataAction({
        weekStart: formatDateISO(weekStart),
        projectId: filters.projectId,
        userId: filters.userId,
      });

      if (result.success) {
        setWeekData(result.data);
        // Automatisch Projekte mit aktiven Phasen aufklappen
        const autoExpanded = new Set<string>();
        for (const row of result.data.projectRows) {
          if (row.hasActivePhasesThisWeek) {
            autoExpanded.add(row.project.id);
          }
        }
        setExpandedProjects((prev) => new Set([...prev, ...autoExpanded]));
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

  // Period-based navigation (depends on viewMode)
  const goToNextPeriod = useCallback(() => {
    if (viewMode === 'week') {
      setWeekStart((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 7);
        return getMonday(next);
      });
    } else {
      setWeekStart((prev) => getFirstOfMonth(addMonths(prev, 1)));
    }
  }, [viewMode]);

  const goToPreviousPeriod = useCallback(() => {
    if (viewMode === 'week') {
      setWeekStart((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() - 7);
        return getMonday(next);
      });
    } else {
      setWeekStart((prev) => getFirstOfMonth(addMonths(prev, -1)));
    }
  }, [viewMode]);

  // Toggle Projekt aufklappen/zuklappen
  const toggleProjectExpanded = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // Computed: ProjectRows mit isExpanded-Status
  const projectRows = useMemo((): ProjectRowData[] => {
    if (!weekData) return [];
    return weekData.projectRows.map((row) => ({
      ...row,
      isExpanded: expandedProjects.has(row.project.id),
    }));
  }, [weekData, expandedProjects]);

  // Computed: Pool Items
  const poolItems = useMemo((): PoolItem[] => {
    return weekData?.poolItems ?? [];
  }, [weekData]);

  // Computed: Period-based values (for Month View)
  const periodStart = useMemo((): Date => {
    if (viewMode === 'week') {
      return weekStart;
    }
    return getFirstOfMonth(weekStart);
  }, [viewMode, weekStart]);

  const periodEnd = useMemo((): Date => {
    if (viewMode === 'week') {
      // Friday
      const friday = new Date(weekStart);
      friday.setDate(friday.getDate() + 4);
      return friday;
    }
    return getLastOfMonth(weekStart);
  }, [viewMode, weekStart]);

  const periodDates = useMemo((): Date[] => {
    if (viewMode === 'week') {
      return getWeekDatesUtil(weekStart);
    }
    return getMonthDates(weekStart);
  }, [viewMode, weekStart]);

  const periodLabel = useMemo((): string => {
    if (viewMode === 'week') {
      const cw = weekData?.calendarWeek ?? 1;
      const year = weekStart.getUTCFullYear();
      return `KW ${cw} / ${year}`;
    }
    const monthName = getMonthName(weekStart);
    const year = weekStart.getUTCFullYear();
    return `${monthName} ${year}`;
  }, [viewMode, weekStart, weekData?.calendarWeek]);

  // Computed: Group allocations by user (Legacy-Unterstützung)
  const userRows = useMemo((): UserRowData[] => {
    if (!weekData) return [];

    // Alle Allocations aus projectRows sammeln
    const userMap = new Map<string, UserRowData>();

    for (const projectRow of weekData.projectRows) {
      for (const phaseRow of projectRow.phases) {
        for (const allocations of Object.values(phaseRow.dayAllocations)) {
          for (const alloc of allocations) {
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
      }
    }

    // Sort by name
    return Array.from(userMap.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'de')
    );
  }, [weekData]);

  // Computed: Days (Legacy-Unterstützung)
  const days = useMemo((): DayData[] => {
    if (!weekData) return [];

    // Wochentage generieren
    const result: DayData[] = [];
    const startDate = new Date(weekData.weekStart);

    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = formatDateISO(date);

      // Alle Allocations für diesen Tag sammeln
      const dayAllocations: AllocationWithDetails[] = [];
      for (const projectRow of weekData.projectRows) {
        for (const phaseRow of projectRow.phases) {
          const phaseAllocations = phaseRow.dayAllocations[dateKey] ?? [];
          dayAllocations.push(...phaseAllocations);
        }
      }

      const totalPlannedHours = dayAllocations.reduce(
        (sum, a) => sum + (a.plannedHours ?? 0),
        0
      );
      const totalActualHours = dayAllocations.reduce(
        (sum, a) => sum + a.actualHours,
        0
      );
      const totalCapacity = poolItems
        .filter((p) => p.type === 'user')
        .reduce((sum, p) => sum + (p.weeklyHours ?? 0) / 5, 0);

      result.push({
        date,
        dayOfWeek: i,
        isToday: formatDateISO(date) === formatDateISO(new Date()),
        allocations: dayAllocations,
        totalPlannedHours,
        totalActualHours,
        totalCapacity,
        utilizationPercent:
          totalCapacity > 0 ? Math.round((totalPlannedHours / totalCapacity) * 100) : 0,
      });
    }

    return result;
  }, [weekData, poolItems]);

  // Helper: Get allocation by ID
  const getAllocationById = useCallback(
    (id: string): AllocationWithDetails | undefined => {
      if (!weekData) return undefined;

      for (const projectRow of weekData.projectRows) {
        for (const phaseRow of projectRow.phases) {
          for (const allocations of Object.values(phaseRow.dayAllocations)) {
            const found = allocations.find((a) => a.id === id);
            if (found) return found;
          }
        }
      }

      return undefined;
    },
    [weekData]
  );

  // Helper: Get week dates
  const getWeekDatesHelper = useCallback((): Date[] => {
    const result: Date[] = [];
    const startDate = new Date(weekStart);

    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      result.push(date);
    }

    return result;
  }, [weekStart]);

  // Context value
  const value: PlanningContextValue = {
    weekStart,
    weekEnd: weekData?.weekEnd ?? weekStart,
    calendarWeek: weekData?.calendarWeek ?? 1,
    weekData,
    isLoading,
    error,
    filters,
    viewMode,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
    goToWeek,
    goToNextPeriod,
    goToPreviousPeriod,
    setViewMode,
    setFilters,
    projectRows,
    poolItems,
    periodStart,
    periodEnd,
    periodDates,
    periodLabel,
    userRows,
    days,
    summary: weekData?.summary ?? null,
    refresh: loadWeekData,
    toggleProjectExpanded,
    getAllocationById,
    getWeekDates: getWeekDatesHelper,
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
