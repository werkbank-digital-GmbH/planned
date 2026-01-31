# Prompt 14: GetAllocationsForWeek Query

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

CRUD für Allocations ist implementiert. Jetzt implementieren wir die zentrale Query für die Planungsansicht.

**Bereits vorhanden:**
- CreateAllocationUseCase
- MoveAllocationUseCase
- DeleteAllocationUseCase
- AllocationCalculator
- AbsenceConflictChecker

---

## Ziel

Implementiere die Query zum Abrufen aller Allocations für eine Kalenderwoche mit allen benötigten Aggregationen.

---

## Referenz-Dokumentation

- `FEATURES.md` – F2.1 (Wochenansicht), F3.4 (Planungsansicht)
- `API_SPEC.md` – AllocationDTO, WeekData Types
- `DATA_MODEL.md` – Allocation Joins

---

## Akzeptanzkriterien

```gherkin
Feature: GetAllocationsForWeek Query

Scenario: Wochendaten mit Allocations abrufen
  Given es ist KW 6/2026 (02.02. - 06.02.)
  When ich GetAllocationsForWeek ausführe
  Then erhalte ich alle Allocations dieser Woche
  And jede Allocation enthält User/Resource-Details
  And jede Allocation enthält Projekt/Phase-Details
  And Abwesenheiten sind markiert

Scenario: Aggregierte Stunden pro Tag
  Given ein User hat 2 Allocations am Montag
  When ich GetAllocationsForWeek ausführe
  Then sehe ich die Summe der PlannedHours pro Tag
  And sehe ich die Summe der ActualHours (aus TimeEntries)

Scenario: Kapazitätsübersicht
  Given ein Team hat 5 aktive Mitarbeiter
  When ich GetAllocationsForWeek ausführe
  Then erhalte ich die Gesamtkapazität pro Tag
  And den Auslastungsgrad (allocated/capacity)

Scenario: Filter nach Projekt
  Given ich filtere nach Projekt "Schulhaus Muster"
  When ich GetAllocationsForWeek ausführe
  Then sehe ich nur Allocations für dieses Projekt
  And die Kapazität zeigt weiterhin alle User

Scenario: Performance mit vielen Allocations
  Given es existieren 500+ Allocations in der Woche
  When ich GetAllocationsForWeek ausführe
  Then antwortet die Query in < 200ms
```

---

## Technische Anforderungen

### Query Request/Response

```typescript
interface GetAllocationsForWeekRequest {
  weekStart: Date;  // Montag der Woche
  projectId?: string;  // Optional: Filter nach Projekt
  userId?: string;     // Optional: Filter nach User
}

interface WeekAllocationData {
  weekStart: Date;
  weekEnd: Date;
  calendarWeek: number;
  year: number;

  // Allocations gruppiert nach Tag
  days: DayData[];

  // Aggregationen
  summary: WeekSummary;
}

interface DayData {
  date: Date;
  dayOfWeek: number;  // 0=Mo, 4=Fr
  isToday: boolean;

  allocations: AllocationWithDetails[];

  // Aggregationen pro Tag
  totalPlannedHours: number;
  totalActualHours: number;
  totalCapacity: number;
  utilizationPercent: number;
}

interface AllocationWithDetails {
  id: string;
  date: Date;
  plannedHours: number;
  actualHours: number;  // Aus TimeEntries
  notes?: string;

  // Verknüpfte Entitäten
  user?: UserSummary;
  resource?: ResourceSummary;
  projectPhase: ProjectPhaseSummary;
  project: ProjectSummary;

  // Flags
  hasAbsenceConflict: boolean;
  absenceType?: string;
}

interface UserSummary {
  id: string;
  fullName: string;
  weeklyHours: number;
  dailyCapacity: number;  // weeklyHours / 5
}

interface WeekSummary {
  totalPlannedHours: number;
  totalActualHours: number;
  totalCapacity: number;
  utilizationPercent: number;
  userCount: number;
  projectCount: number;
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für GetAllocationsForWeekQuery

```typescript
// src/application/queries/__tests__/GetAllocationsForWeekQuery.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllocationsForWeekQuery } from '../GetAllocationsForWeekQuery';

describe('GetAllocationsForWeekQuery', () => {
  it('should return allocations for the week', async () => {
    const mockAllocationRepo = {
      findByWeek: vi.fn().mockResolvedValue([
        {
          id: 'alloc-1',
          date: new Date('2026-02-02'),
          userId: 'user-1',
          plannedHours: 8,
          projectPhaseId: 'phase-1',
        },
        {
          id: 'alloc-2',
          date: new Date('2026-02-03'),
          userId: 'user-1',
          plannedHours: 4,
          projectPhaseId: 'phase-1',
        },
      ]),
    };

    const query = new GetAllocationsForWeekQuery(
      mockAllocationRepo,
      mockUserRepo,
      mockProjectPhaseRepo,
      mockTimeEntryRepo,
      mockAbsenceRepo
    );

    const result = await query.execute({
      weekStart: new Date('2026-02-02'),
    });

    expect(result.days).toHaveLength(5);  // Mo-Fr
    expect(result.days[0].allocations).toHaveLength(1);
    expect(result.days[1].allocations).toHaveLength(1);
  });

  it('should calculate daily totals correctly', async () => {
    const mockAllocationRepo = {
      findByWeek: vi.fn().mockResolvedValue([
        { id: 'alloc-1', date: new Date('2026-02-02'), userId: 'user-1', plannedHours: 4 },
        { id: 'alloc-2', date: new Date('2026-02-02'), userId: 'user-2', plannedHours: 8 },
      ]),
    };

    const query = new GetAllocationsForWeekQuery(/* ... */);
    const result = await query.execute({ weekStart: new Date('2026-02-02') });

    expect(result.days[0].totalPlannedHours).toBe(12);
  });

  it('should mark allocations with absence conflicts', async () => {
    const mockAbsenceRepo = {
      findByUsersAndDateRange: vi.fn().mockResolvedValue([
        { userId: 'user-1', startDate: new Date('2026-02-02'), endDate: new Date('2026-02-02'), type: 'urlaub' },
      ]),
    };

    const query = new GetAllocationsForWeekQuery(/* ... */);
    const result = await query.execute({ weekStart: new Date('2026-02-02') });

    const mondayAlloc = result.days[0].allocations[0];
    expect(mondayAlloc.hasAbsenceConflict).toBe(true);
    expect(mondayAlloc.absenceType).toBe('urlaub');
  });
});
```

### 🟢 GREEN: GetAllocationsForWeekQuery implementieren

```typescript
// src/application/queries/GetAllocationsForWeekQuery.ts
import { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import { ITimeEntryRepository } from '@/application/ports/repositories/ITimeEntryRepository';
import { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import { getWeekDates, getCalendarWeek } from '@/lib/date-utils';

export class GetAllocationsForWeekQuery {
  constructor(
    private allocationRepository: IAllocationRepository,
    private userRepository: IUserRepository,
    private projectPhaseRepository: IProjectPhaseRepository,
    private timeEntryRepository: ITimeEntryRepository,
    private absenceRepository: IAbsenceRepository
  ) {}

  async execute(request: GetAllocationsForWeekRequest): Promise<WeekAllocationData> {
    const { weekStart, projectId, userId } = request;
    const weekDates = getWeekDates(weekStart);
    const weekEnd = weekDates[4]; // Freitag

    // 1. Alle Allocations der Woche laden
    const allocations = await this.allocationRepository.findByWeek(
      weekStart,
      weekEnd,
      { projectId, userId }
    );

    // 2. Verknüpfte Entitäten laden (Batch für Performance)
    const userIds = [...new Set(allocations.filter(a => a.userId).map(a => a.userId!))];
    const phaseIds = [...new Set(allocations.map(a => a.projectPhaseId))];

    const [users, phases, timeEntries, absences] = await Promise.all([
      this.userRepository.findByIds(userIds),
      this.projectPhaseRepository.findByIdsWithProject(phaseIds),
      this.timeEntryRepository.findByUserIdsAndDateRange(userIds, weekStart, weekEnd),
      this.absenceRepository.findByUsersAndDateRange(userIds, weekStart, weekEnd),
    ]);

    // 3. Lookup-Maps erstellen
    const userMap = new Map(users.map(u => [u.id, u]));
    const phaseMap = new Map(phases.map(p => [p.id, p]));
    const absenceMap = this.buildAbsenceMap(absences);
    const timeEntryMap = this.buildTimeEntryMap(timeEntries);

    // 4. Tagesweise Daten aufbauen
    const days: DayData[] = weekDates.map((date, index) => {
      const dayAllocations = allocations.filter(a =>
        a.date.toDateString() === date.toDateString()
      );

      const allocationsWithDetails = dayAllocations.map(alloc =>
        this.enrichAllocation(alloc, userMap, phaseMap, absenceMap, timeEntryMap)
      );

      const totalPlannedHours = allocationsWithDetails.reduce(
        (sum, a) => sum + a.plannedHours, 0
      );
      const totalActualHours = allocationsWithDetails.reduce(
        (sum, a) => sum + a.actualHours, 0
      );
      const totalCapacity = this.calculateDailyCapacity(users);

      return {
        date,
        dayOfWeek: index,
        isToday: date.toDateString() === new Date().toDateString(),
        allocations: allocationsWithDetails,
        totalPlannedHours,
        totalActualHours,
        totalCapacity,
        utilizationPercent: totalCapacity > 0
          ? Math.round((totalPlannedHours / totalCapacity) * 100)
          : 0,
      };
    });

    // 5. Wochensummary berechnen
    const summary = this.calculateWeekSummary(days, users, phases);

    return {
      weekStart,
      weekEnd,
      calendarWeek: getCalendarWeek(weekStart),
      year: weekStart.getFullYear(),
      days,
      summary,
    };
  }

  private enrichAllocation(
    alloc: Allocation,
    userMap: Map<string, User>,
    phaseMap: Map<string, ProjectPhaseWithProject>,
    absenceMap: Map<string, Absence[]>,
    timeEntryMap: Map<string, TimeEntry[]>
  ): AllocationWithDetails {
    const user = alloc.userId ? userMap.get(alloc.userId) : undefined;
    const phase = phaseMap.get(alloc.projectPhaseId)!;

    // Absence Check
    const dateKey = alloc.date.toISOString().split('T')[0];
    const userAbsences = alloc.userId
      ? absenceMap.get(`${alloc.userId}-${dateKey}`)
      : undefined;
    const hasAbsence = !!userAbsences?.length;

    // Actual Hours aus TimeEntries
    const userTimeEntries = alloc.userId
      ? timeEntryMap.get(`${alloc.userId}-${dateKey}`)
      : undefined;
    const actualHours = userTimeEntries?.reduce((sum, te) => sum + te.hours, 0) ?? 0;

    return {
      id: alloc.id,
      date: alloc.date,
      plannedHours: alloc.plannedHours,
      actualHours,
      notes: alloc.notes,
      user: user ? {
        id: user.id,
        fullName: user.fullName,
        weeklyHours: user.weeklyHours,
        dailyCapacity: user.weeklyHours / 5,
      } : undefined,
      resource: undefined, // TODO: Resource handling
      projectPhase: {
        id: phase.id,
        name: phase.name,
        bereich: phase.bereich,
      },
      project: {
        id: phase.project.id,
        name: phase.project.name,
        number: phase.project.projectNumber,
      },
      hasAbsenceConflict: hasAbsence,
      absenceType: userAbsences?.[0]?.type,
    };
  }

  private buildAbsenceMap(absences: Absence[]): Map<string, Absence[]> {
    const map = new Map<string, Absence[]>();
    for (const absence of absences) {
      // Für jeden Tag im Absence-Bereich einen Eintrag
      let current = new Date(absence.startDate);
      while (current <= absence.endDate) {
        const key = `${absence.userId}-${current.toISOString().split('T')[0]}`;
        const existing = map.get(key) || [];
        existing.push(absence);
        map.set(key, existing);
        current.setDate(current.getDate() + 1);
      }
    }
    return map;
  }

  private buildTimeEntryMap(entries: TimeEntry[]): Map<string, TimeEntry[]> {
    const map = new Map<string, TimeEntry[]>();
    for (const entry of entries) {
      const key = `${entry.userId}-${entry.date.toISOString().split('T')[0]}`;
      const existing = map.get(key) || [];
      existing.push(entry);
      map.set(key, existing);
    }
    return map;
  }

  private calculateDailyCapacity(users: User[]): number {
    return users.reduce((sum, u) => sum + (u.weeklyHours / 5), 0);
  }

  private calculateWeekSummary(
    days: DayData[],
    users: User[],
    phases: ProjectPhaseWithProject[]
  ): WeekSummary {
    const totalPlannedHours = days.reduce((sum, d) => sum + d.totalPlannedHours, 0);
    const totalActualHours = days.reduce((sum, d) => sum + d.totalActualHours, 0);
    const totalCapacity = users.reduce((sum, u) => sum + u.weeklyHours, 0);
    const projectIds = new Set(phases.map(p => p.project.id));

    return {
      totalPlannedHours,
      totalActualHours,
      totalCapacity,
      utilizationPercent: totalCapacity > 0
        ? Math.round((totalPlannedHours / totalCapacity) * 100)
        : 0,
      userCount: users.length,
      projectCount: projectIds.size,
    };
  }
}
```

### 🟢 GREEN: Server Action implementieren

```typescript
// src/presentation/actions/allocations.ts (erweitert)
'use server';

import { z } from 'zod';
import { createActionSupabaseClient } from '@/infrastructure/supabase/actions';
import { Result, ActionResult } from '@/application/common/ActionResult';
import { Container, TOKENS } from '@/infrastructure/container';

const getWeekSchema = z.object({
  weekStart: z.coerce.date(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export async function getAllocationsForWeek(
  input: z.infer<typeof getWeekSchema>
): Promise<ActionResult<WeekAllocationData>> {
  const validated = getWeekSchema.safeParse(input);
  if (!validated.success) {
    return Result.fail('VALIDATION_ERROR', validated.error.errors[0].message);
  }

  try {
    const container = Container.getInstance();
    const query = container.resolve<GetAllocationsForWeekQuery>(
      TOKENS.GetAllocationsForWeekQuery
    );

    const data = await query.execute(validated.data);
    return Result.ok(data);
  } catch (error) {
    if (error instanceof DomainError) {
      return Result.fail(error.code, error.message);
    }
    throw error;
  }
}
```

### 🔵 REFACTOR: Optimierte Supabase Query

```typescript
// src/infrastructure/repositories/SupabaseAllocationRepository.ts
async findByWeek(
  weekStart: Date,
  weekEnd: Date,
  filters?: { projectId?: string; userId?: string }
): Promise<Allocation[]> {
  let query = this.supabase
    .from('allocations')
    .select(`
      *,
      user:users(id, full_name, weekly_hours),
      project_phase:project_phases(
        id, name, bereich,
        project:projects(id, name, project_number)
      )
    `)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (filters?.projectId) {
    query = query.eq('project_phase.project_id', filters.projectId);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data.map(this.toDomain);
}
```

---

## Erwartete Dateien

```
src/
├── application/
│   └── queries/
│       ├── GetAllocationsForWeekQuery.ts
│       ├── index.ts
│       └── __tests__/
│           └── GetAllocationsForWeekQuery.test.ts
├── presentation/
│   └── actions/
│       └── allocations.ts  # Erweitert
├── infrastructure/
│   └── repositories/
│       └── SupabaseAllocationRepository.ts  # Erweitert
└── lib/
    └── date-utils.ts  # getWeekDates, getCalendarWeek
```

---

## Hinweise

- Query muss performant sein (< 200ms für 500+ Allocations)
- Batch-Loading für verknüpfte Entitäten (keine N+1 Queries)
- TimeEntries werden für ActualHours benötigt (aus Prompt 11a)
- Absences müssen für Conflict-Markierung geladen werden
- Kapazität = Summe aller User.weeklyHours / 5 pro Tag
- Auslastung = PlannedHours / Capacity * 100

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Wochendaten werden korrekt geladen
- [ ] Allocations sind gruppiert nach Tag
- [ ] Verknüpfte Entitäten sind enthalten
- [ ] Absence-Konflikte sind markiert
- [ ] ActualHours werden aus TimeEntries berechnet
- [ ] Performance ist akzeptabel

---

*Vorheriger Prompt: 13 – MoveAllocation & DeleteAllocation Use Cases*
*Nächster Prompt: 14a – Supabase Realtime Subscriptions*
