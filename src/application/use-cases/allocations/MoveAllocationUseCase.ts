import type { Absence } from '@/domain/entities/Absence';
import type { Allocation } from '@/domain/entities/Allocation';
import { NotFoundError, ValidationError } from '@/domain/errors';
import { AllocationCalculator } from '@/domain/services/AllocationCalculator';

import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import type { AbsenceConflictChecker } from '@/application/services/AbsenceConflictChecker';

/**
 * Request für MoveAllocation
 */
export interface MoveAllocationRequest {
  allocationId: string;
  newDate?: Date;
  newProjectPhaseId?: string;
}

/**
 * Warnung die bei der Allocation-Verschiebung auftreten kann
 */
export type MoveAllocationWarning =
  | { type: 'absence_conflict'; absence: Absence }
  | { type: 'phase_extended'; newEndDate: Date }
  | { type: 'phase_preponed'; newStartDate: Date };

/**
 * Response von MoveAllocation
 */
export interface MoveAllocationResponse {
  allocation: Allocation;
  warnings: MoveAllocationWarning[];
  redistributedAllocations: Allocation[];
}

/**
 * Use Case: MoveAllocation
 *
 * Verschiebt eine Allocation zu einem neuen Datum und/oder einer neuen Phase.
 *
 * Business Rules:
 * - Bei Datumswechsel: Redistribution an beiden Tagen (alt und neu)
 * - Abwesenheits-Konflikt-Warnung (BLOCKIERT NICHT!)
 * - Phase-Datumsanpassung wenn nötig
 *
 * @example
 * ```typescript
 * const result = await useCase.execute({
 *   allocationId: 'alloc-123',
 *   newDate: new Date('2026-02-07'),
 * });
 * ```
 */
export class MoveAllocationUseCase {
  constructor(
    private readonly allocationRepository: IAllocationRepository,
    private readonly userRepository: IUserRepository,
    private readonly phaseRepository: IProjectPhaseRepository,
    private readonly absenceChecker: AbsenceConflictChecker
  ) {}

  async execute(request: MoveAllocationRequest): Promise<MoveAllocationResponse> {
    // Validierung: mindestens eine Änderung erforderlich
    if (!request.newDate && !request.newProjectPhaseId) {
      throw new ValidationError('Neues Datum oder neue Phase erforderlich', {
        field: 'newDate/newProjectPhaseId',
      });
    }

    const warnings: MoveAllocationWarning[] = [];
    const redistributedAllocations: Allocation[] = [];

    // 1. Allocation laden
    const allocation = await this.allocationRepository.findById(request.allocationId);
    if (!allocation) {
      throw new NotFoundError('Allocation', request.allocationId);
    }

    const oldDate = allocation.date;
    const newDate = request.newDate ?? oldDate;
    const oldPhaseId = allocation.projectPhaseId;
    const newPhaseId = request.newProjectPhaseId ?? oldPhaseId;
    const isDateChange = !this.isSameDay(oldDate, newDate);
    const isPhaseChange = newPhaseId !== oldPhaseId;

    // 2. Phase validieren wenn geändert
    if (isPhaseChange) {
      const phase = await this.phaseRepository.findById(newPhaseId);
      if (!phase) {
        throw new NotFoundError('ProjectPhase', newPhaseId);
      }
    }

    // 3. Abwesenheits-Check für neues Datum (nur User-Allocations)
    if (allocation.userId && isDateChange) {
      const conflict = await this.absenceChecker.getConflictingAbsence(
        allocation.userId,
        newDate
      );
      if (conflict) {
        warnings.push({ type: 'absence_conflict', absence: conflict });
      }
    }

    // 4. Phase-Datum prüfen und ggf. anpassen
    if (isDateChange) {
      const phaseWarning = await this.checkAndUpdatePhaseDates(newPhaseId, newDate);
      if (phaseWarning) {
        warnings.push(phaseWarning);
      }
    }

    // 5. PlannedHours für neues Datum berechnen (nur User-Allocations bei Datumswechsel)
    let newPlannedHours = allocation.plannedHours;
    if (allocation.userId && isDateChange) {
      const existingAtNewDate = await this.allocationRepository.countByUserAndDate(
        allocation.userId,
        newDate
      );
      const totalAtNewDate = existingAtNewDate + 1; // +1 für die verschobene
      const user = await this.userRepository.findById(allocation.userId);
      if (user) {
        newPlannedHours = AllocationCalculator.calculatePlannedHours(
          user.weeklyHours,
          totalAtNewDate
        );
      }
    }

    // 6. Allocation verschieben
    let movedAllocation: Allocation;

    if (isDateChange) {
      movedAllocation = await this.allocationRepository.moveToDate(
        request.allocationId,
        newDate
      );
    } else {
      movedAllocation = allocation;
    }

    if (isPhaseChange) {
      movedAllocation = await this.allocationRepository.moveToPhase(
        request.allocationId,
        newPhaseId
      );
    }

    // 7. PlannedHours der verschobenen Allocation aktualisieren
    if (allocation.userId && isDateChange && newPlannedHours !== undefined) {
      await this.allocationRepository.updateManyPlannedHours([
        { id: request.allocationId, plannedHours: newPlannedHours },
      ]);
      // Update local reference
      movedAllocation = {
        ...movedAllocation,
        plannedHours: newPlannedHours,
      } as Allocation;
    }

    // 8. Redistribute am alten Tag (nur User-Allocations bei Datumswechsel)
    if (allocation.userId && isDateChange) {
      const redistributedOld = await this.redistributeForDay(allocation.userId, oldDate);
      redistributedAllocations.push(...redistributedOld);
    }

    // 9. Redistribute am neuen Tag (bestehende Allocations)
    if (allocation.userId && isDateChange) {
      const redistributedNew = await this.redistributeExistingAtNewDate(
        allocation.userId,
        newDate,
        request.allocationId
      );
      redistributedAllocations.push(...redistributedNew);
    }

    return {
      allocation: movedAllocation,
      warnings,
      redistributedAllocations,
    };
  }

  private isSameDay(a: Date, b: Date): boolean {
    const dateA = new Date(a);
    const dateB = new Date(b);
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    return dateA.getTime() === dateB.getTime();
  }

  private async redistributeForDay(
    userId: string,
    date: Date
  ): Promise<Allocation[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) return [];

    const allocations = await this.allocationRepository.findByUserAndDate(userId, date);
    if (allocations.length === 0) return [];

    const hoursPerAllocation = AllocationCalculator.calculatePlannedHours(
      user.weeklyHours,
      allocations.length
    );

    const updates = allocations.map((alloc) => ({
      id: alloc.id,
      plannedHours: hoursPerAllocation,
    }));

    await this.allocationRepository.updateManyPlannedHours(updates);

    return allocations;
  }

  private async redistributeExistingAtNewDate(
    userId: string,
    date: Date,
    excludeAllocationId: string
  ): Promise<Allocation[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) return [];

    const allocations = await this.allocationRepository.findByUserAndDate(userId, date);
    // Exclude the moved allocation from updates (it was already updated)
    const existingAllocations = allocations.filter((a) => a.id !== excludeAllocationId);

    if (existingAllocations.length === 0) return [];

    // Total count includes moved allocation
    const totalCount = allocations.length;
    const hoursPerAllocation = AllocationCalculator.calculatePlannedHours(
      user.weeklyHours,
      totalCount
    );

    const updates = existingAllocations.map((alloc) => ({
      id: alloc.id,
      plannedHours: hoursPerAllocation,
    }));

    await this.allocationRepository.updateManyPlannedHours(updates);

    return existingAllocations;
  }

  private async checkAndUpdatePhaseDates(
    phaseId: string,
    allocationDate: Date
  ): Promise<MoveAllocationWarning | null> {
    const phase = await this.phaseRepository.findById(phaseId);
    if (!phase) return null;

    const allocDate = new Date(allocationDate);
    allocDate.setHours(0, 0, 0, 0);

    // Phase verlängern wenn Allocation nach endDate
    if (phase.endDate) {
      const endDate = new Date(phase.endDate);
      endDate.setHours(0, 0, 0, 0);

      if (allocDate > endDate) {
        await this.phaseRepository.updateDates(phaseId, {
          endDate: allocationDate,
        });
        return {
          type: 'phase_extended',
          newEndDate: allocationDate,
        };
      }
    }

    // Phase vorverlegen wenn Allocation vor startDate
    if (phase.startDate) {
      const startDate = new Date(phase.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (allocDate < startDate) {
        await this.phaseRepository.updateDates(phaseId, {
          startDate: allocationDate,
        });
        return {
          type: 'phase_preponed',
          newStartDate: allocationDate,
        };
      }
    }

    return null;
  }
}
