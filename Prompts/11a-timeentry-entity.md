# Prompt 11a: TimeEntry Entity

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** S (Small)
**Geschätzte Zeit:** 1-2 Stunden

---

## Kontext

Absence Entity existiert. Jetzt implementieren wir TimeEntry für die IST-Stunden aus TimeTac.

**Bereits vorhanden:**
- User Entity
- ProjectPhase Entity mit actualHours
- Absence Entity

**Wichtig:** TimeEntries kommen NUR aus TimeTac und werden NICHT manuell erstellt!

---

## Ziel

Implementiere TimeEntry Entity für die Erfassung von IST-Arbeitszeiten aus TimeTac.

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – time_entries Tabelle
- `FEATURES.md` – F13.3 (Time Entries Import)

---

## Akzeptanzkriterien

```gherkin
Feature: TimeEntry Entity

Scenario: TimeEntry aus TimeTac
  Given ein TimeTac-Import läuft
  When Arbeitszeiten synchronisiert werden
  Then werden TimeEntries erstellt mit:
    | Feld         | Beschreibung                |
    | userId       | Gemappter User              |
    | phaseId      | Zugeordnete Phase           |
    | date         | Arbeitstag                  |
    | hours        | Gearbeitete Stunden         |
    | timetacId    | Original TimeTac-ID         |

Scenario: Kein manuelles Erstellen
  Given das System
  Then gibt es KEINE Möglichkeit, TimeEntries manuell zu erstellen
  Because alle IST-Stunden kommen aus TimeTac

Scenario: Duplikat-Erkennung
  Given ein TimeEntry mit timetacId "123" existiert
  When der Import erneut läuft mit derselben timetacId
  Then wird KEIN neues TimeEntry erstellt
  And das bestehende wird aktualisiert wenn sich Daten geändert haben

Scenario: actualHours Aktualisierung
  Given TimeEntries für eine Phase existieren
  Then wird project_phases.actual_hours automatisch aktualisiert
  Via DB-Trigger (Summe aller TimeEntries für diese Phase)
```

---

## Technische Anforderungen

### TimeEntry Entity aus DATA_MODEL.md

```typescript
interface TimeEntry {
  id: string;
  tenantId: string;
  userId: string;
  projectPhaseId?: string;  // Optional: Zuordnung zu Phase
  date: Date;
  hours: number;
  description?: string;
  timetacId: string;        // Pflicht: TimeTac-Referenz
  createdAt: Date;
  updatedAt: Date;
}
```

### ITimeEntryRepository Interface

```typescript
interface ITimeEntryRepository {
  findById(id: string): Promise<TimeEntry | null>;
  findByTimeTacId(timetacId: string): Promise<TimeEntry | null>;
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeEntry[]>;
  findByPhase(phaseId: string): Promise<TimeEntry[]>;
  save(entry: TimeEntry): Promise<TimeEntry>;
  saveMany(entries: TimeEntry[]): Promise<TimeEntry[]>;
  // KEIN delete - TimeEntries werden nur via Sync verwaltet
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für TimeEntry Entity

```typescript
// src/domain/entities/__tests__/TimeEntry.test.ts
import { describe, it, expect } from 'vitest';
import { TimeEntry } from '../TimeEntry';

describe('TimeEntry Entity', () => {
  it('should create valid time entry', () => {
    const entry = TimeEntry.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      date: new Date('2026-02-05'),
      hours: 8,
      timetacId: 'tt-123',
    });

    expect(entry.hours).toBe(8);
    expect(entry.timetacId).toBe('tt-123');
  });

  it('should require timetacId', () => {
    expect(() => TimeEntry.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      date: new Date('2026-02-05'),
      hours: 8,
      timetacId: '', // Leer!
    })).toThrow('TimeTac-ID ist erforderlich');
  });

  it('should validate hours range', () => {
    expect(() => TimeEntry.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      date: new Date('2026-02-05'),
      hours: -1, // Negativ!
      timetacId: 'tt-123',
    })).toThrow('Stunden müssen zwischen 0 und 24 liegen');

    expect(() => TimeEntry.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      date: new Date('2026-02-05'),
      hours: 25, // Über 24!
      timetacId: 'tt-123',
    })).toThrow('Stunden müssen zwischen 0 und 24 liegen');
  });

  it('should allow optional phase assignment', () => {
    const entry = TimeEntry.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      projectPhaseId: 'phase-123',
      date: new Date('2026-02-05'),
      hours: 4,
      timetacId: 'tt-123',
    });

    expect(entry.projectPhaseId).toBe('phase-123');
  });
});
```

### 🟢 GREEN: TimeEntry Entity implementieren

```typescript
// src/domain/entities/TimeEntry.ts
import { ValidationError } from '@/domain/errors';

export interface TimeEntryProps {
  id?: string;
  tenantId: string;
  userId: string;
  projectPhaseId?: string;
  date: Date;
  hours: number;
  description?: string;
  timetacId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TimeEntry {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly projectPhaseId?: string;
  readonly date: Date;
  readonly hours: number;
  readonly description?: string;
  readonly timetacId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: any) {
    Object.assign(this, props);
  }

  static create(props: TimeEntryProps): TimeEntry {
    // TimeTac-ID ist Pflicht (alle Entries kommen aus TimeTac)
    if (!props.timetacId?.trim()) {
      throw new ValidationError('TimeTac-ID ist erforderlich');
    }

    // Stunden validieren
    if (props.hours < 0 || props.hours > 24) {
      throw new ValidationError('Stunden müssen zwischen 0 und 24 liegen');
    }

    // Datum validieren
    if (!props.date || isNaN(props.date.getTime())) {
      throw new ValidationError('Gültiges Datum erforderlich');
    }

    return new TimeEntry({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      userId: props.userId,
      projectPhaseId: props.projectPhaseId,
      date: props.date,
      hours: props.hours,
      description: props.description?.trim(),
      timetacId: props.timetacId.trim(),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  /**
   * Ist einer Phase zugeordnet
   */
  get isAssignedToPhase(): boolean {
    return !!this.projectPhaseId;
  }

  /**
   * Erstellt eine Kopie mit neuer Phase-Zuordnung
   */
  withPhase(phaseId: string | undefined): TimeEntry {
    return TimeEntry.create({
      ...this,
      projectPhaseId: phaseId,
      updatedAt: new Date(),
    });
  }
}
```

### 🟢 GREEN: Repository implementieren

```typescript
// src/application/ports/repositories/ITimeEntryRepository.ts
import { TimeEntry } from '@/domain/entities/TimeEntry';

export interface ITimeEntryRepository {
  findById(id: string): Promise<TimeEntry | null>;
  findByTimeTacId(timetacId: string, tenantId: string): Promise<TimeEntry | null>;
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeEntry[]>;
  findByPhase(phaseId: string): Promise<TimeEntry[]>;
  sumHoursByPhase(phaseId: string): Promise<number>;
  save(entry: TimeEntry): Promise<TimeEntry>;
  saveMany(entries: TimeEntry[]): Promise<TimeEntry[]>;
}

// src/infrastructure/repositories/SupabaseTimeEntryRepository.ts
import { ITimeEntryRepository } from '@/application/ports/repositories/ITimeEntryRepository';
import { TimeEntry } from '@/domain/entities/TimeEntry';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { TimeEntryMapper } from '@/infrastructure/mappers/TimeEntryMapper';

export class SupabaseTimeEntryRepository implements ITimeEntryRepository {
  async findByTimeTacId(timetacId: string, tenantId: string): Promise<TimeEntry | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('timetac_id', timetacId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) return null;
    return TimeEntryMapper.toDomain(data);
  }

  async sumHoursByPhase(phaseId: string): Promise<number> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('time_entries')
      .select('hours')
      .eq('project_phase_id', phaseId);

    if (error || !data) return 0;
    return data.reduce((sum, entry) => sum + entry.hours, 0);
  }

  async saveMany(entries: TimeEntry[]): Promise<TimeEntry[]> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('time_entries')
      .upsert(
        entries.map(TimeEntryMapper.toPersistence),
        { onConflict: 'timetac_id,tenant_id' }
      )
      .select();

    if (error) throw new Error(`Failed to save time entries: ${error.message}`);
    return data.map(TimeEntryMapper.toDomain);
  }

  // ... weitere Methoden
}
```

---

## Erwartete Dateien

```
src/
├── domain/
│   └── entities/
│       ├── TimeEntry.ts
│       └── __tests__/
│           └── TimeEntry.test.ts
├── application/
│   └── ports/
│       └── repositories/
│           └── ITimeEntryRepository.ts
└── infrastructure/
    ├── repositories/
    │   └── SupabaseTimeEntryRepository.ts
    └── mappers/
        └── TimeEntryMapper.ts
```

---

## Hinweise

- TimeEntries kommen NUR aus TimeTac – KEIN manuelles CRUD
- `timetacId` ist Pflicht und dient der Duplikat-Erkennung
- `projectPhaseId` ist optional (Zuordnung erfolgt via Matching)
- DB-Trigger aktualisiert `project_phases.actual_hours` automatisch
- Upsert mit `onConflict: 'timetac_id,tenant_id'` für Idempotenz

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] TimeEntry Entity validiert korrekt
- [ ] timetacId ist Pflicht
- [ ] Repository findByTimeTacId funktioniert
- [ ] saveMany mit Upsert funktioniert

---

*Vorheriger Prompt: 11 – Absence Entity*
*Nächster Prompt: 12 – CreateAllocation Use Case*
