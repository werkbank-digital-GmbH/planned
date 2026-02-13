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
  PhaseRowData,
  PoolItem,
  ProjectRowData,
  WeekProjectData,
  WeekSummary,
} from '@/application/queries';

import { getProjectWeekDataAction } from '@/presentation/actions/allocations';
import type { MonthWeek } from '@/presentation/components/planning/utils/month-week-utils';
import { groupMonthIntoWeeks } from '@/presentation/components/planning/utils/month-week-utils';

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

export type ViewMode = 'week' | 'month' | 'team';

export interface TeamPhasePoolItem {
  projectId: string;
  projectName: string;
  projectStatus: string;
  phaseId: string;
  phaseName: string;
  bereich: string;
  budgetHours?: number;
  plannedHours?: number;
  isActiveThisWeek: boolean;
}

export interface TeamPhasePoolGroup {
  projectId: string;
  projectName: string;
  projectStatus: string;
  phases: TeamPhasePoolItem[];
}

/**
 * Optimistic Allocation für lokale Updates vor Server-Response.
 */
export interface OptimisticAllocation {
  id: string; // Temporäre ID (z.B. "temp-{uuid}")
  userId?: string;
  userName?: string;
  resourceId?: string;
  resourceName?: string;
  projectPhaseId: string;
  date: string; // ISO-String
  plannedHours: number;
}

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
  highlightPhaseId: string | null;

  // Slide Transition
  slideDirection: 'left' | 'right' | null;
  clearSlideDirection: () => void;

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

  // Computed - Month View (Multi-Week)
  monthWeeks: MonthWeek[];
  monthProjectRows: ProjectRowData[];
  monthPoolItems: PoolItem[];
  isMonthLoading: boolean;

  // Computed - Team View
  allUserRows: UserRowData[];
  teamPhasePool: TeamPhasePoolGroup[];

  // Computed - Legacy (für Rückwärtskompatibilität)
  userRows: UserRowData[];
  days: DayData[];

  // Actions
  refresh: () => Promise<void>;
  toggleProjectExpanded: (projectId: string) => void;

  // Optimistic Update Functions
  addAllocationOptimistic: (allocation: OptimisticAllocation) => void;
  removeAllocationOptimistic: (allocationId: string) => void;
  moveAllocationOptimistic: (
    allocationId: string,
    newDate: string,
    newPhaseId?: string
  ) => void;
  replaceAllocationId: (tempId: string, realId: string) => void;

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
  initialDate?: string;
  highlightPhaseId?: string;
  initialUserId?: string;
}

export function PlanningProvider({
  children,
  initialWeekStart,
  initialDate,
  highlightPhaseId: highlightPhaseIdProp,
  initialUserId,
}: PlanningProviderProps) {
  // State
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (initialDate) {
      return getMonday(new Date(initialDate));
    }
    return getMonday(initialWeekStart ?? new Date());
  });
  const [weekData, setWeekData] = useState<WeekProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlanningFilters>(() => {
    if (initialUserId) {
      return { userId: initialUserId };
    }
    return {};
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [highlightPhaseId] = useState<string | null>(
    highlightPhaseIdProp ?? null
  );
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  const clearSlideDirection = useCallback(() => {
    setSlideDirection(null);
  }, []);

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

  // ─────────────────────────────────────────────────────────────────────────
  // MONTH VIEW: Multi-Week Data Fetching
  // ─────────────────────────────────────────────────────────────────────────

  const [monthWeekDataMap, setMonthWeekDataMap] = useState<Map<string, WeekProjectData>>(
    new Map()
  );
  const [isMonthLoading, setIsMonthLoading] = useState(false);

  // Berechne monthWeeks aus weekStart (nur relevant im Month-Mode)
  const monthWeeks = useMemo((): MonthWeek[] => {
    if (viewMode !== 'month') return [];
    return groupMonthIntoWeeks(weekStart);
  }, [viewMode, weekStart]);

  // Multi-Week Fetch für Monatsansicht
  useEffect(() => {
    if (viewMode !== 'month' || monthWeeks.length === 0) return;

    let cancelled = false;

    async function loadMonthData() {
      setIsMonthLoading(true);

      try {
        const results = await Promise.all(
          monthWeeks.map((week) =>
            getProjectWeekDataAction({
              weekStart: week.mondayISO,
              projectId: filters.projectId,
              userId: filters.userId,
            })
          )
        );

        if (cancelled) return;

        const newMap = new Map<string, WeekProjectData>();
        const autoExpanded = new Set<string>();

        results.forEach((result, index) => {
          if (result.success) {
            newMap.set(monthWeeks[index].mondayISO, result.data);
            // Auto-expand projects with active phases
            for (const row of result.data.projectRows) {
              if (row.hasActivePhasesThisWeek) {
                autoExpanded.add(row.project.id);
              }
            }
          }
        });

        setMonthWeekDataMap(newMap);
        setExpandedProjects((prev) => new Set([...prev, ...autoExpanded]));
      } catch {
        // Individual week errors are handled per-week; ignore aggregate
      } finally {
        if (!cancelled) setIsMonthLoading(false);
      }
    }

    loadMonthData();

    return () => {
      cancelled = true;
    };
  }, [viewMode, monthWeeks, filters]);

  // Computed: Merged monthProjectRows (union aller Wochen)
  const monthProjectRows = useMemo((): ProjectRowData[] => {
    if (monthWeekDataMap.size === 0) return [];

    // Sammle alle Projekte über alle Wochen, merge dayAllocations
    const projectMap = new Map<
      string,
      {
        project: ProjectRowData['project'];
        phaseMap: Map<
          string,
          {
            phase: PhaseRowData['phase'];
            dayAllocations: Record<string, AllocationWithDetails[]>;
            isActiveThisWeek: boolean;
            insightStatus?: PhaseRowData['insightStatus'];
          }
        >;
        weeklyPlannedHours: number;
        totalBudgetHours: number;
        totalActualHours: number;
        remainingHours: number;
        timelineStart?: Date;
        timelineEnd?: Date;
        hasActivePhasesThisWeek: boolean;
      }
    >();

    for (const weekData of monthWeekDataMap.values()) {
      for (const row of weekData.projectRows) {
        let existing = projectMap.get(row.project.id);
        if (!existing) {
          existing = {
            project: row.project,
            phaseMap: new Map(),
            weeklyPlannedHours: 0,
            totalBudgetHours: row.totalBudgetHours,
            totalActualHours: row.totalActualHours,
            remainingHours: row.remainingHours,
            timelineStart: row.timelineStart,
            timelineEnd: row.timelineEnd,
            hasActivePhasesThisWeek: false,
          };
          projectMap.set(row.project.id, existing);
        }

        // Aggregiere KPIs
        existing.weeklyPlannedHours += row.weeklyPlannedHours;
        if (row.hasActivePhasesThisWeek) {
          existing.hasActivePhasesThisWeek = true;
        }
        // Budget/Actual: Nimm den höchsten Wert (identisch über Wochen)
        existing.totalBudgetHours = Math.max(existing.totalBudgetHours, row.totalBudgetHours);
        existing.totalActualHours = Math.max(existing.totalActualHours, row.totalActualHours);

        // Merge Phasen
        for (const phase of row.phases) {
          let existingPhase = existing.phaseMap.get(phase.phase.id);
          if (!existingPhase) {
            existingPhase = {
              phase: phase.phase,
              dayAllocations: {},
              isActiveThisWeek: false,
              insightStatus: phase.insightStatus,
            };
            existing.phaseMap.set(phase.phase.id, existingPhase);
          }

          if (phase.isActiveThisWeek) {
            existingPhase.isActiveThisWeek = true;
          }

          // Merge dayAllocations
          for (const [dateKey, allocs] of Object.entries(phase.dayAllocations)) {
            if (!existingPhase.dayAllocations[dateKey]) {
              existingPhase.dayAllocations[dateKey] = allocs;
            }
          }
        }
      }
    }

    // Konvertiere Map → ProjectRowData[]
    return Array.from(projectMap.values()).map(
      (data): ProjectRowData => ({
        project: data.project,
        phases: Array.from(data.phaseMap.values()).map(
          (ph): PhaseRowData => ({
            phase: ph.phase,
            dayAllocations: ph.dayAllocations,
            isActiveThisWeek: ph.isActiveThisWeek,
            insightStatus: ph.insightStatus,
          })
        ),
        weeklyPlannedHours: data.weeklyPlannedHours,
        totalBudgetHours: data.totalBudgetHours,
        totalActualHours: data.totalActualHours,
        remainingHours: data.remainingHours,
        timelineStart: data.timelineStart,
        timelineEnd: data.timelineEnd,
        isExpanded: expandedProjects.has(data.project.id),
        hasActivePhasesThisWeek: data.hasActivePhasesThisWeek,
      })
    );
  }, [monthWeekDataMap, expandedProjects]);

  // Computed: Merged monthPoolItems (availability über alle Wochen konkateniert)
  const monthPoolItems = useMemo((): PoolItem[] => {
    if (monthWeekDataMap.size === 0) return [];

    const poolMap = new Map<string, PoolItem>();

    // Sortierung nach Wochen-Key ist entscheidend, damit die Availability-Indizes
    // mit allMonthDates (= weeks.flatMap(w => w.weekDates)) in ResourcePool übereinstimmen
    const sortedEntries = Array.from(monthWeekDataMap.entries()).sort(
      ([a], [b]) => a.localeCompare(b)
    );

    for (const [, weekData] of sortedEntries) {
      for (const item of weekData.poolItems) {
        const key = `${item.type}-${item.id}`;
        const existing = poolMap.get(key);
        if (existing) {
          existing.availability = [...existing.availability, ...item.availability];
          existing.hasAbsence = existing.hasAbsence || item.hasAbsence;
          if (!existing.absenceLabel && item.absenceLabel) {
            existing.absenceLabel = item.absenceLabel;
          }
        } else {
          poolMap.set(key, { ...item, availability: [...item.availability] });
        }
      }
    }

    return Array.from(poolMap.values());
  }, [monthWeekDataMap]);

  // Auto-expand project containing highlighted phase
  useEffect(() => {
    if (highlightPhaseId && weekData) {
      for (const row of weekData.projectRows) {
        const hasPhase = row.phases.some((p) => p.phase.id === highlightPhaseId);
        if (hasPhase) {
          setExpandedProjects((prev) => new Set([...prev, row.project.id]));
          break;
        }
      }
    }
  }, [highlightPhaseId, weekData]);

  // Navigation functions
  const goToNextWeek = useCallback(() => {
    setSlideDirection('right');
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return getMonday(next);
    });
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setSlideDirection('left');
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return getMonday(next);
    });
  }, []);

  const goToToday = useCallback(() => {
    setSlideDirection('right');
    setWeekStart(getMonday(new Date()));
  }, []);

  const goToWeek = useCallback((date: Date) => {
    setSlideDirection('right');
    setWeekStart(getMonday(date));
  }, []);

  // Period-based navigation (depends on viewMode)
  const goToNextPeriod = useCallback(() => {
    setSlideDirection('right');
    if (viewMode === 'week' || viewMode === 'team') {
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
    setSlideDirection('left');
    if (viewMode === 'week' || viewMode === 'team') {
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

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIMISTIC UPDATE FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fügt eine Allocation optimistisch zum lokalen State hinzu.
   * Wird aufgerufen BEVOR der Server-Request abgeschickt wird.
   */
  const addAllocationOptimistic = useCallback(
    (allocation: OptimisticAllocation) => {
      setWeekData((prev) => {
        if (!prev) return prev;

        const newProjectRows = prev.projectRows.map((project) => ({
          ...project,
          phases: project.phases.map((phase) => {
            if (phase.phase.id !== allocation.projectPhaseId) return phase;

            // Füge Allocation zum richtigen Tag hinzu
            const newDayAllocations = { ...phase.dayAllocations };
            const dateKey = allocation.date;
            const newAllocation: AllocationWithDetails = {
              id: allocation.id,
              tenantId: '',
              date: new Date(allocation.date),
              plannedHours: allocation.plannedHours,
              actualHours: 0,
              user: allocation.userId
                ? {
                    id: allocation.userId,
                    fullName: allocation.userName || 'Lädt...',
                    weeklyHours: 40,
                    dailyCapacity: 8,
                  }
                : undefined,
              resource: allocation.resourceId
                ? {
                    id: allocation.resourceId,
                    name: allocation.resourceName || 'Lädt...',
                  }
                : undefined,
              projectPhase: {
                id: phase.phase.id,
                name: phase.phase.name,
                bereich: phase.phase.bereich,
              },
              project: {
                id: project.project.id,
                name: project.project.name,
              },
              hasAbsenceConflict: false,
            };

            newDayAllocations[dateKey] = [
              ...(newDayAllocations[dateKey] || []),
              newAllocation,
            ];

            return { ...phase, dayAllocations: newDayAllocations };
          }),
        }));

        return { ...prev, projectRows: newProjectRows };
      });
    },
    []
  );

  /**
   * Entfernt eine Allocation optimistisch aus dem lokalen State.
   * Wird aufgerufen BEVOR der Delete-Request abgeschickt wird.
   */
  const removeAllocationOptimistic = useCallback((allocationId: string) => {
    setWeekData((prev) => {
      if (!prev) return prev;

      const newProjectRows = prev.projectRows.map((project) => ({
        ...project,
        phases: project.phases.map((phase) => {
          const newDayAllocations: Record<string, AllocationWithDetails[]> = {};

          for (const [dateKey, allocations] of Object.entries(
            phase.dayAllocations
          )) {
            newDayAllocations[dateKey] = allocations.filter(
              (a) => a.id !== allocationId
            );
          }

          return { ...phase, dayAllocations: newDayAllocations };
        }),
      }));

      return { ...prev, projectRows: newProjectRows };
    });
  }, []);

  /**
   * Verschiebt eine Allocation optimistisch im lokalen State.
   * Wird aufgerufen BEVOR der Move-Request abgeschickt wird.
   */
  const moveAllocationOptimistic = useCallback(
    (allocationId: string, newDate: string, newPhaseId?: string) => {
      setWeekData((prev) => {
        if (!prev) return prev;

        // 1. Finde die Allocation
        let movedAllocation: AllocationWithDetails | null = null;

        for (const project of prev.projectRows) {
          for (const phase of project.phases) {
            for (const allocations of Object.values(phase.dayAllocations)) {
              const found = allocations.find((a) => a.id === allocationId);
              if (found) {
                movedAllocation = { ...found, date: new Date(newDate) };
                break;
              }
            }
            if (movedAllocation) break;
          }
          if (movedAllocation) break;
        }

        if (!movedAllocation) return prev;

        // 2. Entferne von alter Position und füge an neuer Position hinzu
        const targetPhaseId = newPhaseId || movedAllocation.projectPhase.id;

        const newProjectRows = prev.projectRows.map((project) => ({
          ...project,
          phases: project.phases.map((phase) => {
            const newDayAllocations: Record<string, AllocationWithDetails[]> =
              {};

            // Entferne die alte Allocation
            for (const [dateKey, allocations] of Object.entries(
              phase.dayAllocations
            )) {
              newDayAllocations[dateKey] = allocations.filter(
                (a) => a.id !== allocationId
              );
            }

            // Füge an neuer Position hinzu wenn dies die Ziel-Phase ist
            if (phase.phase.id === targetPhaseId && movedAllocation) {
              const updatedAllocation: AllocationWithDetails = {
                ...movedAllocation,
                projectPhase: {
                  id: phase.phase.id,
                  name: phase.phase.name,
                  bereich: phase.phase.bereich,
                },
                project: {
                  id: project.project.id,
                  name: project.project.name,
                },
              };

              newDayAllocations[newDate] = [
                ...(newDayAllocations[newDate] || []),
                updatedAllocation,
              ];
            }

            return { ...phase, dayAllocations: newDayAllocations };
          }),
        }));

        return { ...prev, projectRows: newProjectRows };
      });
    },
    []
  );

  /**
   * Ersetzt eine temporäre Allocation-ID mit der echten ID vom Server.
   * Wird nach erfolgreicher Server-Response aufgerufen.
   */
  const replaceAllocationId = useCallback((tempId: string, realId: string) => {
    setWeekData((prev) => {
      if (!prev) return prev;

      const newProjectRows = prev.projectRows.map((project) => ({
        ...project,
        phases: project.phases.map((phase) => {
          const newDayAllocations: Record<string, AllocationWithDetails[]> = {};

          for (const [dateKey, allocations] of Object.entries(
            phase.dayAllocations
          )) {
            newDayAllocations[dateKey] = allocations.map((a) =>
              a.id === tempId ? { ...a, id: realId } : a
            );
          }

          return { ...phase, dayAllocations: newDayAllocations };
        }),
      }));

      return { ...prev, projectRows: newProjectRows };
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
    if (viewMode === 'week' || viewMode === 'team') {
      return weekStart;
    }
    return getFirstOfMonth(weekStart);
  }, [viewMode, weekStart]);

  const periodEnd = useMemo((): Date => {
    if (viewMode === 'week' || viewMode === 'team') {
      // Friday
      const friday = new Date(weekStart);
      friday.setDate(friday.getDate() + 4);
      return friday;
    }
    return getLastOfMonth(weekStart);
  }, [viewMode, weekStart]);

  const periodDates = useMemo((): Date[] => {
    if (viewMode === 'week' || viewMode === 'team') {
      return getWeekDatesUtil(weekStart);
    }
    return getMonthDates(weekStart);
  }, [viewMode, weekStart]);

  const periodLabel = useMemo((): string => {
    if (viewMode === 'week' || viewMode === 'team') {
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

  // Computed: All users including those without allocations (Team View)
  const allUserRows = useMemo((): UserRowData[] => {
    if (!weekData) return [];

    const userMap = new Map<string, UserRowData>();

    // User mit Allocations
    for (const row of userRows) {
      userMap.set(row.id, row);
    }

    // User aus PoolItems ohne Allocations hinzufügen
    for (const item of poolItems) {
      if (item.type === 'user' && !userMap.has(item.id)) {
        userMap.set(item.id, {
          id: item.id,
          fullName: item.name,
          weeklyHours: item.weeklyHours ?? 40,
          allocations: [],
        });
      }
    }

    return Array.from(userMap.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'de')
    );
  }, [weekData, userRows, poolItems]);

  // Computed: Team Phase Pool (Phasen gruppiert nach Projekt für Team View)
  const teamPhasePool = useMemo((): TeamPhasePoolGroup[] => {
    if (!weekData) return [];

    return weekData.projectRows
      .filter(row => row.phases.some(p => p.isActiveThisWeek))
      .map(row => ({
        projectId: row.project.id,
        projectName: row.project.name,
        projectStatus: row.project.status,
        phases: row.phases
          .filter(p => p.isActiveThisWeek)
          .map(p => ({
            projectId: row.project.id,
            projectName: row.project.name,
            projectStatus: row.project.status,
            phaseId: p.phase.id,
            phaseName: p.phase.name,
            bereich: p.phase.bereich,
            budgetHours: p.phase.budgetHours,
            plannedHours: p.phase.plannedHours,
            isActiveThisWeek: p.isActiveThisWeek,
          })),
      }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName, 'de'));
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

  // Context value (memoized um unnötige Consumer-Re-Renders zu vermeiden)
  const weekEnd = weekData?.weekEnd ?? weekStart;
  const calendarWeek = weekData?.calendarWeek ?? 1;
  const summary = weekData?.summary ?? null;

  const value: PlanningContextValue = useMemo(
    () => ({
      weekStart,
      weekEnd,
      calendarWeek,
      weekData,
      isLoading,
      error,
      filters,
      viewMode,
      highlightPhaseId,
      slideDirection,
      clearSlideDirection,
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
      monthWeeks,
      monthProjectRows,
      monthPoolItems,
      isMonthLoading,
      allUserRows,
      teamPhasePool,
      userRows,
      days,
      summary,
      refresh: loadWeekData,
      toggleProjectExpanded,
      addAllocationOptimistic,
      removeAllocationOptimistic,
      moveAllocationOptimistic,
      replaceAllocationId,
      getAllocationById,
      getWeekDates: getWeekDatesHelper,
    }),
    [
      weekStart,
      weekEnd,
      calendarWeek,
      weekData,
      isLoading,
      error,
      filters,
      viewMode,
      highlightPhaseId,
      slideDirection,
      clearSlideDirection,
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
      monthWeeks,
      monthProjectRows,
      monthPoolItems,
      isMonthLoading,
      allUserRows,
      teamPhasePool,
      userRows,
      days,
      summary,
      loadWeekData,
      toggleProjectExpanded,
      addAllocationOptimistic,
      removeAllocationOptimistic,
      moveAllocationOptimistic,
      replaceAllocationId,
      getAllocationById,
      getWeekDatesHelper,
    ]
  );

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
