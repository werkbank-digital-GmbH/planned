# Prompt 22: Absence Sync Details

**Phase:** 5 – Integrationen
**Komplexität:** S (Small)
**Geschätzte Zeit:** 2 Stunden

---

## Kontext

TimeTac Integration ist implementiert. Jetzt verfeinern wir den Abwesenheits-Sync mit Konfliktbehandlung.

**Bereits vorhanden:**
- SyncTimeTacAbsencesUseCase
- AbsenceConflictChecker
- Allocation Warnings

---

## Ziel

Implementiere detaillierte Konfliktbehandlung und Benachrichtigungen für Abwesenheits-Sync.

---

## Referenz-Dokumentation

- `FEATURES.md` – F8.3 (Abwesenheits-Sync), F3.5 (Abwesenheits-Warnung)
- `Rules.md` – Konflikt-Handling

---

## Akzeptanzkriterien

```gherkin
Feature: Absence Sync Details

Scenario: Neue Abwesenheit mit existierenden Allocations
  Given Max hat Allocations für Montag-Freitag
  When eine Abwesenheit für Mittwoch importiert wird
  Then werden alle Allocations am Mittwoch als Konflikt markiert
  And Max' Vorgesetzter erhält eine Benachrichtigung

Scenario: Abwesenheit wird geändert
  Given Max hatte Urlaub Mo-Mi
  When in TimeTac der Urlaub auf Mo-Fr erweitert wird
  Then werden auch Do und Fr auf Konflikte geprüft

Scenario: Abwesenheit wird gelöscht
  Given Max hatte Urlaub am Mittwoch
  And die Allocation hatte einen Konflikt
  When der Urlaub in TimeTac gelöscht wird
  Then wird der Konflikt-Marker entfernt
  And die Allocation ist wieder normal

Scenario: Konflikt-Zusammenfassung nach Sync
  Given der Sync läuft
  When neue Konflikte entstehen
  Then sehe ich in der UI eine Zusammenfassung:
    | User | Datum      | Konflikt-Typ |
    | Max  | 04.02.2026 | urlaub       |
    | Anna | 05.02.2026 | krank        |

Scenario: Benachrichtigung bei Konflikt
  Given ich bin Planer
  When ein Konflikt entsteht
  Then sehe ich einen Badge im Header
  And ein Klick zeigt die Konflikt-Liste
  And ich kann Konflikte "lösen" (Allocation verschieben/löschen)
```

---

## Technische Anforderungen

### Konflikt-Detection

```typescript
interface AbsenceConflict {
  allocationId: string;
  absenceId: string;
  userId: string;
  date: Date;
  absenceType: AbsenceType;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: 'moved' | 'deleted' | 'ignored';
}
```

### Notification Service

```typescript
interface NotificationService {
  notifyAbsenceConflicts(
    tenantId: string,
    conflicts: AbsenceConflict[]
  ): Promise<void>;
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für Conflict Detection

```typescript
// src/application/use-cases/integrations/__tests__/DetectAbsenceConflicts.test.ts
describe('DetectAbsenceConflicts', () => {
  it('should detect conflicts when absence overlaps allocations', async () => {
    const mockAllocationRepo = {
      findByUserAndDateRange: vi.fn().mockResolvedValue([
        { id: 'alloc-1', date: new Date('2026-02-04'), userId: 'user-1' },
      ]),
    };

    const service = new AbsenceConflictService(mockAllocationRepo);
    const conflicts = await service.detectConflicts({
      userId: 'user-1',
      startDate: new Date('2026-02-02'),
      endDate: new Date('2026-02-06'),
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].allocationId).toBe('alloc-1');
  });
});
```

### 🟢 GREEN: AbsenceConflictService erweitern

```typescript
// src/domain/services/AbsenceConflictService.ts
export class AbsenceConflictService {
  constructor(
    private allocationRepository: IAllocationRepository,
    private conflictRepository: IAbsenceConflictRepository
  ) {}

  async detectAndRecordConflicts(absence: Absence): Promise<AbsenceConflict[]> {
    // Alle Allocations im Abwesenheits-Zeitraum finden
    const allocations = await this.allocationRepository.findByUserAndDateRange(
      absence.userId,
      absence.startDate,
      absence.endDate
    );

    const conflicts: AbsenceConflict[] = [];

    for (const allocation of allocations) {
      // Prüfen ob bereits ein Konflikt existiert
      const existing = await this.conflictRepository.findByAllocationAndAbsence(
        allocation.id,
        absence.id
      );

      if (!existing) {
        const conflict: AbsenceConflict = {
          id: crypto.randomUUID(),
          allocationId: allocation.id,
          absenceId: absence.id,
          userId: absence.userId,
          date: allocation.date,
          absenceType: absence.type,
          createdAt: new Date(),
        };

        await this.conflictRepository.save(conflict);
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'moved' | 'deleted' | 'ignored',
    resolvedBy: string
  ): Promise<void> {
    await this.conflictRepository.update(conflictId, {
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
    });
  }

  async removeConflictsForAbsence(absenceId: string): Promise<void> {
    // Wenn Abwesenheit gelöscht wird, Konflikte entfernen
    await this.conflictRepository.deleteByAbsenceId(absenceId);
  }
}
```

### 🟢 GREEN: Conflict Notification UI

```typescript
// src/presentation/components/notifications/ConflictBadge.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { getUnresolvedConflicts } from '@/presentation/actions/conflicts';
import { Badge } from '@/presentation/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/ui/popover';
import { ConflictList } from './ConflictList';

export function ConflictBadge() {
  const { data: conflicts } = useQuery({
    queryKey: ['conflicts', 'unresolved'],
    queryFn: getUnresolvedConflicts,
    refetchInterval: 60000, // Alle 60 Sekunden
  });

  const count = conflicts?.data?.length || 0;

  if (count === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-gray-100 rounded-md">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {count}
          </Badge>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b">
          <h3 className="font-medium">Planungskonflikte</h3>
          <p className="text-xs text-gray-500">
            {count} Allocations mit Abwesenheits-Überschneidung
          </p>
        </div>
        <ConflictList conflicts={conflicts?.data || []} />
      </PopoverContent>
    </Popover>
  );
}
```

### 🟢 GREEN: ConflictList Component

```typescript
// src/presentation/components/notifications/ConflictList.tsx
'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resolveConflict } from '@/presentation/actions/conflicts';

interface ConflictListProps {
  conflicts: AbsenceConflict[];
}

const ABSENCE_LABELS: Record<AbsenceType, string> = {
  urlaub: 'Urlaub',
  krank: 'Krank',
  feiertag: 'Feiertag',
  sonstiges: 'Sonstiges',
};

export function ConflictList({ conflicts }: ConflictListProps) {
  const queryClient = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      resolveConflict(id, resolution as 'moved' | 'deleted' | 'ignored'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });

  if (conflicts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Keine Konflikte
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-auto">
      {conflicts.map((conflict) => (
        <div
          key={conflict.id}
          className="p-3 border-b hover:bg-gray-50 flex items-center justify-between"
        >
          <div>
            <div className="font-medium text-sm">
              {conflict.userName}
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(conflict.date), 'EEE, dd.MM.yyyy', { locale: de })}
              {' • '}
              {ABSENCE_LABELS[conflict.absenceType]}
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                resolveMutation.mutate({ id: conflict.id, resolution: 'deleted' })
              }
              title="Allocation löschen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                resolveMutation.mutate({ id: conflict.id, resolution: 'moved' })
              }
              title="Allocation verschieben"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                resolveMutation.mutate({ id: conflict.id, resolution: 'ignored' })
              }
              title="Ignorieren"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── domain/
│   └── services/
│       └── AbsenceConflictService.ts  # Erweitert
├── application/
│   ├── ports/
│   │   └── repositories/
│   │       └── IAbsenceConflictRepository.ts
│   └── use-cases/
│       └── conflicts/
│           └── ResolveConflictUseCase.ts
├── infrastructure/
│   └── repositories/
│       └── SupabaseAbsenceConflictRepository.ts
└── presentation/
    ├── actions/
    │   └── conflicts.ts
    └── components/
        └── notifications/
            ├── ConflictBadge.tsx
            └── ConflictList.tsx
```

---

## Hinweise

- Konflikte werden bei jedem Sync geprüft
- Badge im Header zeigt Anzahl ungelöster Konflikte
- Konflikte können "gelöst" werden: moved, deleted, ignored
- Bei Löschung der Abwesenheit werden Konflikte automatisch entfernt
- Realtime-Update wenn Konflikte entstehen (Prompt 14a)

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Konflikte werden bei Sync erkannt
- [ ] Badge zeigt Konflikt-Anzahl
- [ ] Konflikt-Liste ist klickbar
- [ ] Konflikte können gelöst werden
- [ ] Automatische Bereinigung bei Absence-Löschung

---

*Vorheriger Prompt: 21 – TimeTac Integration*
*Nächster Prompt: 23 – Project Sync Details*
