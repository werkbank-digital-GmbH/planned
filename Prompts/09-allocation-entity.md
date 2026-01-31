# Prompt 09: Allocation Entity & PlannedHours-Berechnung

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** XL (Extra Large)
**Geschätzte Zeit:** 6-8 Stunden

---

## Kontext

Project und Phase existieren. Jetzt implementieren wir die zentrale Entity: **Allocation**.

Eine Allocation ist die Zuweisung einer Person ODER Ressource zu einer Phase an einem bestimmten Tag.

**Bereits vorhanden:**
- Project Entity
- ProjectPhase Entity mit Bereich-Logik
- User Entity

---

## Ziel

Implementiere Allocation mit automatischer PlannedHours-Berechnung bei Mehrfach-Zuweisungen.

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – allocations Tabelle
- `Rules.md` – Allocation-Regeln (5 Regeln)
- `API_SPEC.md` – AllocationCalculator Service

---

## Akzeptanzkriterien

```gherkin
Feature: Allocation Entity

Scenario: Einzelne Allocation für User
  Given ein User mit 40h/Woche
  When er eine Allocation an einem Tag hat
  Then sind plannedHours = 8 (40h / 5 Tage)

Scenario: Mehrfach-Allocation am gleichen Tag
  Given ein User mit 40h/Woche
  When er 2 Allocations am gleichen Tag hat
  Then werden plannedHours auf beide verteilt:
    | Allocation | plannedHours |
    | 1          | 4h           |
    | 2          | 4h           |

Scenario: Drei Allocations am gleichen Tag
  Given ein User mit 40h/Woche
  When er 3 Allocations am gleichen Tag hat
  Then werden plannedHours gleichmäßig verteilt:
    | Allocation | plannedHours |
    | 1          | 2.67h        |
    | 2          | 2.67h        |
    | 3          | 2.67h        |

Scenario: User XOR Resource
  Given eine neue Allocation
  Then hat sie ENTWEDER userId ODER resourceId
  And NIEMALS beide gleichzeitig
  And NIEMALS keines von beiden

Scenario: Resource ohne Stunden
  Given eine Allocation für eine Resource (z.B. Fahrzeug)
  Then ist plannedHours = undefined/null
  Because Ressourcen haben keine Arbeitsstunden

Scenario: Abwesenheits-Warnung
  Given ein User hat Urlaub am Montag
  When eine Allocation für Montag erstellt wird
  Then wird die Allocation TROTZDEM erstellt
  And hasAbsenceWarning = true
  And die UI zeigt eine Warnung an
```

---

## Technische Anforderungen

### Allocation Entity aus DATA_MODEL.md

```typescript
interface Allocation {
  id: string;
  tenantId: string;
  userId?: string;        // XOR: Entweder User...
  resourceId?: string;    // XOR: ...oder Resource
  projectPhaseId: string;
  date: Date;             // Einzelner Tag, KEIN Bereich!
  plannedHours?: number;  // null für Resources
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### AllocationCalculator Service aus Rules.md

```typescript
// REGEL 1: Allocation ist TAGESBASIERT
// Eine Allocation = Eine Person/Ressource + Eine Phase + EIN Tag

// REGEL 2: PlannedHours Berechnung
// Bei EINER Allocation am Tag:
plannedHours = user.weeklyHours / 5;  // z.B. 40/5 = 8h

// Bei MEHREREN Allocations am Tag:
plannedHours = (user.weeklyHours / 5) / anzahlAllocations;
// Beispiel: 2 Allocations → 8h / 2 = 4h pro Allocation

// REGEL 3: User XOR Resource
// NIEMALS beide, NIEMALS keines

// REGEL 4: Abwesenheit = Warnung, KEIN Block
// Allocation auf Abwesenheitstag ist ERLAUBT, aber Warning

// REGEL 5: Phasen-Verlängerung (später implementiert)
// Wenn Allocation.date > Phase.endDate → Phase verlängern
```

---

## Implementierungsschritte

### 🔴 RED: Test für XOR Validierung (User/Resource)

```typescript
// src/domain/entities/__tests__/Allocation.test.ts
import { describe, it, expect } from 'vitest';
import { Allocation } from '../Allocation';

describe('Allocation Entity', () => {
  const baseProps = {
    tenantId: 'tenant-123',
    projectPhaseId: 'phase-123',
    date: new Date('2026-02-05'),
  };

  describe('User XOR Resource', () => {
    it('should accept allocation with userId only', () => {
      const allocation = Allocation.create({
        ...baseProps,
        userId: 'user-123',
      });

      expect(allocation.userId).toBe('user-123');
      expect(allocation.resourceId).toBeUndefined();
    });

    it('should accept allocation with resourceId only', () => {
      const allocation = Allocation.create({
        ...baseProps,
        resourceId: 'resource-123',
      });

      expect(allocation.resourceId).toBe('resource-123');
      expect(allocation.userId).toBeUndefined();
    });

    it('should reject allocation with both userId and resourceId', () => {
      expect(() => Allocation.create({
        ...baseProps,
        userId: 'user-123',
        resourceId: 'resource-123',
      })).toThrow('Allocation kann nicht User UND Resource haben');
    });

    it('should reject allocation without userId or resourceId', () => {
      expect(() => Allocation.create({
        ...baseProps,
      })).toThrow('Allocation braucht User ODER Resource');
    });
  });
});
```

### 🔴 RED: Test für PlannedHours-Berechnung (Single)

```typescript
// src/domain/services/__tests__/AllocationCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { AllocationCalculator } from '../AllocationCalculator';

describe('AllocationCalculator', () => {
  describe('calculatePlannedHours', () => {
    it('should calculate 8h for single allocation with 40h/week', () => {
      const hours = AllocationCalculator.calculatePlannedHours(40, 1);
      expect(hours).toBe(8);
    });

    it('should calculate 4h for two allocations with 40h/week', () => {
      const hours = AllocationCalculator.calculatePlannedHours(40, 2);
      expect(hours).toBe(4);
    });

    it('should calculate 2.67h for three allocations with 40h/week', () => {
      const hours = AllocationCalculator.calculatePlannedHours(40, 3);
      expect(hours).toBeCloseTo(2.67, 2);
    });

    it('should handle 32h/week user', () => {
      const hours = AllocationCalculator.calculatePlannedHours(32, 1);
      expect(hours).toBe(6.4);
    });
  });
});
```

### 🟢 GREEN: AllocationCalculator implementieren

```typescript
// src/domain/services/AllocationCalculator.ts
import { WORK_DAYS_PER_WEEK } from '@/lib/constants';

export class AllocationCalculator {
  /**
   * Berechnet die geplanten Stunden pro Allocation
   *
   * @param weeklyHours - Wochenstunden des Users
   * @param allocationsOnSameDay - Anzahl Allocations am gleichen Tag
   * @returns Geplante Stunden für diese Allocation
   */
  static calculatePlannedHours(
    weeklyHours: number,
    allocationsOnSameDay: number
  ): number {
    if (allocationsOnSameDay < 1) {
      throw new Error('Mindestens eine Allocation erforderlich');
    }

    const dailyHours = weeklyHours / WORK_DAYS_PER_WEEK;
    return Number((dailyHours / allocationsOnSameDay).toFixed(2));
  }

  /**
   * Verteilt Stunden gleichmäßig auf mehrere Allocations
   *
   * @param weeklyHours - Wochenstunden des Users
   * @param allocationIds - IDs aller Allocations am gleichen Tag
   * @returns Map von Allocation-ID zu plannedHours
   */
  static redistributeHours(
    weeklyHours: number,
    allocationIds: string[]
  ): Map<string, number> {
    const hoursPerAllocation = this.calculatePlannedHours(
      weeklyHours,
      allocationIds.length
    );

    return new Map(
      allocationIds.map(id => [id, hoursPerAllocation])
    );
  }
}
```

### 🟢 GREEN: Allocation Entity implementieren

```typescript
// src/domain/entities/Allocation.ts
import { ValidationError } from '@/domain/errors';

export interface AllocationProps {
  id?: string;
  tenantId: string;
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: Date;
  plannedHours?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Allocation {
  readonly id: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly resourceId?: string;
  readonly projectPhaseId: string;
  readonly date: Date;
  readonly plannedHours?: number;
  readonly notes?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: any) {
    Object.assign(this, props);
  }

  static create(props: AllocationProps): Allocation {
    // REGEL 3: User XOR Resource
    if (props.userId && props.resourceId) {
      throw new ValidationError('Allocation kann nicht User UND Resource haben');
    }
    if (!props.userId && !props.resourceId) {
      throw new ValidationError('Allocation braucht User ODER Resource');
    }

    // Date validieren
    if (!props.date || isNaN(props.date.getTime())) {
      throw new ValidationError('Gültiges Datum erforderlich');
    }

    // PlannedHours nur für User
    const plannedHours = props.resourceId ? undefined : props.plannedHours;

    return new Allocation({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      userId: props.userId,
      resourceId: props.resourceId,
      projectPhaseId: props.projectPhaseId,
      date: props.date,
      plannedHours,
      notes: props.notes?.trim(),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  /**
   * Ist dies eine User-Allocation?
   */
  get isUserAllocation(): boolean {
    return !!this.userId;
  }

  /**
   * Ist dies eine Resource-Allocation?
   */
  get isResourceAllocation(): boolean {
    return !!this.resourceId;
  }

  /**
   * Erstellt eine Kopie mit neuen plannedHours
   */
  withPlannedHours(hours: number): Allocation {
    if (this.isResourceAllocation) {
      throw new ValidationError('Resources haben keine plannedHours');
    }
    return Allocation.create({
      ...this,
      plannedHours: hours,
      updatedAt: new Date(),
    });
  }

  /**
   * Erstellt eine Kopie mit neuen Notes
   */
  withNotes(notes: string): Allocation {
    return Allocation.create({
      ...this,
      notes,
      updatedAt: new Date(),
    });
  }
}
```

### 🟢 GREEN: Repository implementieren

```typescript
// src/application/ports/repositories/IAllocationRepository.ts
import { Allocation } from '@/domain/entities/Allocation';

export interface IAllocationRepository {
  findById(id: string): Promise<Allocation | null>;
  findByUserAndDate(userId: string, date: Date): Promise<Allocation[]>;
  findByResourceAndDate(resourceId: string, date: Date): Promise<Allocation[]>;
  findByPhaseAndDateRange(
    phaseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Allocation[]>;
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Allocation[]>;
  save(allocation: Allocation): Promise<Allocation>;
  saveMany(allocations: Allocation[]): Promise<Allocation[]>;
  delete(id: string): Promise<void>;
  countByUserAndDate(userId: string, date: Date): Promise<number>;
}
```

---

## Erwartete Dateien

```
src/
├── domain/
│   ├── entities/
│   │   ├── Allocation.ts
│   │   └── __tests__/
│   │       └── Allocation.test.ts
│   └── services/
│       ├── AllocationCalculator.ts
│       └── __tests__/
│           └── AllocationCalculator.test.ts
├── application/
│   └── ports/
│       └── repositories/
│           └── IAllocationRepository.ts
└── infrastructure/
    ├── repositories/
    │   └── SupabaseAllocationRepository.ts
    └── mappers/
        └── AllocationMapper.ts
```

---

## Hinweise

- DB-Trigger in `SUPABASE_SETUP.md` handhabt Redistribution automatisch
- Domain Service (`AllocationCalculator`) nur für Berechnung, keine DB-Calls
- `hasAbsenceWarning` wird beim Laden ermittelt, nicht in DB gespeichert
- Resources (Fahrzeuge, Maschinen) haben NIEMALS plannedHours
- Allocations sind immer tagesbasiert (kein Date Range!)

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] XOR-Validierung (User/Resource) funktioniert
- [ ] PlannedHours-Berechnung ist korrekt
- [ ] Redistribution bei Mehrfach-Allocation funktioniert
- [ ] Resources haben keine plannedHours
- [ ] Alle Tests sind grün

---

*Vorheriger Prompt: 08 – ProjectPhase Entity*
*Nächster Prompt: 10 – Resource & ResourceType Entities*
