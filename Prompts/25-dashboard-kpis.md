# Prompt 25: Dashboard & KPIs

**Phase:** 6 – Dashboard, Mobile & Finishing
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 3-4 Stunden

---

## Kontext

Die Planung und Integrationen sind fertig. Jetzt implementieren wir das Dashboard mit KPIs.

**Bereits vorhanden:**
- Alle Use Cases
- GetAllocationsForWeekQuery
- TimeEntry Sync
- Absence Sync

---

## Ziel

Implementiere das Dashboard mit Auslastungs-Übersicht und Projekt-KPIs.

---

## Referenz-Dokumentation

- `FEATURES.md` – F9 (Dashboard)
- **UI-Screens:**
  - `stitch_planned./dashboard_-_overview_screen/dashboard_-_overview_screen.png`

---

## Akzeptanzkriterien

```gherkin
Feature: F9 - Dashboard

Scenario: Dashboard Übersicht
  Given ich bin eingeloggt
  When ich das Dashboard öffne
  Then sehe ich:
    | Bereich             | Inhalt                    |
    | Wochen-Auslastung   | Chart der aktuellen Woche |
    | Team-Kapazität      | Verfügbar vs. Geplant     |
    | Projekt-Übersicht   | Top 5 aktive Projekte     |
    | Bevorstehende Events| Abwesenheiten diese Woche |

Scenario: Auslastungs-Chart
  Given ich bin auf dem Dashboard
  Then sehe ich ein Balken-Chart mit:
    | Tag | Kapazität | Geplant | Auslastung |
    | Mo  | 40h       | 35h     | 87.5%      |
    | Di  | 40h       | 42h     | 105%       |
    | ... | ...       | ...     | ...        |
  And Überauslastung (>100%) ist rot markiert

Scenario: Team-Kapazität Widget
  Given mein Team hat 5 aktive Mitarbeiter
  When ich das Dashboard öffne
  Then sehe ich:
    | Metrik              | Wert    |
    | Mitarbeiter aktiv   | 5       |
    | Wochen-Kapazität    | 200h    |
    | Geplante Stunden    | 185h    |
    | Freie Kapazität     | 15h     |

Scenario: Projekt-Übersicht Widget
  Given es existieren aktive Projekte
  When ich das Dashboard öffne
  Then sehe ich die Top 5 Projekte nach Stunden diese Woche
  And für jedes Projekt: Name, geplante Stunden, Fortschritt

Scenario: Abwesenheiten Widget
  Given Mitarbeiter haben Abwesenheiten diese Woche
  When ich das Dashboard öffne
  Then sehe ich kommende Abwesenheiten
  And sortiert nach Datum
  And mit Typ (Urlaub, Krank, etc.)

Scenario: Dashboard als Startseite für Planer
  Given ich bin als Planer eingeloggt
  When ich zur App navigiere
  Then lande ich automatisch auf dem Dashboard
```

---

## Implementierungsschritte

### 🔴 RED: Test für Dashboard Query

```typescript
// src/application/queries/__tests__/GetDashboardDataQuery.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GetDashboardDataQuery } from '../GetDashboardDataQuery';

describe('GetDashboardDataQuery', () => {
  it('should return weekly utilization data', async () => {
    const query = new GetDashboardDataQuery(/* mocks */);
    const result = await query.execute({ tenantId: 'tenant-1' });

    expect(result.weeklyUtilization).toHaveLength(5);
    expect(result.weeklyUtilization[0]).toHaveProperty('capacity');
    expect(result.weeklyUtilization[0]).toHaveProperty('planned');
  });

  it('should return team capacity metrics', async () => {
    const query = new GetDashboardDataQuery(/* mocks */);
    const result = await query.execute({ tenantId: 'tenant-1' });

    expect(result.teamCapacity).toHaveProperty('activeUsers');
    expect(result.teamCapacity).toHaveProperty('weeklyCapacity');
    expect(result.teamCapacity).toHaveProperty('plannedHours');
    expect(result.teamCapacity).toHaveProperty('freeCapacity');
  });
});
```

### 🟢 GREEN: GetDashboardDataQuery

```typescript
// src/application/queries/GetDashboardDataQuery.ts
export interface DashboardData {
  weeklyUtilization: DayUtilization[];
  teamCapacity: TeamCapacityMetrics;
  topProjects: ProjectSummary[];
  upcomingAbsences: AbsenceSummary[];
  weekStart: Date;
  weekEnd: Date;
}

interface DayUtilization {
  date: Date;
  dayName: string;
  capacity: number;
  planned: number;
  utilizationPercent: number;
}

interface TeamCapacityMetrics {
  activeUsers: number;
  weeklyCapacity: number;
  plannedHours: number;
  freeCapacity: number;
  utilizationPercent: number;
}

export class GetDashboardDataQuery {
  constructor(
    private userRepository: IUserRepository,
    private allocationRepository: IAllocationRepository,
    private absenceRepository: IAbsenceRepository,
    private projectRepository: IProjectRepository
  ) {}

  async execute(request: { tenantId: string }): Promise<DashboardData> {
    const { tenantId } = request;
    const weekStart = this.getWeekStart(new Date());
    const weekEnd = this.getWeekEnd(weekStart);

    // Parallel laden
    const [users, allocations, absences] = await Promise.all([
      this.userRepository.findActiveByTenant(tenantId),
      this.allocationRepository.findByTenantAndDateRange(tenantId, weekStart, weekEnd),
      this.absenceRepository.findByTenantAndDateRange(tenantId, weekStart, weekEnd),
    ]);

    // Weekly Utilization berechnen
    const weeklyUtilization = this.calculateWeeklyUtilization(
      weekStart,
      users,
      allocations
    );

    // Team Capacity berechnen
    const teamCapacity = this.calculateTeamCapacity(users, allocations);

    // Top Projects
    const topProjects = await this.getTopProjects(tenantId, allocations);

    // Upcoming Absences
    const upcomingAbsences = this.formatAbsences(absences, users);

    return {
      weeklyUtilization,
      teamCapacity,
      topProjects,
      upcomingAbsences,
      weekStart,
      weekEnd,
    };
  }

  private calculateWeeklyUtilization(
    weekStart: Date,
    users: User[],
    allocations: Allocation[]
  ): DayUtilization[] {
    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    const dailyCapacity = users.reduce((sum, u) => sum + u.weeklyHours / 5, 0);

    return dayNames.map((dayName, index) => {
      const date = addDays(weekStart, index);
      const dayAllocations = allocations.filter(
        (a) => a.date.toDateString() === date.toDateString()
      );
      const planned = dayAllocations.reduce((sum, a) => sum + a.plannedHours, 0);

      return {
        date,
        dayName,
        capacity: Math.round(dailyCapacity),
        planned: Math.round(planned),
        utilizationPercent: dailyCapacity > 0
          ? Math.round((planned / dailyCapacity) * 100)
          : 0,
      };
    });
  }

  private calculateTeamCapacity(users: User[], allocations: Allocation[]): TeamCapacityMetrics {
    const weeklyCapacity = users.reduce((sum, u) => sum + u.weeklyHours, 0);
    const plannedHours = allocations.reduce((sum, a) => sum + a.plannedHours, 0);
    const freeCapacity = weeklyCapacity - plannedHours;

    return {
      activeUsers: users.length,
      weeklyCapacity: Math.round(weeklyCapacity),
      plannedHours: Math.round(plannedHours),
      freeCapacity: Math.round(freeCapacity),
      utilizationPercent: weeklyCapacity > 0
        ? Math.round((plannedHours / weeklyCapacity) * 100)
        : 0,
    };
  }

  private async getTopProjects(
    tenantId: string,
    allocations: Allocation[]
  ): Promise<ProjectSummary[]> {
    // Gruppieren nach Projekt
    const projectHours = new Map<string, number>();
    for (const alloc of allocations) {
      const current = projectHours.get(alloc.projectPhaseId) || 0;
      projectHours.set(alloc.projectPhaseId, current + alloc.plannedHours);
    }

    // Sortieren und Top 5
    const sorted = [...projectHours.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Projekt-Details laden
    const summaries: ProjectSummary[] = [];
    for (const [phaseId, hours] of sorted) {
      const phase = await this.projectRepository.findPhaseWithProject(phaseId);
      if (phase) {
        summaries.push({
          id: phase.project.id,
          name: phase.project.name,
          projectNumber: phase.project.projectNumber,
          hoursThisWeek: Math.round(hours),
        });
      }
    }

    return summaries;
  }

  private formatAbsences(absences: Absence[], users: User[]): AbsenceSummary[] {
    const userMap = new Map(users.map((u) => [u.id, u]));

    return absences
      .filter((a) => a.startDate >= new Date())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        userName: userMap.get(a.userId)?.fullName || 'Unknown',
        type: a.type,
        startDate: a.startDate,
        endDate: a.endDate,
      }));
  }
}
```

### 🟢 GREEN: Dashboard Page

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { Suspense } from 'react';
import { getDashboardData } from '@/presentation/actions/dashboard';
import { UtilizationChart } from '@/presentation/components/dashboard/UtilizationChart';
import { TeamCapacityCard } from '@/presentation/components/dashboard/TeamCapacityCard';
import { TopProjectsCard } from '@/presentation/components/dashboard/TopProjectsCard';
import { UpcomingAbsencesCard } from '@/presentation/components/dashboard/UpcomingAbsencesCard';
import { DashboardSkeleton } from '@/presentation/components/dashboard/DashboardSkeleton';

export default async function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const result = await getDashboardData();

  if (!result.success) {
    return <div>Fehler beim Laden des Dashboards</div>;
  }

  const data = result.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Wochen-Auslastung (volle Breite) */}
      <div className="lg:col-span-2">
        <UtilizationChart data={data.weeklyUtilization} />
      </div>

      {/* Team-Kapazität */}
      <TeamCapacityCard data={data.teamCapacity} />

      {/* Top Projekte */}
      <TopProjectsCard projects={data.topProjects} />

      {/* Bevorstehende Abwesenheiten */}
      <div className="lg:col-span-2">
        <UpcomingAbsencesCard absences={data.upcomingAbsences} />
      </div>
    </div>
  );
}
```

### 🟢 GREEN: UtilizationChart Component

```typescript
// src/presentation/components/dashboard/UtilizationChart.tsx
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/presentation/components/ui/card';

interface UtilizationChartProps {
  data: DayUtilization[];
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  const getBarColor = (percent: number) => {
    if (percent > 100) return '#EF4444'; // Error/Red
    if (percent >= 80) return '#F59E0B'; // Warning/Yellow
    return '#10B981'; // Success/Green
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wochen-Auslastung</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dayName" />
            <YAxis unit="h" />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value}h`,
                name === 'capacity' ? 'Kapazität' : 'Geplant',
              ]}
            />
            <Bar dataKey="capacity" fill="#E5E7EB" name="capacity" />
            <Bar dataKey="planned" name="planned">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.utilizationPercent)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legende */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-300 rounded" />
            <span>Kapazität</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded" />
            <span>&lt;80%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-warning rounded" />
            <span>80-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-error rounded" />
            <span>&gt;100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 🟢 GREEN: TeamCapacityCard Component

```typescript
// src/presentation/components/dashboard/TeamCapacityCard.tsx
import { Users, Clock, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/presentation/components/ui/card';
import { cn } from '@/lib/utils';

interface TeamCapacityCardProps {
  data: TeamCapacityMetrics;
}

export function TeamCapacityCard({ data }: TeamCapacityCardProps) {
  const { activeUsers, weeklyCapacity, plannedHours, freeCapacity, utilizationPercent } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team-Kapazität
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <div className="text-sm text-gray-500">Aktive Mitarbeiter</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{weeklyCapacity}h</div>
            <div className="text-sm text-gray-500">Wochen-Kapazität</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{plannedHours}h</div>
            <div className="text-sm text-gray-500">Geplant</div>
          </div>
          <div>
            <div className={cn(
              'text-2xl font-bold',
              freeCapacity < 0 ? 'text-error' : 'text-success'
            )}>
              {freeCapacity}h
            </div>
            <div className="text-sm text-gray-500">
              {freeCapacity < 0 ? 'Überbucht' : 'Frei'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Auslastung</span>
            <span className={cn(
              utilizationPercent > 100 && 'text-error'
            )}>
              {utilizationPercent}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                utilizationPercent > 100 ? 'bg-error' :
                utilizationPercent >= 80 ? 'bg-warning' : 'bg-success'
              )}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Erwartete Dateien

```
src/
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           └── page.tsx
├── application/
│   └── queries/
│       ├── GetDashboardDataQuery.ts
│       └── __tests__/
│           └── GetDashboardDataQuery.test.ts
├── presentation/
│   ├── actions/
│   │   └── dashboard.ts
│   └── components/
│       └── dashboard/
│           ├── UtilizationChart.tsx
│           ├── TeamCapacityCard.tsx
│           ├── TopProjectsCard.tsx
│           ├── UpcomingAbsencesCard.tsx
│           └── DashboardSkeleton.tsx
```

---

## Hinweise

- Dashboard ist Startseite für Planer/Admin
- Recharts für Charts (oder alternative Bibliothek)
- Server Components für initiale Daten
- Überauslastung rot markieren
- Top 5 Projekte nach geplanten Stunden
- Abwesenheiten der nächsten 7 Tage

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Dashboard zeigt Wochen-Auslastung
- [ ] Team-Kapazität Widget funktioniert
- [ ] Top Projekte werden angezeigt
- [ ] Abwesenheiten werden gelistet
- [ ] Farbcodierung für Auslastung
- [ ] Redirect von / zu /dashboard (für Planer)

---

*Vorheriger Prompt: 24 – Time Entry Sync Details*
*Nächster Prompt: 26 – Mobile "Meine Woche" View*
