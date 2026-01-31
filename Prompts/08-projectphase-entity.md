# Prompt 08: ProjectPhase Entity & Bereich-Logik

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

Project Entity existiert. Jetzt implementieren wir ProjectPhase mit der Bereich-Logik (Produktion/Montage).

**Bereits vorhanden:**
- Project Entity und Repository
- Multi-Tenancy

---

## Ziel

Implementiere ProjectPhase mit SOLL/PLAN/IST-Stunden und automatischer Aggregation.

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – project_phases Tabelle
- `Rules.md` – Bereichs-Regeln
- `FEATURES.md` – F3.14 (SOLL/PLAN/IST Anzeige)

---

## Akzeptanzkriterien

```gherkin
Feature: ProjectPhase Entity

Scenario: Phase mit Bereich
  Given eine Phase existiert
  Then hat sie entweder Bereich "produktion" oder "montage"
  And der Bereich kommt ursprünglich aus Asana

Scenario: SOLL/PLAN/IST Stunden
  Given eine Phase mit Allocations
  Then zeigt sie drei Kennzahlen:
    | Kennzahl | Quelle              | Aktualisierung          |
    | SOLL     | budget_hours        | Asana Custom Field      |
    | PLAN     | planned_hours       | Summe Allocations (Trigger) |
    | IST      | actual_hours        | Summe TimeEntries (Trigger) |

Scenario: Auslastungs-Berechnung
  Given SOLL = 40h, PLAN = 35h, IST = 28h
  Then ist utilization = 70% (28/40)
  And Delta = -12h (IST - SOLL)

Scenario: Soft Delete
  Given eine Phase wird in Asana gelöscht
  When der Webhook das Signal erhält
  Then wird status auf 'deleted' gesetzt
  And deleted_at wird gesetzt
  And Allocations bleiben erhalten
  And Phase wird nach 90 Tagen hard-deleted
```

---

## Technische Anforderungen

### ProjectPhase Entity aus DATA_MODEL.md

```typescript
interface ProjectPhase {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  bereich: PhaseBereich;
  startDate?: Date;
  endDate?: Date;
  sortOrder: number;
  budgetHours?: number;   // SOLL aus Asana
  plannedHours: number;   // PLAN = Summe Allocations
  actualHours: number;    // IST = Summe TimeEntries
  status: PhaseStatus;
  asanaGid?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type PhaseBereich = 'produktion' | 'montage';
type PhaseStatus = 'active' | 'deleted';
```

### Datenquellen für Stunden

| Kennzahl | DB-Feld | Quelle | Aktualisierung |
|----------|---------|--------|----------------|
| **SOLL** | `budget_hours` | Asana Custom Field | Bei Asana-Sync |
| **PLAN** | `planned_hours` | Summe Allocations | Via DB-Trigger |
| **IST** | `actual_hours` | Summe TimeEntries | Via DB-Trigger |

---

## Implementierungsschritte

### 🔴 RED: Test für PhaseBereich Validierung

```typescript
// src/domain/entities/__tests__/ProjectPhase.test.ts
import { describe, it, expect } from 'vitest';
import { ProjectPhase } from '../ProjectPhase';

describe('ProjectPhase Entity', () => {
  it('should create valid phase with bereich produktion', () => {
    const phase = ProjectPhase.create({
      projectId: 'project-123',
      tenantId: 'tenant-123',
      name: 'Elementierung',
      bereich: 'produktion',
      sortOrder: 1,
    });

    expect(phase.bereich).toBe('produktion');
  });

  it('should create valid phase with bereich montage', () => {
    const phase = ProjectPhase.create({
      projectId: 'project-123',
      tenantId: 'tenant-123',
      name: 'Dachstuhl',
      bereich: 'montage',
      sortOrder: 2,
    });

    expect(phase.bereich).toBe('montage');
  });

  it('should reject invalid bereich', () => {
    expect(() => ProjectPhase.create({
      projectId: 'project-123',
      tenantId: 'tenant-123',
      name: 'Test',
      bereich: 'invalid' as any,
      sortOrder: 1,
    })).toThrow('Ungültiger Bereich');
  });
});
```

### 🔴 RED: Test für Stunden-Berechnung

```typescript
describe('ProjectPhase Stunden', () => {
  it('should calculate utilization percentage', () => {
    const phase = ProjectPhase.create({
      projectId: 'project-123',
      tenantId: 'tenant-123',
      name: 'Elementierung',
      bereich: 'produktion',
      sortOrder: 1,
      budgetHours: 40,
      plannedHours: 35,
      actualHours: 28,
    });

    expect(phase.utilizationPercent).toBe(70); // 28/40 * 100
    expect(phase.delta).toBe(-12); // 28 - 40
  });

  it('should return null utilization when no budget', () => {
    const phase = ProjectPhase.create({
      projectId: 'project-123',
      tenantId: 'tenant-123',
      name: 'Test',
      bereich: 'produktion',
      sortOrder: 1,
      budgetHours: undefined,
      actualHours: 10,
    });

    expect(phase.utilizationPercent).toBeNull();
  });

  it('should detect over-budget', () => {
    const phase = ProjectPhase.create({
      projectId: 'project-123',
      tenantId: 'tenant-123',
      name: 'Test',
      bereich: 'produktion',
      sortOrder: 1,
      budgetHours: 40,
      actualHours: 45,
    });

    expect(phase.isOverBudget).toBe(true);
    expect(phase.delta).toBe(5);
  });
});
```

### 🟢 GREEN: ProjectPhase Entity implementieren

```typescript
// src/domain/entities/ProjectPhase.ts
import { ValidationError } from '@/domain/errors';

export type PhaseBereich = 'produktion' | 'montage';
export type PhaseStatus = 'active' | 'deleted';

const VALID_BEREICHE: PhaseBereich[] = ['produktion', 'montage'];

export interface ProjectPhaseProps {
  id?: string;
  projectId: string;
  tenantId: string;
  name: string;
  bereich: PhaseBereich;
  startDate?: Date;
  endDate?: Date;
  sortOrder: number;
  budgetHours?: number;
  plannedHours?: number;
  actualHours?: number;
  status?: PhaseStatus;
  asanaGid?: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProjectPhase {
  readonly id: string;
  readonly projectId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly bereich: PhaseBereich;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly sortOrder: number;
  readonly budgetHours?: number;
  readonly plannedHours: number;
  readonly actualHours: number;
  readonly status: PhaseStatus;
  readonly asanaGid?: string;
  readonly deletedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: any) {
    Object.assign(this, props);
  }

  static create(props: ProjectPhaseProps): ProjectPhase {
    if (!props.name?.trim()) {
      throw new ValidationError('Phasenname ist erforderlich');
    }
    if (!VALID_BEREICHE.includes(props.bereich)) {
      throw new ValidationError('Ungültiger Bereich. Erlaubt: produktion, montage');
    }

    return new ProjectPhase({
      id: props.id ?? crypto.randomUUID(),
      projectId: props.projectId,
      tenantId: props.tenantId,
      name: props.name.trim(),
      bereich: props.bereich,
      startDate: props.startDate,
      endDate: props.endDate,
      sortOrder: props.sortOrder,
      budgetHours: props.budgetHours,
      plannedHours: props.plannedHours ?? 0,
      actualHours: props.actualHours ?? 0,
      status: props.status ?? 'active',
      asanaGid: props.asanaGid,
      deletedAt: props.deletedAt,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  /**
   * Auslastung in Prozent (IST / SOLL * 100)
   * Gibt null zurück wenn kein Budget definiert
   */
  get utilizationPercent(): number | null {
    if (!this.budgetHours || this.budgetHours === 0) return null;
    return Math.round((this.actualHours / this.budgetHours) * 100);
  }

  /**
   * Delta = IST - SOLL
   * Positiv = Überverbrauch, Negativ = Unterverbrauch
   */
  get delta(): number | null {
    if (this.budgetHours === undefined) return null;
    return this.actualHours - this.budgetHours;
  }

  /**
   * Über Budget wenn IST > SOLL
   */
  get isOverBudget(): boolean {
    if (this.budgetHours === undefined) return false;
    return this.actualHours > this.budgetHours;
  }

  /**
   * Überplanung wenn PLAN > SOLL
   */
  get isOverPlanned(): boolean {
    if (this.budgetHours === undefined) return false;
    return this.plannedHours > this.budgetHours;
  }

  /**
   * UI-Label für Bereich
   */
  get bereichLabel(): string {
    return this.bereich === 'produktion' ? 'PRODUKTION' : 'MONTAGE';
  }

  /**
   * Ist soft-deleted
   */
  get isDeleted(): boolean {
    return this.status === 'deleted' || !!this.deletedAt;
  }
}
```

### 🟢 GREEN: Repository implementieren

```typescript
// src/infrastructure/repositories/SupabaseProjectPhaseRepository.ts
// Implementation analog zu ProjectRepository
```

---

## Erwartete Dateien

```
src/
├── domain/
│   ├── entities/
│   │   ├── ProjectPhase.ts
│   │   └── __tests__/
│   │       └── ProjectPhase.test.ts
│   └── enums/
│       └── PhaseBereich.ts
├── application/
│   └── ports/
│       └── repositories/
│           └── IProjectPhaseRepository.ts
└── infrastructure/
    ├── repositories/
    │   └── SupabaseProjectPhaseRepository.ts
    └── mappers/
        └── ProjectPhaseMapper.ts
```

---

## Hinweise

- `planned_hours` wird via DB-Trigger bei Allocation-Änderungen aktualisiert
- `actual_hours` wird via DB-Trigger bei TimeEntry-Import aktualisiert
- Bei Soft Delete: 90 Tage Aufbewahrung vor Hard Delete (Cron Job)
- UI zeigt "PRODUKTION" (grün) / "MONTAGE" (orange/gelb) als Badge
- `budgetHours` kann NULL sein wenn nicht in Asana definiert

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Phase Entity validiert Bereich korrekt
- [ ] Stunden-Berechnungen sind korrekt
- [ ] Repository funktioniert
- [ ] Soft Delete funktioniert

---

*Vorheriger Prompt: 07 – Project Entity & Repository*
*Nächster Prompt: 09 – Allocation Entity & PlannedHours-Berechnung*
