# Prompt 12: CreateAllocation Use Case

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** L (Large)
**Geschätzte Zeit:** 4-5 Stunden

---

## Kontext

Alle Entities existieren. Jetzt implementieren wir den wichtigsten Use Case: CreateAllocation.

**Bereits vorhanden:**
- Allocation Entity mit XOR-Validierung
- AllocationCalculator für PlannedHours
- AbsenceConflictChecker
- User, Project, ProjectPhase Entities

---

## Ziel

Implementiere den vollständigen CreateAllocation Use Case mit allen Business Rules.

---

## Referenz-Dokumentation

- `Rules.md` – Allocation-Regeln
- `API_SPEC.md` – Server Action Muster
- `FEATURES.md` – F3.4 (Drag & Drop erstellen)

---

## Akzeptanzkriterien

```gherkin
Feature: CreateAllocation Use Case

Scenario: Erfolgreiche Allocation für User
  Given ein valider User und eine valide Phase
  When ich eine Allocation erstelle
  Then wird sie gespeichert
  And plannedHours werden berechnet
  And project_phases.planned_hours wird aktualisiert (via Trigger)

Scenario: Mehrfach-Allocation am gleichen Tag
  Given User Max hat bereits eine Allocation am 05.02.
  When ich eine zweite Allocation für Max am 05.02. erstelle
  Then werden beide Allocations aktualisiert:
    | Allocation | plannedHours vorher | plannedHours nachher |
    | Bestehende | 8h                  | 4h                   |
    | Neue       | -                   | 4h                   |

Scenario: Allocation mit Abwesenheits-Warnung
  Given User Max hat Urlaub am 05.02.
  When ich eine Allocation für Max am 05.02. erstelle
  Then wird die Allocation ERSTELLT (nicht blockiert!)
  And ein System-Alert wird generiert (absence_conflict)
  And die UI zeigt eine Warnung

Scenario: Allocation für Resource
  Given eine valide Resource (Fahrzeug)
  When ich eine Allocation für die Resource erstelle
  Then wird sie gespeichert
  And plannedHours ist NULL (Resources haben keine Stunden)

Scenario: Phase-Verlängerung
  Given Phase "Elementierung" endet am 15.02.
  When ich eine Allocation für den 20.02. erstelle
  Then wird die Allocation erstellt
  And Phase.endDate wird auf 20.02. aktualisiert
  And ein Sync zu Asana wird getriggert (debounced)

Scenario: Phase-Vorverlagerung
  Given Phase "Elementierung" startet am 10.02.
  When ich eine Allocation für den 05.02. erstelle
  Then wird die Allocation erstellt
  And Phase.startDate wird auf 05.02. aktualisiert
```

---

## Technische Anforderungen

### CreateAllocation Request/Response

```typescript
interface CreateAllocationRequest {
  userId?: string;        // XOR
  resourceId?: string;    // XOR
  projectPhaseId: string;
  date: Date;
  notes?: string;
}

interface CreateAllocationResponse {
  allocation: Allocation;
  warnings: AllocationWarning[];
  updatedPhase?: ProjectPhase;  // Bei Datumsänderung
}

type AllocationWarning =
  | { type: 'absence_conflict'; absence: Absence }
  | { type: 'multi_allocation'; count: number }
  | { type: 'phase_extended'; newEndDate: Date }
  | { type: 'phase_preponed'; newStartDate: Date };
```

### Server Action

```typescript
// src/presentation/actions/allocations.ts
'use server';

export async function createAllocationAction(
  formData: FormData
): Promise<ActionResult<CreateAllocationResponse>> {
  // 1. Input validieren
  // 2. User/Resource prüfen
  // 3. Phase prüfen
  // 4. Abwesenheit prüfen
  // 5. Allocation erstellen
  // 6. PlannedHours redistributen
  // 7. Phase-Datum anpassen wenn nötig
  // 8. Alerts generieren
  // 9. Response zurückgeben
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für einfache Allocation

```typescript
// src/application/use-cases/allocations/__tests__/CreateAllocationUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateAllocationUseCase } from '../CreateAllocationUseCase';

describe('CreateAllocationUseCase', () => {
  let useCase: CreateAllocationUseCase;
  let mockAllocationRepo: any;
  let mockUserRepo: any;
  let mockPhaseRepo: any;
  let mockAbsenceChecker: any;

  beforeEach(() => {
    mockAllocationRepo = {
      save: vi.fn().mockImplementation(a => Promise.resolve(a)),
      findByUserAndDate: vi.fn().mockResolvedValue([]),
      countByUserAndDate: vi.fn().mockResolvedValue(0),
    };
    mockUserRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-123',
        weeklyHours: 40,
        isActive: true,
      }),
    };
    mockPhaseRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'phase-123',
        projectId: 'project-123',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28'),
      }),
      updateDates: vi.fn(),
    };
    mockAbsenceChecker = {
      hasConflict: vi.fn().mockResolvedValue(false),
      getConflictingAbsence: vi.fn().mockResolvedValue(null),
    };

    useCase = new CreateAllocationUseCase(
      mockAllocationRepo,
      mockUserRepo,
      mockPhaseRepo,
      mockAbsenceChecker
    );
  });

  it('should create allocation with calculated planned hours', async () => {
    const result = await useCase.execute({
      userId: 'user-123',
      projectPhaseId: 'phase-123',
      date: new Date('2026-02-05'),
    });

    expect(result.allocation.plannedHours).toBe(8); // 40h/5 Tage
    expect(mockAllocationRepo.save).toHaveBeenCalled();
  });

  it('should redistribute hours for multiple allocations', async () => {
    // Bestehende Allocation simulieren
    mockAllocationRepo.countByUserAndDate.mockResolvedValue(1);
    mockAllocationRepo.findByUserAndDate.mockResolvedValue([
      { id: 'existing-123', plannedHours: 8 }
    ]);

    const result = await useCase.execute({
      userId: 'user-123',
      projectPhaseId: 'phase-123',
      date: new Date('2026-02-05'),
    });

    // Neue Allocation: 4h (8h / 2)
    expect(result.allocation.plannedHours).toBe(4);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ type: 'multi_allocation', count: 2 })
    );
  });

  it('should warn about absence conflict but still create', async () => {
    mockAbsenceChecker.hasConflict.mockResolvedValue(true);
    mockAbsenceChecker.getConflictingAbsence.mockResolvedValue({
      type: 'vacation',
      startDate: new Date('2026-02-05'),
      endDate: new Date('2026-02-07'),
    });

    const result = await useCase.execute({
      userId: 'user-123',
      projectPhaseId: 'phase-123',
      date: new Date('2026-02-05'),
    });

    expect(result.allocation).toBeDefined();
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ type: 'absence_conflict' })
    );
  });
});
```

### 🟢 GREEN: CreateAllocationUseCase implementieren

```typescript
// src/application/use-cases/allocations/CreateAllocationUseCase.ts
import { Allocation } from '@/domain/entities/Allocation';
import { AllocationCalculator } from '@/domain/services/AllocationCalculator';
import { AbsenceConflictChecker } from '@/domain/services/AbsenceConflictChecker';
import { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import { NotFoundError, ValidationError } from '@/domain/errors';

export interface CreateAllocationRequest {
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: Date;
  notes?: string;
  tenantId: string;
}

export interface AllocationWarning {
  type: 'absence_conflict' | 'multi_allocation' | 'phase_extended' | 'phase_preponed';
  [key: string]: any;
}

export interface CreateAllocationResponse {
  allocation: Allocation;
  warnings: AllocationWarning[];
}

export class CreateAllocationUseCase {
  constructor(
    private allocationRepository: IAllocationRepository,
    private userRepository: IUserRepository,
    private phaseRepository: IProjectPhaseRepository,
    private absenceChecker: AbsenceConflictChecker
  ) {}

  async execute(request: CreateAllocationRequest): Promise<CreateAllocationResponse> {
    const warnings: AllocationWarning[] = [];
    let plannedHours: number | undefined;

    // 1. Phase validieren
    const phase = await this.phaseRepository.findById(request.projectPhaseId);
    if (!phase) {
      throw new NotFoundError('ProjectPhase', request.projectPhaseId);
    }

    // 2. User oder Resource validieren
    if (request.userId) {
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        throw new NotFoundError('User', request.userId);
      }
      if (!user.isActive) {
        throw new ValidationError('User ist deaktiviert');
      }

      // 3. Abwesenheits-Check
      const conflictingAbsence = await this.absenceChecker.getConflictingAbsence(
        request.userId,
        request.date
      );
      if (conflictingAbsence) {
        warnings.push({
          type: 'absence_conflict',
          absence: conflictingAbsence,
        });
      }

      // 4. PlannedHours berechnen
      const existingCount = await this.allocationRepository.countByUserAndDate(
        request.userId,
        request.date
      );
      plannedHours = AllocationCalculator.calculatePlannedHours(
        user.weeklyHours,
        existingCount + 1
      );

      // 5. Mehrfach-Allocation Warnung
      if (existingCount > 0) {
        warnings.push({
          type: 'multi_allocation',
          count: existingCount + 1,
        });

        // Bestehende Allocations redistributen
        await this.redistributeExistingAllocations(
          request.userId,
          request.date,
          user.weeklyHours,
          existingCount + 1
        );
      }
    }

    // 6. Phase-Datum prüfen und ggf. anpassen
    const dateWarning = await this.checkAndUpdatePhaseDates(phase, request.date);
    if (dateWarning) {
      warnings.push(dateWarning);
    }

    // 7. Allocation erstellen
    const allocation = Allocation.create({
      tenantId: request.tenantId,
      userId: request.userId,
      resourceId: request.resourceId,
      projectPhaseId: request.projectPhaseId,
      date: request.date,
      plannedHours,
      notes: request.notes,
    });

    // 8. Speichern
    const saved = await this.allocationRepository.save(allocation);

    return {
      allocation: saved,
      warnings,
    };
  }

  private async redistributeExistingAllocations(
    userId: string,
    date: Date,
    weeklyHours: number,
    totalCount: number
  ): Promise<void> {
    const existing = await this.allocationRepository.findByUserAndDate(userId, date);
    const newHours = AllocationCalculator.calculatePlannedHours(weeklyHours, totalCount);

    for (const allocation of existing) {
      const updated = allocation.withPlannedHours(newHours);
      await this.allocationRepository.save(updated);
    }
  }

  private async checkAndUpdatePhaseDates(
    phase: any,
    allocationDate: Date
  ): Promise<AllocationWarning | null> {
    // Phase verlängern wenn Allocation nach endDate
    if (phase.endDate && allocationDate > phase.endDate) {
      await this.phaseRepository.updateDates(phase.id, {
        endDate: allocationDate,
      });
      return {
        type: 'phase_extended',
        newEndDate: allocationDate,
      };
    }

    // Phase vorverlegen wenn Allocation vor startDate
    if (phase.startDate && allocationDate < phase.startDate) {
      await this.phaseRepository.updateDates(phase.id, {
        startDate: allocationDate,
      });
      return {
        type: 'phase_preponed',
        newStartDate: allocationDate,
      };
    }

    return null;
  }
}
```

### 🟢 GREEN: Server Action implementieren

```typescript
// src/presentation/actions/allocations.ts
'use server';

import { z } from 'zod';
import { Result, ActionResult } from '@/application/common/ActionResult';
import { Container, TOKENS } from '@/infrastructure/container';
import { CreateAllocationUseCase, CreateAllocationResponse } from '@/application/use-cases/allocations/CreateAllocationUseCase';
import { getCurrentUser } from '@/infrastructure/supabase/server';
import { revalidatePath } from 'next/cache';

const createAllocationSchema = z.object({
  userId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  projectPhaseId: z.string().uuid(),
  date: z.coerce.date(),
  notes: z.string().optional(),
}).refine(
  data => !!(data.userId || data.resourceId),
  { message: 'User oder Resource erforderlich' }
).refine(
  data => !(data.userId && data.resourceId),
  { message: 'Nur User ODER Resource, nicht beide' }
);

export async function createAllocationAction(
  formData: FormData
): Promise<ActionResult<CreateAllocationResponse>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Result.fail('AUTH_UNAUTHORIZED', 'Nicht angemeldet');
    }

    const validated = createAllocationSchema.safeParse({
      userId: formData.get('userId'),
      resourceId: formData.get('resourceId'),
      projectPhaseId: formData.get('projectPhaseId'),
      date: formData.get('date'),
      notes: formData.get('notes'),
    });

    if (!validated.success) {
      return Result.fail('VALIDATION_ERROR', validated.error.errors[0].message);
    }

    const container = Container.getInstance();
    const useCase = container.resolve<CreateAllocationUseCase>(TOKENS.CreateAllocationUseCase);

    const result = await useCase.execute({
      ...validated.data,
      tenantId: currentUser.tenant.id,
    });

    revalidatePath('/planung');

    return Result.ok(result);
  } catch (error) {
    if (error instanceof Error) {
      return Result.fail('ALLOCATION_CREATE_FAILED', error.message);
    }
    return Result.fail('UNKNOWN_ERROR', 'Ein unbekannter Fehler ist aufgetreten');
  }
}
```

---

## Erwartete Dateien

```
src/
├── application/
│   └── use-cases/
│       └── allocations/
│           ├── CreateAllocationUseCase.ts
│           └── __tests__/
│               └── CreateAllocationUseCase.test.ts
├── presentation/
│   └── actions/
│       └── allocations.ts
```

---

## Hinweise

- PlannedHours Redistribution muss bei JEDER neuen User-Allocation passieren
- Abwesenheits-Konflikt WARNT nur, BLOCKIERT NICHT
- Phase-Datums-Anpassung triggert Asana-Sync (implementiert in Prompt 21)
- Optimistic Updates in der UI (implementiert in Prompt 19)
- Alert-Generierung für Dashboard (implementiert in Prompt 25)

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Einfache Allocation funktioniert
- [ ] PlannedHours werden korrekt berechnet
- [ ] Redistribution bei Mehrfach-Allocation
- [ ] Abwesenheits-Warnung wird generiert
- [ ] Phase-Datum wird angepasst
- [ ] Server Action funktioniert

---

*Vorheriger Prompt: 11a – TimeEntry Entity*
*Nächster Prompt: 13 – MoveAllocation & DeleteAllocation Use Cases*
