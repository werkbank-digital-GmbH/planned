# Prompt 24: Time Entry Sync Details

**Phase:** 5 – Integrationen
**Komplexität:** S (Small)
**Geschätzte Zeit:** 2 Stunden

---

## Kontext

TimeTac Integration ist implementiert. Jetzt verfeinern wir den TimeEntry-Sync mit Projekt-Zuordnung.

**Bereits vorhanden:**
- SyncTimeTacTimeEntriesUseCase
- TimeEntry Entity (aus Prompt 11a)
- GetAllocationsForWeekQuery (zeigt ActualHours)

---

## Ziel

Implementiere Projekt-Zuordnung für TimeEntries und die Anzeige von Ist-Zeiten in der UI.

---

## Referenz-Dokumentation

- `FEATURES.md` – F8.4 (Ist-Zeiten Sync)
- `DATA_MODEL.md` – time_entries Tabelle

---

## Akzeptanzkriterien

```gherkin
Feature: Time Entry Sync Details

Scenario: TimeEntry wird Projekt zugeordnet
  Given TimeTac TimeEntry hat project_id = 101
  And Projekt 101 ist in Planned als "Schulhaus Muster" bekannt
  When der Sync läuft
  Then wird TimeEntry mit projectPhaseId verknüpft
  And erscheint in der SOLL/IST Berechnung

Scenario: TimeEntry ohne Projekt-Zuordnung
  Given TimeTac TimeEntry hat kein project_id
  When der Sync läuft
  Then wird TimeEntry importiert
  But ohne projectPhaseId
  And erscheint nur in User-Gesamt-IST

Scenario: Ist-Zeiten in Allocation Card
  Given User Max hat 8h geplant am Montag
  And TimeTac zeigt 6h gearbeitet am Montag
  When ich die Planungsansicht öffne
  Then sehe ich auf der Allocation Card:
    | Planned | 8h      |
    | Actual  | 6h (75%)|

Scenario: Ist-Zeiten in Phase-Übersicht
  Given Phase "Elementierung" hat SOLL = 120h
  And IST aus TimeEntries = 95h
  When ich die Projekt-Übersicht öffne
  Then sehe ich:
    | SOLL | 120h       |
    | PLAN | (aus Alloc)|
    | IST  | 95h (79%)  |

Scenario: TimeTac Projekt-Mapping konfigurieren
  Given ich bin in Einstellungen > Integrationen
  When ich zu TimeTac Projekt-Mapping gehe
  Then kann ich TimeTac-Projekte Planned-Projekten zuordnen
  And der Sync verwendet diese Zuordnung
```

---

## Implementierungsschritte

### 🟢 GREEN: Projekt-Mapping für TimeEntries

```typescript
// src/application/use-cases/integrations/SyncTimeTacTimeEntriesUseCase.ts (erweitert)

async execute(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<SyncResult> {
  // ... bestehender Code ...

  // Projekt-Mapping laden
  const projectMapping = await this.getProjectMapping(tenantId);
  // Map<timetacProjectId, plannedProjectPhaseId>

  for (const entry of timeEntries) {
    const userId = userMap.get(entry.user_id);
    if (!userId) continue;

    // Projekt-Zuordnung
    let projectPhaseId: string | undefined;
    if (entry.project_id && projectMapping.has(entry.project_id)) {
      projectPhaseId = projectMapping.get(entry.project_id);
    }

    const entryData = {
      timetacId: entry.id,
      userId,
      tenantId,
      date: new Date(entry.date),
      hours: entry.duration_hours,
      notes: entry.note,
      projectPhaseId, // Kann undefined sein
    };

    // ... save/update ...
  }
}

private async getProjectMapping(tenantId: string): Promise<Map<number, string>> {
  const mappings = await this.mappingRepository.findByTenant(tenantId, 'timetac_project');
  return new Map(
    mappings.map((m) => [parseInt(m.externalId), m.internalId])
  );
}
```

### 🟢 GREEN: Projekt-Mapping UI

```typescript
// src/presentation/components/settings/TimeTacProjectMapping.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';
import {
  getTimeTacProjects,
  getTimeTacProjectMapping,
  getProjects,
  saveTimeTacProjectMapping,
} from '@/presentation/actions/integrations';
import { toast } from 'sonner';

export function TimeTacProjectMapping() {
  const queryClient = useQueryClient();

  const { data: timetacProjects } = useQuery({
    queryKey: ['timetac', 'projects'],
    queryFn: getTimeTacProjects,
  });

  const { data: localProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects({ includePhases: true }),
  });

  const { data: currentMapping } = useQuery({
    queryKey: ['timetac', 'projectMapping'],
    queryFn: getTimeTacProjectMapping,
  });

  const saveMutation = useMutation({
    mutationFn: saveTimeTacProjectMapping,
    onSuccess: () => {
      toast.success('Zuordnung gespeichert');
      queryClient.invalidateQueries({ queryKey: ['timetac', 'projectMapping'] });
    },
  });

  const handleChange = (timetacProjectId: number, plannedPhaseId: string) => {
    saveMutation.mutate({ timetacProjectId, plannedPhaseId });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Projekt-Zuordnung</h3>
        <p className="text-sm text-gray-500">
          Ordnen Sie TimeTac-Projekte den Planned-Phasen zu für IST-Zeiten.
        </p>
      </div>

      <div className="border rounded-md divide-y max-h-96 overflow-auto">
        {timetacProjects?.data?.map((ttProject) => (
          <div
            key={ttProject.id}
            className="grid grid-cols-2 gap-4 p-3 items-center"
          >
            <div>
              <div className="font-medium text-sm">{ttProject.name}</div>
              <div className="text-xs text-gray-500">TimeTac #{ttProject.id}</div>
            </div>

            <Select
              value={currentMapping?.data?.[ttProject.id] || ''}
              onValueChange={(value) => handleChange(ttProject.id, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Phase auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nicht zugeordnet</SelectItem>
                {localProjects?.data?.flatMap((project) =>
                  project.phases?.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {project.name} → {phase.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 🟢 GREEN: Ist-Zeiten in AllocationCard anzeigen

```typescript
// src/presentation/components/planning/AllocationCard.tsx (erweitert)

export function AllocationCard({
  allocation,
  hasAbsenceConflict,
  isDragging,
}: AllocationCardProps) {
  const { plannedHours, actualHours } = allocation;

  // Prozent berechnen
  const percentage = plannedHours > 0
    ? Math.round((actualHours / plannedHours) * 100)
    : 0;

  // Farbe basierend auf Erfüllung
  const getActualColor = () => {
    if (percentage >= 100) return 'text-success';
    if (percentage >= 80) return 'text-warning';
    return 'text-gray-500';
  };

  return (
    <div className={cn(/* ... */)}>
      {/* ... Header ... */}

      <div className="text-xs mt-1">
        <span>{plannedHours}h</span>
        {actualHours > 0 && (
          <span className={cn('ml-1', getActualColor())}>
            ({actualHours}h / {percentage}%)
          </span>
        )}
      </div>

      {/* ... Notes ... */}
    </div>
  );
}
```

### 🟢 GREEN: Phase IST-Berechnung

```typescript
// src/application/queries/GetProjectPhaseSummaryQuery.ts

export class GetProjectPhaseSummaryQuery {
  constructor(
    private projectPhaseRepository: IProjectPhaseRepository,
    private allocationRepository: IAllocationRepository,
    private timeEntryRepository: ITimeEntryRepository
  ) {}

  async execute(projectPhaseId: string): Promise<ProjectPhaseSummary> {
    const phase = await this.projectPhaseRepository.findById(projectPhaseId);
    if (!phase) {
      throw new NotFoundError('ProjectPhase', projectPhaseId);
    }

    // SOLL aus Phase
    const sollHours = phase.sollHours;

    // PLAN aus Allocations
    const allocations = await this.allocationRepository.findByProjectPhase(projectPhaseId);
    const planHours = allocations.reduce((sum, a) => sum + a.plannedHours, 0);

    // IST aus TimeEntries
    const timeEntries = await this.timeEntryRepository.findByProjectPhase(projectPhaseId);
    const istHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);

    return {
      id: phase.id,
      name: phase.name,
      bereich: phase.bereich,
      sollHours,
      planHours,
      istHours,
      planPercentage: sollHours > 0 ? Math.round((planHours / sollHours) * 100) : 0,
      istPercentage: sollHours > 0 ? Math.round((istHours / sollHours) * 100) : 0,
    };
  }
}
```

### 🟢 GREEN: Projekt-Übersicht mit IST-Zeiten

```typescript
// src/presentation/components/projects/ProjectPhaseProgress.tsx
'use client';

import { cn } from '@/lib/utils';

interface ProjectPhaseProgressProps {
  phase: ProjectPhaseSummary;
}

export function ProjectPhaseProgress({ phase }: ProjectPhaseProgressProps) {
  const { sollHours, planHours, istHours, planPercentage, istPercentage } = phase;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{phase.name}</span>
        <span className="text-gray-500">{sollHours}h SOLL</span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-1">
        {/* PLAN */}
        <div className="flex items-center gap-2">
          <span className="text-xs w-10">PLAN</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                planPercentage > 100 ? 'bg-error' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(planPercentage, 100)}%` }}
            />
          </div>
          <span className="text-xs w-16 text-right">
            {planHours}h ({planPercentage}%)
          </span>
        </div>

        {/* IST */}
        <div className="flex items-center gap-2">
          <span className="text-xs w-10">IST</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${Math.min(istPercentage, 100)}%` }}
            />
          </div>
          <span className="text-xs w-16 text-right">
            {istHours}h ({istPercentage}%)
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── application/
│   ├── queries/
│   │   └── GetProjectPhaseSummaryQuery.ts
│   └── use-cases/
│       └── integrations/
│           └── SyncTimeTacTimeEntriesUseCase.ts  # Erweitert
├── infrastructure/
│   └── repositories/
│       └── SupabaseIntegrationMappingRepository.ts
└── presentation/
    ├── actions/
    │   └── integrations.ts  # Erweitert
    └── components/
        ├── settings/
        │   └── TimeTacProjectMapping.tsx
        └── projects/
            └── ProjectPhaseProgress.tsx
```

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Projekt-Mapping ist konfigurierbar
- [ ] TimeEntries werden Phasen zugeordnet
- [ ] Ist-Zeiten erscheinen in Allocation Card
- [ ] Phase-Übersicht zeigt SOLL/PLAN/IST
- [ ] TimeEntries ohne Projekt funktionieren

---

*Vorheriger Prompt: 23 – Project Sync Details*
*Nächster Prompt: 25 – Dashboard & KPIs*
