# Prompt 26: Mobile "Meine Woche" View

**Phase:** 6 – Dashboard, Mobile & Finishing
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 3-4 Stunden

---

## Kontext

Dashboard ist fertig. Jetzt implementieren wir die mobile Ansicht für gewerbliche Mitarbeiter.

**Bereits vorhanden:**
- GetAllocationsForWeekQuery
- Absence Entity
- User Authentication

---

## Ziel

Implementiere die mobile "Meine Woche" Ansicht für gewerbliche Mitarbeiter.

---

## Referenz-Dokumentation

- `FEATURES.md` – F10 (Mobile Ansicht)
- **UI-Screens:**
  - `stitch_planned./my_week_calendar_view/my_week_calendar_view.png`
  - `stitch_planned./mobile_-_bottom_navigation_bar/mobile_-_bottom_navigation_bar.png`

---

## Akzeptanzkriterien

```gherkin
Feature: F10 - Mobile "Meine Woche"

Scenario: Gewerblicher Mitarbeiter sieht seine Woche
  Given ich bin als gewerblicher Mitarbeiter eingeloggt
  When ich die App öffne
  Then lande ich auf "/meine-woche"
  And sehe meine Allocations für die aktuelle Woche

Scenario: Tagesweise Ansicht
  Given ich bin auf "Meine Woche"
  Then sehe ich für jeden Tag:
    | Element       | Inhalt                    |
    | Datum         | Mo, 02.02.2026            |
    | Allocations   | Projekt-Karten            |
    | Abwesenheit   | Falls vorhanden (grau)    |

Scenario: Allocation Details
  Given ich sehe eine Allocation
  Then sehe ich:
    | Feld          | Wert            |
    | Projekt       | Schulhaus Muster|
    | Phase         | Elementierung   |
    | Stunden       | 8h              |
    | Notiz         | Falls vorhanden |

Scenario: Woche navigieren
  Given ich bin auf "Meine Woche"
  When ich nach links wische
  Then sehe ich die nächste Woche
  When ich nach rechts wische
  Then sehe ich die vorherige Woche

Scenario: Abwesenheit anzeigen
  Given ich habe Urlaub am Mittwoch
  Then ist Mittwoch ausgegraut
  And zeigt "Urlaub" statt Allocations

Scenario: Bottom Navigation
  Given ich bin auf Mobile
  Then sehe ich eine Bottom Navigation mit:
    | Tab       | Icon   | Route         |
    | Woche     | Calendar| /meine-woche |
    | Profil    | User   | /profil       |

Scenario: Pull-to-Refresh
  Given ich bin auf "Meine Woche"
  When ich nach unten ziehe
  Then werden die Daten neu geladen
  And ich sehe einen Loading-Indicator

Scenario: Keine Allocation
  Given ich habe keine Allocations am Montag
  Then sehe ich "Keine Einsätze geplant"
  And ein dezentes Icon
```

---

## Implementierungsschritte

### 🔴 RED: Test für MyWeek Query

```typescript
// src/application/queries/__tests__/GetMyWeekQuery.test.ts
describe('GetMyWeekQuery', () => {
  it('should return allocations for current user only', async () => {
    const query = new GetMyWeekQuery(/* mocks */);
    const result = await query.execute({
      userId: 'user-1',
      weekStart: new Date('2026-02-02'),
    });

    expect(result.days).toHaveLength(5);
    expect(result.days[0].allocations.every((a) => a.userId === 'user-1')).toBe(true);
  });

  it('should include absences for current user', async () => {
    const query = new GetMyWeekQuery(/* mocks */);
    const result = await query.execute({
      userId: 'user-1',
      weekStart: new Date('2026-02-02'),
    });

    expect(result.days[2].absence).toBeDefined();
    expect(result.days[2].absence?.type).toBe('urlaub');
  });
});
```

### 🟢 GREEN: GetMyWeekQuery

```typescript
// src/application/queries/GetMyWeekQuery.ts
export interface MyWeekData {
  weekStart: Date;
  weekEnd: Date;
  calendarWeek: number;
  days: MyWeekDay[];
  totalPlannedHours: number;
}

interface MyWeekDay {
  date: Date;
  dayName: string;
  allocations: MyAllocation[];
  absence?: {
    type: AbsenceType;
    note?: string;
  };
}

interface MyAllocation {
  id: string;
  projectName: string;
  projectNumber: string;
  phaseName: string;
  plannedHours: number;
  notes?: string;
  bereich: 'produktion' | 'montage';
}

export class GetMyWeekQuery {
  constructor(
    private allocationRepository: IAllocationRepository,
    private absenceRepository: IAbsenceRepository
  ) {}

  async execute(request: { userId: string; weekStart: Date }): Promise<MyWeekData> {
    const { userId, weekStart } = request;
    const weekEnd = addDays(weekStart, 4);

    const [allocations, absences] = await Promise.all([
      this.allocationRepository.findByUserAndDateRange(userId, weekStart, weekEnd),
      this.absenceRepository.findByUserAndDateRange(userId, weekStart, weekEnd),
    ]);

    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

    const days: MyWeekDay[] = dayNames.map((dayName, index) => {
      const date = addDays(weekStart, index);

      const dayAllocations = allocations
        .filter((a) => a.date.toDateString() === date.toDateString())
        .map((a) => ({
          id: a.id,
          projectName: a.project.name,
          projectNumber: a.project.projectNumber,
          phaseName: a.projectPhase.name,
          plannedHours: a.plannedHours,
          notes: a.notes,
          bereich: a.projectPhase.bereich,
        }));

      const absence = absences.find(
        (ab) => date >= ab.startDate && date <= ab.endDate
      );

      return {
        date,
        dayName,
        allocations: dayAllocations,
        absence: absence ? { type: absence.type, note: absence.note } : undefined,
      };
    });

    const totalPlannedHours = allocations.reduce((sum, a) => sum + a.plannedHours, 0);

    return {
      weekStart,
      weekEnd,
      calendarWeek: getCalendarWeek(weekStart),
      days,
      totalPlannedHours,
    };
  }
}
```

### 🟢 GREEN: MyWeek Page

```typescript
// src/app/(mobile)/meine-woche/page.tsx
import { Suspense } from 'react';
import { getMyWeek } from '@/presentation/actions/my-week';
import { MyWeekView } from '@/presentation/components/mobile/MyWeekView';
import { MyWeekSkeleton } from '@/presentation/components/mobile/MyWeekSkeleton';
import { getWeekStart } from '@/lib/date-utils';

interface PageProps {
  searchParams: { week?: string };
}

export default function MyWeekPage({ searchParams }: PageProps) {
  const weekStart = searchParams.week
    ? new Date(searchParams.week)
    : getWeekStart(new Date());

  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<MyWeekSkeleton />}>
        <MyWeekContent weekStart={weekStart} />
      </Suspense>
    </div>
  );
}

async function MyWeekContent({ weekStart }: { weekStart: Date }) {
  const result = await getMyWeek(weekStart);

  if (!result.success) {
    return <div className="p-4">Fehler beim Laden</div>;
  }

  return <MyWeekView data={result.data} />;
}
```

### 🟢 GREEN: MyWeekView Component

```typescript
// src/presentation/components/mobile/MyWeekView.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { useRouter } from 'next/navigation';
import { MyWeekDayCard } from './MyWeekDayCard';

interface MyWeekViewProps {
  data: MyWeekData;
}

export function MyWeekView({ data }: MyWeekViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(data.weekStart);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    router.push(`/meine-woche?week=${newWeek.toISOString().split('T')[0]}`);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateWeek('next'),
    onSwipedRight: () => navigateWeek('prev'),
    trackMouse: false,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div {...swipeHandlers} className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div className="font-semibold">KW {data.calendarWeek}</div>
            <div className="text-sm text-gray-500">
              {format(data.weekStart, 'dd.MM.', { locale: de })} -{' '}
              {format(data.weekEnd, 'dd.MM.yyyy', { locale: de })}
            </div>
          </div>

          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Gesamt-Stunden */}
        <div className="mt-2 text-center text-sm text-gray-500">
          {data.totalPlannedHours}h geplant diese Woche
        </div>
      </div>

      {/* Pull-to-Refresh Indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <div className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      )}

      {/* Tages-Liste */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {data.days.map((day) => (
          <MyWeekDayCard key={day.date.toISOString()} day={day} />
        ))}
      </div>
    </div>
  );
}
```

### 🟢 GREEN: MyWeekDayCard Component

```typescript
// src/presentation/components/mobile/MyWeekDayCard.tsx
'use client';

import { format, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AbsenceType, MyWeekDay } from '@/application/queries/GetMyWeekQuery';

const ABSENCE_LABELS: Record<AbsenceType, string> = {
  urlaub: 'Urlaub',
  krank: 'Krank',
  feiertag: 'Feiertag',
  sonstiges: 'Abwesend',
};

const BEREICH_COLORS = {
  produktion: 'border-l-blue-500',
  montage: 'border-l-green-500',
};

interface MyWeekDayCardProps {
  day: MyWeekDay;
}

export function MyWeekDayCard({ day }: MyWeekDayCardProps) {
  const { date, dayName, allocations, absence } = day;
  const isCurrentDay = isToday(date);

  // Abwesenheits-Tag
  if (absence) {
    return (
      <div
        className={cn(
          'bg-gray-100 rounded-lg p-4',
          isCurrentDay && 'ring-2 ring-accent'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">
              {dayName}, {format(date, 'dd.MM.', { locale: de })}
            </div>
            <div className="text-sm text-gray-500">
              {ABSENCE_LABELS[absence.type]}
            </div>
          </div>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    );
  }

  // Keine Allocations
  if (allocations.length === 0) {
    return (
      <div
        className={cn(
          'bg-white border rounded-lg p-4',
          isCurrentDay && 'ring-2 ring-accent'
        )}
      >
        <div className="font-medium">
          {dayName}, {format(date, 'dd.MM.', { locale: de })}
        </div>
        <div className="text-sm text-gray-400 mt-2">
          Keine Einsätze geplant
        </div>
      </div>
    );
  }

  // Allocations anzeigen
  return (
    <div
      className={cn(
        'bg-white border rounded-lg overflow-hidden',
        isCurrentDay && 'ring-2 ring-accent'
      )}
    >
      {/* Tag Header */}
      <div className="px-4 py-2 bg-gray-50 border-b">
        <div className="font-medium">
          {dayName}, {format(date, 'dd.MM.', { locale: de })}
        </div>
      </div>

      {/* Allocations */}
      <div className="divide-y">
        {allocations.map((alloc) => (
          <div
            key={alloc.id}
            className={cn(
              'px-4 py-3 border-l-4',
              BEREICH_COLORS[alloc.bereich]
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">{alloc.projectName}</div>
                <div className="text-xs text-gray-500">{alloc.phaseName}</div>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-3.5 w-3.5" />
                {alloc.plannedHours}h
              </div>
            </div>

            {alloc.notes && (
              <div className="text-xs text-gray-500 mt-1 italic">
                {alloc.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 🟢 GREEN: Mobile Bottom Navigation

```typescript
// src/presentation/components/mobile/BottomNavigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/meine-woche', label: 'Woche', icon: Calendar },
  { href: '/profil', label: 'Profil', icon: User },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-inset-bottom">
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 px-4',
                isActive ? 'text-accent' : 'text-gray-400'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 🟢 GREEN: Mobile Layout

```typescript
// src/app/(mobile)/layout.tsx
import { BottomNavigation } from '@/presentation/components/mobile/BottomNavigation';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-16">
      {children}
      <BottomNavigation />
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── app/
│   └── (mobile)/
│       ├── layout.tsx
│       ├── meine-woche/
│       │   └── page.tsx
│       └── profil/
│           └── page.tsx
├── application/
│   └── queries/
│       └── GetMyWeekQuery.ts
└── presentation/
    ├── actions/
    │   └── my-week.ts
    └── components/
        └── mobile/
            ├── MyWeekView.tsx
            ├── MyWeekDayCard.tsx
            ├── MyWeekSkeleton.tsx
            └── BottomNavigation.tsx
```

---

## Hinweise

- Mobile-first Design
- Swipe für Wochen-Navigation (react-swipeable)
- Pull-to-Refresh Indikator
- Bottom Navigation für Mobile
- Abwesenheiten grau darstellen
- Farbe nach Bereich (Produktion/Montage)
- Safe Area für iPhone Notch

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Meine Woche zeigt User-Allocations
- [ ] Swipe Navigation funktioniert
- [ ] Abwesenheiten werden angezeigt
- [ ] Bottom Navigation funktioniert
- [ ] Responsive für verschiedene Screen-Größen
- [ ] Pull-to-Refresh funktioniert

---

*Vorheriger Prompt: 25 – Dashboard & KPIs*
*Nächster Prompt: 27 – Settings & Profile*
