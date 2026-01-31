# Prompt 13: MoveAllocation & DeleteAllocation Use Cases

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

CreateAllocation funktioniert. Jetzt implementieren wir Move und Delete.

**Bereits vorhanden:**
- CreateAllocationUseCase mit PlannedHours-Redistribution
- AllocationCalculator
- AbsenceConflictChecker

---

## Ziel

Implementiere Use Cases für das Verschieben und Löschen von Allocations.

---

## Referenz-Dokumentation

- `FEATURES.md` – F3.6 (Move), F3.7 (Delete)
- `Rules.md` – Allocation-Regeln

---

## Akzeptanzkriterien

```gherkin
Feature: MoveAllocation Use Case

Scenario: Allocation innerhalb der Phase verschieben
  Given eine Allocation für Montag existiert
  When ich sie auf Mittwoch verschiebe
  Then wird das Datum geändert
  And PlannedHours werden für beide Tage redistributed

Scenario: Allocation zu anderer Phase verschieben
  Given eine Allocation in Phase "Elementierung"
  When ich sie zu Phase "Abbund" verschiebe
  Then wird projectPhaseId geändert
  And planned_hours beider Phasen werden aktualisiert

Scenario: Abwesenheits-Check beim Verschieben
  Given User Max hat Urlaub am Mittwoch
  When ich seine Allocation auf Mittwoch verschiebe
  Then wird die Allocation verschoben
  And eine Warnung wird generiert

Feature: DeleteAllocation Use Case

Scenario: Allocation löschen
  Given eine Allocation existiert
  When ich sie lösche
  Then wird sie aus der DB entfernt
  And planned_hours der anderen Allocations am Tag werden redistributed

Scenario: Letzte Allocation am Tag löschen
  Given ein User hat nur eine Allocation am Tag
  When ich sie lösche
  Then wird sie entfernt
  And es gibt keine Redistribution (keine anderen Allocations)

Scenario: Löschen mit Bestätigung (bei Notes)
  Given eine Allocation mit Notizen existiert
  When ich sie lösche
  Then wird eine Bestätigung angefordert
  After Bestätigung: Allocation wird gelöscht
```

---

## Technische Anforderungen

### MoveAllocation Request/Response

```typescript
interface MoveAllocationRequest {
  allocationId: string;
  newDate?: Date;
  newProjectPhaseId?: string;
}

interface MoveAllocationResponse {
  allocation: Allocation;
  warnings: AllocationWarning[];
  redistributedAllocations: Allocation[];
}
```

### DeleteAllocation Request/Response

```typescript
interface DeleteAllocationRequest {
  allocationId: string;
  confirmed?: boolean;  // Für Allocations mit Notes
}

interface DeleteAllocationResponse {
  deletedId: string;
  redistributedAllocations: Allocation[];
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für MoveAllocation

```typescript
// src/application/use-cases/allocations/__tests__/MoveAllocationUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoveAllocationUseCase } from '../MoveAllocationUseCase';

describe('MoveAllocationUseCase', () => {
  it('should move allocation to new date', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'alloc-123',
        userId: 'user-123',
        date: new Date('2026-02-05'),
        plannedHours: 8,
      }),
      save: vi.fn().mockImplementation(a => Promise.resolve(a)),
      findByUserAndDate: vi.fn().mockResolvedValue([]),
      countByUserAndDate: vi.fn().mockResolvedValue(0),
    };

    const useCase = new MoveAllocationUseCase(mockRepo, mockUserRepo, mockAbsenceChecker);
    const result = await useCase.execute({
      allocationId: 'alloc-123',
      newDate: new Date('2026-02-07'),
    });

    expect(result.allocation.date).toEqual(new Date('2026-02-07'));
  });

  it('should redistribute hours at old and new date', async () => {
    // Test für Redistribution an beiden Tagen
  });
});
```

### 🟢 GREEN: MoveAllocationUseCase implementieren

```typescript
// src/application/use-cases/allocations/MoveAllocationUseCase.ts
import { Allocation } from '@/domain/entities/Allocation';
import { AllocationCalculator } from '@/domain/services/AllocationCalculator';
import { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import { NotFoundError } from '@/domain/errors';

export class MoveAllocationUseCase {
  constructor(
    private allocationRepository: IAllocationRepository,
    private userRepository: IUserRepository,
    private absenceChecker: AbsenceConflictChecker
  ) {}

  async execute(request: MoveAllocationRequest): Promise<MoveAllocationResponse> {
    const warnings: AllocationWarning[] = [];
    const redistributed: Allocation[] = [];

    // 1. Bestehende Allocation laden
    const allocation = await this.allocationRepository.findById(request.allocationId);
    if (!allocation) {
      throw new NotFoundError('Allocation', request.allocationId);
    }

    const oldDate = allocation.date;
    const newDate = request.newDate ?? oldDate;
    const newPhaseId = request.newProjectPhaseId ?? allocation.projectPhaseId;

    // 2. Abwesenheits-Check für neues Datum
    if (allocation.userId && request.newDate) {
      const conflict = await this.absenceChecker.getConflictingAbsence(
        allocation.userId,
        newDate
      );
      if (conflict) {
        warnings.push({ type: 'absence_conflict', absence: conflict });
      }
    }

    // 3. Allocation aktualisieren
    const updated = Allocation.create({
      ...allocation,
      date: newDate,
      projectPhaseId: newPhaseId,
      updatedAt: new Date(),
    });

    await this.allocationRepository.save(updated);

    // 4. Redistribute am alten Tag (falls User-Allocation)
    if (allocation.userId && !this.isSameDay(oldDate, newDate)) {
      const oldDayAllocations = await this.redistributeForDay(
        allocation.userId,
        oldDate
      );
      redistributed.push(...oldDayAllocations);
    }

    // 5. Redistribute am neuen Tag
    if (allocation.userId && !this.isSameDay(oldDate, newDate)) {
      const newDayAllocations = await this.redistributeForDay(
        allocation.userId,
        newDate
      );
      redistributed.push(...newDayAllocations);
    }

    return {
      allocation: updated,
      warnings,
      redistributedAllocations: redistributed,
    };
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
  }

  private async redistributeForDay(userId: string, date: Date): Promise<Allocation[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) return [];

    const allocations = await this.allocationRepository.findByUserAndDate(userId, date);
    if (allocations.length === 0) return [];

    const hoursPerAllocation = AllocationCalculator.calculatePlannedHours(
      user.weeklyHours,
      allocations.length
    );

    const updated: Allocation[] = [];
    for (const alloc of allocations) {
      const updatedAlloc = alloc.withPlannedHours(hoursPerAllocation);
      await this.allocationRepository.save(updatedAlloc);
      updated.push(updatedAlloc);
    }

    return updated;
  }
}
```

### 🔴 RED: Test für DeleteAllocation

```typescript
// src/application/use-cases/allocations/__tests__/DeleteAllocationUseCase.test.ts
describe('DeleteAllocationUseCase', () => {
  it('should delete allocation', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'alloc-123',
        userId: 'user-123',
        notes: null,
      }),
      delete: vi.fn(),
      findByUserAndDate: vi.fn().mockResolvedValue([]),
    };

    const useCase = new DeleteAllocationUseCase(mockRepo, mockUserRepo);
    const result = await useCase.execute({ allocationId: 'alloc-123' });

    expect(mockRepo.delete).toHaveBeenCalledWith('alloc-123');
  });

  it('should require confirmation when allocation has notes', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'alloc-123',
        notes: 'Wichtige Notiz',
      }),
    };

    const useCase = new DeleteAllocationUseCase(mockRepo, mockUserRepo);

    await expect(useCase.execute({
      allocationId: 'alloc-123',
      confirmed: false,
    })).rejects.toThrow('Bestätigung erforderlich');
  });
});
```

### 🟢 GREEN: DeleteAllocationUseCase implementieren

```typescript
// src/application/use-cases/allocations/DeleteAllocationUseCase.ts
export class DeleteAllocationUseCase {
  constructor(
    private allocationRepository: IAllocationRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(request: DeleteAllocationRequest): Promise<DeleteAllocationResponse> {
    // 1. Allocation laden
    const allocation = await this.allocationRepository.findById(request.allocationId);
    if (!allocation) {
      throw new NotFoundError('Allocation', request.allocationId);
    }

    // 2. Bestätigung prüfen wenn Notes vorhanden
    if (allocation.notes && !request.confirmed) {
      throw new ValidationError('Bestätigung erforderlich');
    }

    // 3. Löschen
    await this.allocationRepository.delete(request.allocationId);

    // 4. Redistribute für verbleibende Allocations
    const redistributed: Allocation[] = [];
    if (allocation.userId) {
      const remaining = await this.allocationRepository.findByUserAndDate(
        allocation.userId,
        allocation.date
      );

      if (remaining.length > 0) {
        const user = await this.userRepository.findById(allocation.userId);
        if (user) {
          const hoursPerAllocation = AllocationCalculator.calculatePlannedHours(
            user.weeklyHours,
            remaining.length
          );

          for (const alloc of remaining) {
            const updated = alloc.withPlannedHours(hoursPerAllocation);
            await this.allocationRepository.save(updated);
            redistributed.push(updated);
          }
        }
      }
    }

    return {
      deletedId: request.allocationId,
      redistributedAllocations: redistributed,
    };
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
│           ├── MoveAllocationUseCase.ts
│           ├── DeleteAllocationUseCase.ts
│           └── __tests__/
│               ├── MoveAllocationUseCase.test.ts
│               └── DeleteAllocationUseCase.test.ts
├── presentation/
│   └── actions/
│       └── allocations.ts  # Erweitert um move/delete
```

---

## Hinweise

- Redistribution muss bei Move an BEIDEN Tagen passieren
- Delete mit Notes erfordert Bestätigung (UI-Dialog)
- Undo/Redo wird in Prompt 19 implementiert
- Optimistic Updates in der UI

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Move innerhalb Phase funktioniert
- [ ] Move zu anderer Phase funktioniert
- [ ] Redistribution an beiden Tagen
- [ ] Delete funktioniert
- [ ] Bestätigung bei Notes

---

*Vorheriger Prompt: 12 – CreateAllocation Use Case*
*Nächster Prompt: 14 – GetAllocationsForWeek Query*
