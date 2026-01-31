# Prompt 11: Absence Entity & Konflikt-Erkennung

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

Resource Entities existieren. Jetzt implementieren wir Abwesenheiten (Urlaub, Krank, etc.) und die Konflikt-Erkennung.

**Bereits vorhanden:**
- User Entity
- Allocation Entity mit Abwesenheits-Warnung

**Wichtig:** Abwesenheiten kommen primär aus TimeTac, können aber auch manuell erfasst werden.

---

## Ziel

Implementiere Absence Entity mit Konflikt-Erkennung zwischen Allocations und Abwesenheiten.

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – absences Tabelle
- `Rules.md` – "Abwesenheit = Warnung, KEIN Block"
- `FEATURES.md` – F2.2 (System Alerts für absence_conflict)

---

## Akzeptanzkriterien

```gherkin
Feature: Abwesenheits-Verwaltung

Scenario: Abwesenheit anlegen
  Given ich bin Admin oder Planer
  When ich eine Abwesenheit für einen Mitarbeiter anlege
  Then wird sie in der Datenbank gespeichert
  With Typ, Startdatum, Enddatum

Scenario: Abwesenheits-Typen
  Given die App
  Then unterstützt sie folgende Abwesenheitstypen:
    | DB-Wert   | UI-Label    | Farbe |
    | vacation  | Urlaub      | Blau  |
    | sick      | Krank       | Rot   |
    | holiday   | Feiertag    | Grün  |
    | training  | Fortbildung | Lila  |
    | other     | Sonstiges   | Grau  |

Scenario: Konflikt-Erkennung
  Given ein User hat Urlaub vom 05.-07.02.
  And eine Allocation existiert für den 06.02.
  When ich die Allocation lade
  Then hat sie hasAbsenceWarning = true
  And die UI zeigt eine Warnung an

Scenario: Allocation trotz Abwesenheit erlaubt
  Given ein User hat Urlaub am 05.02.
  When ich eine neue Allocation für den 05.02. erstelle
  Then wird die Allocation erstellt (nicht blockiert!)
  And ein Alert wird generiert (absence_conflict)
```

---

## Technische Anforderungen

### Absence Entity aus DATA_MODEL.md

```typescript
interface Absence {
  id: string;
  tenantId: string;
  userId: string;
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  notes?: string;
  timetacId?: string;   // Für Sync
  createdAt: Date;
  updatedAt: Date;
}

type AbsenceType = 'vacation' | 'sick' | 'holiday' | 'training' | 'other';
```

### Konflikt-Check Interface

```typescript
interface AbsenceConflictChecker {
  hasConflict(userId: string, date: Date): Promise<boolean>;
  getConflictingAbsence(userId: string, date: Date): Promise<Absence | null>;
  getConflictsForAllocations(allocations: Allocation[]): Promise<Map<string, Absence>>;
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für Absence Entity

```typescript
// src/domain/entities/__tests__/Absence.test.ts
import { describe, it, expect } from 'vitest';
import { Absence } from '../Absence';

describe('Absence Entity', () => {
  it('should create valid absence', () => {
    const absence = Absence.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      type: 'vacation',
      startDate: new Date('2026-02-05'),
      endDate: new Date('2026-02-07'),
    });

    expect(absence.type).toBe('vacation');
    expect(absence.durationDays).toBe(3);
  });

  it('should validate date range', () => {
    expect(() => Absence.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      type: 'vacation',
      startDate: new Date('2026-02-07'),
      endDate: new Date('2026-02-05'), // Ende vor Start!
    })).toThrow('Enddatum muss nach Startdatum liegen');
  });

  it('should validate absence type', () => {
    expect(() => Absence.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      type: 'invalid' as any,
      startDate: new Date('2026-02-05'),
      endDate: new Date('2026-02-07'),
    })).toThrow('Ungültiger Abwesenheitstyp');
  });

  it('should check if date is within absence', () => {
    const absence = Absence.create({
      tenantId: 'tenant-123',
      userId: 'user-123',
      type: 'vacation',
      startDate: new Date('2026-02-05'),
      endDate: new Date('2026-02-07'),
    });

    expect(absence.includesDate(new Date('2026-02-06'))).toBe(true);
    expect(absence.includesDate(new Date('2026-02-08'))).toBe(false);
  });
});
```

### 🟢 GREEN: Absence Entity implementieren

```typescript
// src/domain/entities/Absence.ts
import { ValidationError } from '@/domain/errors';

export type AbsenceType = 'vacation' | 'sick' | 'holiday' | 'training' | 'other';

const VALID_ABSENCE_TYPES: AbsenceType[] = ['vacation', 'sick', 'holiday', 'training', 'other'];

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  holiday: 'Feiertag',
  training: 'Fortbildung',
  other: 'Sonstiges',
};

export interface AbsenceProps {
  id?: string;
  tenantId: string;
  userId: string;
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  notes?: string;
  timetacId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Absence {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly type: AbsenceType;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly notes?: string;
  readonly timetacId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: any) {
    Object.assign(this, props);
  }

  static create(props: AbsenceProps): Absence {
    if (!VALID_ABSENCE_TYPES.includes(props.type)) {
      throw new ValidationError('Ungültiger Abwesenheitstyp');
    }

    if (props.endDate < props.startDate) {
      throw new ValidationError('Enddatum muss nach Startdatum liegen');
    }

    return new Absence({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      userId: props.userId,
      type: props.type,
      startDate: props.startDate,
      endDate: props.endDate,
      notes: props.notes?.trim(),
      timetacId: props.timetacId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  /**
   * Anzahl Tage der Abwesenheit
   */
  get durationDays(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Prüft ob ein Datum innerhalb der Abwesenheit liegt
   */
  includesDate(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const start = new Date(this.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);

    return d >= start && d <= end;
  }

  /**
   * UI-Label für Typ
   */
  get typeLabel(): string {
    return ABSENCE_TYPE_LABELS[this.type];
  }

  /**
   * Ist aus TimeTac importiert
   */
  get isFromTimeTac(): boolean {
    return !!this.timetacId;
  }
}
```

### 🔴 RED: Test für Konflikt-Erkennung

```typescript
// src/domain/services/__tests__/AbsenceConflictChecker.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AbsenceConflictChecker } from '../AbsenceConflictChecker';

describe('AbsenceConflictChecker', () => {
  const mockAbsenceRepo = {
    findByUserAndDateRange: vi.fn(),
  };

  it('should detect conflict when allocation date is within absence', async () => {
    mockAbsenceRepo.findByUserAndDateRange.mockResolvedValue([
      { startDate: new Date('2026-02-05'), endDate: new Date('2026-02-07') }
    ]);

    const checker = new AbsenceConflictChecker(mockAbsenceRepo);
    const hasConflict = await checker.hasConflict('user-123', new Date('2026-02-06'));

    expect(hasConflict).toBe(true);
  });

  it('should not detect conflict when no absence', async () => {
    mockAbsenceRepo.findByUserAndDateRange.mockResolvedValue([]);

    const checker = new AbsenceConflictChecker(mockAbsenceRepo);
    const hasConflict = await checker.hasConflict('user-123', new Date('2026-02-06'));

    expect(hasConflict).toBe(false);
  });
});
```

### 🟢 GREEN: AbsenceConflictChecker implementieren

```typescript
// src/domain/services/AbsenceConflictChecker.ts
import { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import { Absence } from '@/domain/entities/Absence';
import { Allocation } from '@/domain/entities/Allocation';

export class AbsenceConflictChecker {
  constructor(private absenceRepository: IAbsenceRepository) {}

  async hasConflict(userId: string, date: Date): Promise<boolean> {
    const absence = await this.getConflictingAbsence(userId, date);
    return absence !== null;
  }

  async getConflictingAbsence(userId: string, date: Date): Promise<Absence | null> {
    const absences = await this.absenceRepository.findByUserAndDateRange(
      userId,
      date,
      date
    );

    return absences.find(a => a.includesDate(date)) ?? null;
  }

  async getConflictsForAllocations(
    allocations: Allocation[]
  ): Promise<Map<string, Absence>> {
    const conflicts = new Map<string, Absence>();

    // Gruppiere nach User und lade Absences effizient
    const userAllocations = this.groupByUser(allocations);

    for (const [userId, userAllocs] of userAllocations) {
      const dates = userAllocs.map(a => a.date);
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      const absences = await this.absenceRepository.findByUserAndDateRange(
        userId,
        minDate,
        maxDate
      );

      for (const allocation of userAllocs) {
        const conflict = absences.find(a => a.includesDate(allocation.date));
        if (conflict) {
          conflicts.set(allocation.id, conflict);
        }
      }
    }

    return conflicts;
  }

  private groupByUser(allocations: Allocation[]): Map<string, Allocation[]> {
    const map = new Map<string, Allocation[]>();
    for (const allocation of allocations) {
      if (!allocation.userId) continue;
      const existing = map.get(allocation.userId) ?? [];
      map.set(allocation.userId, [...existing, allocation]);
    }
    return map;
  }
}
```

---

## Erwartete Dateien

```
src/
├── domain/
│   ├── entities/
│   │   ├── Absence.ts
│   │   └── __tests__/
│   │       └── Absence.test.ts
│   └── services/
│       ├── AbsenceConflictChecker.ts
│       └── __tests__/
│           └── AbsenceConflictChecker.test.ts
├── application/
│   ├── ports/
│   │   └── repositories/
│   │       └── IAbsenceRepository.ts
│   └── use-cases/
│       └── absences/
│           ├── CreateAbsenceUseCase.ts
│           └── GetAbsencesForUserUseCase.ts
└── infrastructure/
    └── repositories/
        └── SupabaseAbsenceRepository.ts
```

---

## Hinweise

- Abwesenheiten können aus TimeTac importiert ODER manuell erfasst werden
- `timetacId` zeigt an, ob aus TimeTac (nicht manuell bearbeitbar)
- Abwesenheits-Konflikte BLOCKIEREN NICHT, sondern WARNEN nur
- Alerts werden bei Konflikt-Erkennung generiert (später in Dashboard)

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Absence Entity validiert korrekt
- [ ] Konflikt-Erkennung funktioniert
- [ ] CRUD für Abwesenheiten funktioniert
- [ ] Date-Range-Abfragen sind performant

---

*Vorheriger Prompt: 10 – Resource Entities*
*Nächster Prompt: 11a – TimeEntry Entity*
