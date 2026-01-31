# Prompt 15: Planungsansicht UI

**Phase:** 4 – UI & Drag-and-Drop
**Komplexität:** L (Large)
**Geschätzte Zeit:** 5-6 Stunden

---

## Kontext

Alle Domain-Entities und Use Cases sind implementiert. Jetzt bauen wir die zentrale Planungsansicht.

**Bereits vorhanden:**
- GetAllocationsForWeekQuery
- Alle CRUD Use Cases für Allocations
- Realtime Subscriptions
- User/Project/Phase Entities

---

## Ziel

Implementiere die Planungsansicht mit Wochennavigation, User/Ressourcen-Zeilen und Allocation-Cards gemäß den UI-Screens.

---

## Referenz-Dokumentation

- `FEATURES.md` – F2 (Navigation), F3 (Planungsansicht)
- `UI_COMPONENTS.md` – Grid Layout, Cards, Navigation
- **UI-Screens:**
  - `stitch_planned./planning_grid_view_-_2_collapsed/planning_grid_view_-_2_collapsed.png`
  - `stitch_planned./planning_view_weekview_-_filled/planning_view_weekview_-_filled.png`
  - `stitch_planned./weekview_empty/weekview_empty.png`
  - `stitch_planned./planning_sidebar_-_expanded_view/planning_sidebar_-_expanded_view.png`

---

## Akzeptanzkriterien

```gherkin
Feature: F2 - Wochenansicht Navigation

Scenario: F2.1 - Aktuelle Woche anzeigen
  Given ich öffne die Planungsansicht
  Then sehe ich die aktuelle Kalenderwoche
  And das heutige Datum ist hervorgehoben
  And ich sehe alle 5 Werktage (Mo-Fr)

Scenario: F2.2 - Woche navigieren
  Given ich bin in der Planungsansicht
  When ich auf ">" klicke
  Then sehe ich die nächste Woche
  When ich auf "<" klicke
  Then sehe ich die vorherige Woche

Scenario: F2.3 - Zu bestimmter Woche springen
  Given ich bin in der Planungsansicht
  When ich auf die KW-Anzeige klicke
  Then öffnet sich ein Datepicker
  When ich ein Datum wähle
  Then springe ich zu dieser Woche

Scenario: F2.4 - Zu heute zurückkehren
  Given ich bin in einer anderen Woche
  When ich auf "Heute" klicke
  Then springe ich zur aktuellen Woche
  And der heutige Tag ist sichtbar

Feature: F3 - Planungsansicht

Scenario: F3.1 - Zeilen für Mitarbeiter
  Given ich öffne die Planungsansicht
  Then sehe ich eine Zeile pro aktivem Mitarbeiter
  And jede Zeile zeigt: Avatar, Name, Wochenstunden
  And die Zeilen sind alphabetisch sortiert

Scenario: F3.2 - Zeilen für Ressourcen
  Given es existieren Ressourcen
  Then sehe ich Ressourcen-Zeilen unter den Mitarbeitern
  And sie sind nach Typ gruppiert (Kran, Fahrzeug, etc.)

Scenario: F3.3 - Allocation Cards anzeigen
  Given ein User hat Allocations diese Woche
  Then sehe ich für jede Allocation eine Card
  And die Card zeigt: Projektkürzel, Stunden
  And die Card ist farbig nach Phase-Bereich:
    | Bereich    | Farbe  |
    | produktion | Blau   |
    | montage    | Grün   |

Scenario: F3.4 - Abwesenheiten anzeigen
  Given ein User hat Urlaub am Mittwoch
  Then ist die Zelle für Mittwoch grau hinterlegt
  And zeigt "Urlaub" als Label
  And Allocations an diesem Tag haben Warning-Icon

Scenario: F3.5 - Leere Zellen
  Given ein User hat keine Allocation am Montag
  Then sehe ich eine leere Zelle
  And ein "+" Icon erscheint beim Hover
  And die Zelle ist als Drop-Target markiert

Scenario: F3.6 - Kapazitätsanzeige
  Given ich sehe die Planungsansicht
  Then sehe ich pro Tag die Gesamtkapazität
  And den Auslastungsgrad als Balken
  And Farbe je nach Auslastung:
    | Auslastung | Farbe |
    | < 80%      | Grün  |
    | 80-100%    | Gelb  |
    | > 100%     | Rot   |
```

---

## Technische Anforderungen

### Layout Struktur

```
┌────────────────────────────────────────────────────────────────┐
│ Header: < KW 6/2026 > [Heute] [Filter ▼]                       │
├────────────────────────────────────────────────────────────────┤
│         │ Mo 02.02  │ Di 03.02  │ Mi 04.02  │ Do 05.02 │ Fr 06│
│         │ Kapazität │ Kapazität │ Kapazität │ Kapazität│ Kapa │
├─────────┼───────────┼───────────┼───────────┼──────────┼──────┤
│ Max M.  │ [Card]    │ [Card]    │ [Urlaub]  │          │      │
│ 40h/Wo  │ [Card]    │           │           │          │      │
├─────────┼───────────┼───────────┼───────────┼──────────┼──────┤
│ Anna S. │           │ [Card]    │ [Card]    │ [Card]   │      │
│ 32h/Wo  │           │           │           │          │      │
├─────────┼───────────┼───────────┼───────────┼──────────┼──────┤
│ RESSOURCEN                                                     │
├─────────┼───────────┼───────────┼───────────┼──────────┼──────┤
│ Kran 1  │ [Card]    │ [Card]    │           │          │      │
└─────────┴───────────┴───────────┴───────────┴──────────┴──────┘
```

### Component Hierarchy

```typescript
<PlanningPage>
  <PlanningProvider>
    <WeekNavigation />
    <PlanningGrid>
      <GridHeader />      // Tage mit Kapazitäten
      <UserRows />        // Mitarbeiter-Zeilen
      <ResourceRows />    // Ressourcen-Zeilen
    </PlanningGrid>
    <Sidebar />           // Projekt-Panel
  </PlanningProvider>
</PlanningPage>
```

---

## Implementierungsschritte

### 🔴 RED: E2E Test für Planungsansicht

```typescript
// tests/e2e/planning/planning-view.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Planungsansicht', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlaner(page);
    await page.goto('/planung');
  });

  test('should show current week', async ({ page }) => {
    const currentWeek = getCurrentCalendarWeek();
    await expect(page.locator('[data-testid="week-display"]'))
      .toContainText(`KW ${currentWeek}`);
  });

  test('should navigate to next week', async ({ page }) => {
    const currentWeek = getCurrentCalendarWeek();
    await page.click('[data-testid="next-week-btn"]');

    await expect(page.locator('[data-testid="week-display"]'))
      .toContainText(`KW ${currentWeek + 1}`);
  });

  test('should show user rows', async ({ page }) => {
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount.greaterThan(0);
  });

  test('should show allocation cards', async ({ page }) => {
    // Assuming test data has allocations
    await expect(page.locator('[data-testid="allocation-card"]')).toBeVisible();
  });

  test('should highlight today', async ({ page }) => {
    await expect(page.locator('[data-testid="today-column"]')).toHaveClass(/bg-accent/);
  });
});
```

### 🟢 GREEN: PlanningPage implementieren

```typescript
// src/app/(dashboard)/planung/page.tsx
import { Suspense } from 'react';
import { PlanningProvider } from '@/presentation/contexts/PlanningContext';
import { WeekNavigation } from '@/presentation/components/planning/WeekNavigation';
import { PlanningGrid } from '@/presentation/components/planning/PlanningGrid';
import { PlanningSidebar } from '@/presentation/components/planning/PlanningSidebar';
import { PlanningGridSkeleton } from '@/presentation/components/planning/PlanningGridSkeleton';

export default function PlanningPage() {
  return (
    <PlanningProvider>
      <div className="flex h-full">
        {/* Main Grid Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <WeekNavigation />
          <Suspense fallback={<PlanningGridSkeleton />}>
            <PlanningGrid />
          </Suspense>
        </div>

        {/* Sidebar */}
        <PlanningSidebar />
      </div>
    </PlanningProvider>
  );
}
```

### 🟢 GREEN: WeekNavigation Component

```typescript
// src/presentation/components/planning/WeekNavigation.tsx
'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { getCalendarWeek, formatDateRange } from '@/lib/date-utils';

export function WeekNavigation() {
  const { weekStart, setWeekStart, goToToday, goToNextWeek, goToPreviousWeek } = usePlanning();

  const calendarWeek = getCalendarWeek(weekStart);
  const year = weekStart.getFullYear();
  const dateRange = formatDateRange(weekStart);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousWeek}
          aria-label="Vorherige Woche"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100"
          onClick={() => {/* Open date picker */}}
          data-testid="week-display"
        >
          <Calendar className="h-4 w-4" />
          <span className="font-medium">KW {calendarWeek}/{year}</span>
          <span className="text-gray-500 text-sm">{dateRange}</span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          aria-label="Nächste Woche"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday}>
          Heute
        </Button>

        {/* Filter Dropdown */}
        <FilterDropdown />
      </div>
    </div>
  );
}
```

### 🟢 GREEN: PlanningGrid Component

```typescript
// src/presentation/components/planning/PlanningGrid.tsx
'use client';

import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { GridHeader } from './GridHeader';
import { UserRow } from './UserRow';
import { ResourceSection } from './ResourceSection';
import { cn } from '@/lib/utils';

export function PlanningGrid() {
  const { weekData, isLoading } = usePlanning();

  if (isLoading || !weekData) {
    return <PlanningGridSkeleton />;
  }

  const { days } = weekData;

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[900px]">
        {/* Header mit Tagen */}
        <GridHeader days={days} />

        {/* User Rows */}
        <div className="divide-y">
          {weekData.users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              days={days}
              allocations={weekData.allocationsByUser.get(user.id) || []}
            />
          ))}
        </div>

        {/* Ressourcen Section */}
        <ResourceSection
          resources={weekData.resources}
          days={days}
          allocations={weekData.allocationsByResource}
        />
      </div>
    </div>
  );
}
```

### 🟢 GREEN: GridHeader Component

```typescript
// src/presentation/components/planning/GridHeader.tsx
'use client';

import { format, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CapacityBar } from './CapacityBar';

interface GridHeaderProps {
  days: DayData[];
}

export function GridHeader({ days }: GridHeaderProps) {
  return (
    <div className="grid grid-cols-[200px_repeat(5,1fr)] sticky top-0 bg-white z-10 border-b">
      {/* User Column Header */}
      <div className="px-4 py-3 font-medium text-sm text-gray-600">
        Mitarbeiter
      </div>

      {/* Day Headers */}
      {days.map((day) => (
        <div
          key={day.date.toISOString()}
          data-testid={isToday(day.date) ? 'today-column' : undefined}
          className={cn(
            'px-3 py-3 text-center border-l',
            isToday(day.date) && 'bg-accent/10'
          )}
        >
          <div className="font-medium">
            {format(day.date, 'EEE', { locale: de })}
          </div>
          <div className="text-sm text-gray-500">
            {format(day.date, 'dd.MM.')}
          </div>

          {/* Kapazitätsanzeige */}
          <CapacityBar
            planned={day.totalPlannedHours}
            capacity={day.totalCapacity}
            className="mt-2"
          />
        </div>
      ))}
    </div>
  );
}
```

### 🟢 GREEN: UserRow Component

```typescript
// src/presentation/components/planning/UserRow.tsx
'use client';

import { useMemo } from 'react';
import { Avatar } from '@/presentation/components/ui/avatar';
import { AllocationCard } from './AllocationCard';
import { AbsenceOverlay } from './AbsenceOverlay';
import { EmptyCell } from './EmptyCell';
import { cn } from '@/lib/utils';

interface UserRowProps {
  user: UserSummary;
  days: DayData[];
  allocations: AllocationWithDetails[];
}

export function UserRow({ user, days, allocations }: UserRowProps) {
  // Allocations nach Tag gruppieren
  const allocationsByDay = useMemo(() => {
    const map = new Map<string, AllocationWithDetails[]>();
    for (const alloc of allocations) {
      const key = alloc.date.toDateString();
      const existing = map.get(key) || [];
      existing.push(alloc);
      map.set(key, existing);
    }
    return map;
  }, [allocations]);

  return (
    <div
      className="grid grid-cols-[200px_repeat(5,1fr)] hover:bg-gray-50"
      data-testid="user-row"
    >
      {/* User Info */}
      <div className="px-4 py-3 flex items-center gap-3 border-r">
        <Avatar
          src={user.avatarUrl}
          alt={user.fullName}
          fallback={user.fullName.charAt(0)}
        />
        <div>
          <div className="font-medium text-sm">{user.fullName}</div>
          <div className="text-xs text-gray-500">{user.weeklyHours}h/Woche</div>
        </div>
      </div>

      {/* Day Cells */}
      {days.map((day) => {
        const dayAllocations = allocationsByDay.get(day.date.toDateString()) || [];
        const hasAbsence = day.absences?.some(a => a.userId === user.id);
        const absence = day.absences?.find(a => a.userId === user.id);

        return (
          <div
            key={day.date.toISOString()}
            className={cn(
              'relative min-h-[80px] p-2 border-l',
              day.isToday && 'bg-accent/5',
              hasAbsence && 'bg-gray-100'
            )}
            data-user-id={user.id}
            data-date={day.date.toISOString()}
          >
            {hasAbsence && (
              <AbsenceOverlay absence={absence!} />
            )}

            {dayAllocations.length > 0 ? (
              <div className="space-y-1">
                {dayAllocations.map((alloc) => (
                  <AllocationCard
                    key={alloc.id}
                    allocation={alloc}
                    hasAbsenceConflict={hasAbsence}
                  />
                ))}
              </div>
            ) : (
              <EmptyCell userId={user.id} date={day.date} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### 🟢 GREEN: AllocationCard Component

```typescript
// src/presentation/components/planning/AllocationCard.tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AllocationCardProps {
  allocation: AllocationWithDetails;
  hasAbsenceConflict?: boolean;
  isDragging?: boolean;
}

const BEREICH_COLORS = {
  produktion: 'bg-blue-100 border-blue-300 text-blue-800',
  montage: 'bg-green-100 border-green-300 text-green-800',
};

export function AllocationCard({
  allocation,
  hasAbsenceConflict,
  isDragging,
}: AllocationCardProps) {
  const { projectPhase, project, plannedHours, actualHours, notes } = allocation;

  return (
    <div
      className={cn(
        'rounded-md border p-2 cursor-pointer transition-all',
        BEREICH_COLORS[projectPhase.bereich],
        isDragging && 'opacity-50 rotate-2 scale-105',
        hasAbsenceConflict && 'ring-2 ring-warning'
      )}
      data-testid="allocation-card"
      data-allocation-id={allocation.id}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="font-medium text-xs truncate">
          {project.number}
        </div>
        {hasAbsenceConflict && (
          <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0" />
        )}
      </div>

      <div className="text-xs mt-1">
        {plannedHours}h
        {actualHours > 0 && (
          <span className="text-gray-500 ml-1">
            ({actualHours}h IST)
          </span>
        )}
      </div>

      {notes && (
        <div className="text-[10px] text-gray-600 mt-1 truncate">
          {notes}
        </div>
      )}
    </div>
  );
}
```

### 🟢 GREEN: CapacityBar Component

```typescript
// src/presentation/components/planning/CapacityBar.tsx
'use client';

import { cn } from '@/lib/utils';

interface CapacityBarProps {
  planned: number;
  capacity: number;
  className?: string;
}

export function CapacityBar({ planned, capacity, className }: CapacityBarProps) {
  const percentage = capacity > 0 ? Math.round((planned / capacity) * 100) : 0;
  const displayPercentage = Math.min(percentage, 150); // Cap für Anzeige

  const getColor = () => {
    if (percentage > 100) return 'bg-error';
    if (percentage >= 80) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
        <span>{planned}h</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getColor())}
          style={{ width: `${Math.min(displayPercentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── app/
│   └── (dashboard)/
│       └── planung/
│           └── page.tsx
├── presentation/
│   ├── contexts/
│   │   └── PlanningContext.tsx
│   └── components/
│       └── planning/
│           ├── WeekNavigation.tsx
│           ├── PlanningGrid.tsx
│           ├── PlanningGridSkeleton.tsx
│           ├── GridHeader.tsx
│           ├── UserRow.tsx
│           ├── ResourceSection.tsx
│           ├── AllocationCard.tsx
│           ├── EmptyCell.tsx
│           ├── AbsenceOverlay.tsx
│           ├── CapacityBar.tsx
│           ├── FilterDropdown.tsx
│           └── PlanningSidebar.tsx
└── lib/
    └── date-utils.ts
```

---

## Hinweise

- UI exakt nach PNG-Screenshots
- Responsive: Minimum 900px Breite, horizontal scrollbar für kleinere Screens
- Performance: Virtualisierung bei > 50 Usern (optional in späterem Prompt)
- Sticky Header für Tage beim Scrollen
- Heute-Spalte hervorgehoben
- Farbschema aus `UI_COMPONENTS.md`
- Drag & Drop kommt im nächsten Prompt

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Wochennavigation funktioniert
- [ ] User-Zeilen werden angezeigt
- [ ] Allocation Cards sind sichtbar
- [ ] Abwesenheiten sind markiert
- [ ] Kapazitätsanzeige funktioniert
- [ ] "Heute" Button funktioniert
- [ ] Layout entspricht Screenshots

---

*Vorheriger Prompt: 14a – Supabase Realtime Subscriptions*
*Nächster Prompt: 16 – Drag & Drop Basic*
