import type { Absence } from '@/domain/entities/Absence';
import type { Allocation } from '@/domain/entities/Allocation';
import { Allocation as AllocationEntity } from '@/domain/entities/Allocation';
import type { ProjectPhase } from '@/domain/entities/ProjectPhase';
import { NotFoundError, ValidationError } from '@/domain/errors';
import { AllocationCalculator } from '@/domain/services/AllocationCalculator';

import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IResourceRepository } from '@/application/ports/repositories/IResourceRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import type { AbsenceConflictChecker } from '@/application/services/AbsenceConflictChecker';

/**
 * Request für CreateAllocation
 */
export interface CreateAllocationRequest {
  tenantId: string;
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: Date;
  notes?: string;
}

/**
 * Warnung die bei der Allocation-Erstellung auftreten kann
 */
export type AllocationWarning =
  | { type: 'absence_conflict'; absence: Absence }
  | { type: 'multi_allocation'; count: number }
  | { type: 'phase_extended'; newEndDate: Date }
  | { type: 'phase_preponed'; newStartDate: Date };

/**
 * Response von CreateAllocation
 */
export interface CreateAllocationResponse {
  allocation: Allocation;
  warnings: AllocationWarning[];
  updatedPhase?: ProjectPhase;
}

/**
 * Use Case: CreateAllocation
 *
 * Erstellt eine neue Allocation mit allen Business Rules:
 * - PlannedHours Berechnung für User-Allocations
 * - Redistribution bei Mehrfach-Allocations am gleichen Tag
 * - Abwesenheits-Konflikt-Warnung (BLOCKIERT NICHT!)
 * - Phase-Datumsanpassung wenn Allocation außerhalb liegt
 *
 * @example
 * ```typescript
 * const result = await useCase.execute({
 *   tenantId: 'tenant-123',
 *   userId: 'user-123',
 *   projectPhaseId: 'phase-123',
 *   date: new Date('2026-02-05'),
 * });
 * ```
 */
export class CreateAllocationUseCase {
  constructor(
    private readonly allocationRepository: IAllocationRepository,
    private readonly userRepository: IUserRepository,
    private readonly phaseRepository: IProjectPhaseRepository,
    private readonly resourceRepository: IResourceRepository,
    private readonly absenceChecker: AbsenceConflictChecker
  ) {}

  async execute(request: CreateAllocationRequest): Promise<CreateAllocationResponse> {
    // Validate XOR: userId oder resourceId, nicht beides
    this.validateUserOrResource(request.userId, request.resourceId);

    const warnings: AllocationWarning[] = [];
    let plannedHours: number | undefined;

    // 1. Phase validieren
    const phase = await this.phaseRepository.findById(request.projectPhaseId);
    if (!phase) {
      throw new NotFoundError('ProjectPhase', request.projectPhaseId);
    }

    // 2. User oder Resource validieren und PlannedHours berechnen
    if (request.userId) {
      const userWarnings = await this.handleUserAllocation(
        request.userId,
        request.date
      );
      warnings.push(...userWarnings.warnings);
      plannedHours = userWarnings.plannedHours;
    } else if (request.resourceId) {
      await this.validateResource(request.resourceId);
      // Resources haben keine PlannedHours
    }

    // 3. Phase-Datum prüfen und ggf. anpassen
    const dateWarning = await this.checkAndUpdatePhaseDates(phase, request.date);
    if (dateWarning) {
      warnings.push(dateWarning);
    }

    // 4. Allocation erstellen
    const now = new Date();
    const allocation = AllocationEntity.create({
      id: crypto.randomUUID(),
      tenantId: request.tenantId,
      userId: request.userId,
      resourceId: request.resourceId,
      projectPhaseId: request.projectPhaseId,
      date: request.date,
      plannedHours,
      notes: request.notes,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Speichern
    const saved = await this.allocationRepository.save(allocation);

    return {
      allocation: saved,
      warnings,
    };
  }

  private validateUserOrResource(
    userId: string | undefined,
    resourceId: string | undefined
  ): void {
    if (!userId && !resourceId) {
      throw new ValidationError('User oder Resource erforderlich', {
        field: 'userId/resourceId',
      });
    }
    if (userId && resourceId) {
      throw new ValidationError('Nur User ODER Resource, nicht beide', {
        field: 'userId/resourceId',
      });
    }
  }

  private async handleUserAllocation(
    userId: string,
    date: Date
  ): Promise<{ plannedHours: number; warnings: AllocationWarning[] }> {
    const warnings: AllocationWarning[] = [];

    // User validieren
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    if (!user.isActive) {
      throw new ValidationError('User ist deaktiviert', { field: 'userId' });
    }

    // Abwesenheits-Check
    const conflictingAbsence = await this.absenceChecker.getConflictingAbsence(
      userId,
      date
    );
    if (conflictingAbsence) {
      warnings.push({
        type: 'absence_conflict',
        absence: conflictingAbsence,
      });
    }

    // PlannedHours berechnen
    const existingCount = await this.allocationRepository.countByUserAndDate(
      userId,
      date
    );
    const totalCount = existingCount + 1;
    const plannedHours = AllocationCalculator.calculatePlannedHours(
      user.weeklyHours,
      totalCount
    );

    // Mehrfach-Allocation Warnung und Redistribution
    if (existingCount > 0) {
      warnings.push({
        type: 'multi_allocation',
        count: totalCount,
      });

      // Bestehende Allocations redistributen
      await this.redistributeExistingAllocations(
        userId,
        date,
        user.weeklyHours,
        totalCount
      );
    }

    return { plannedHours, warnings };
  }

  private async validateResource(resourceId: string): Promise<void> {
    const resource = await this.resourceRepository.findById(resourceId);
    if (!resource) {
      throw new NotFoundError('Resource', resourceId);
    }
    if (!resource.isActive) {
      throw new ValidationError('Resource ist deaktiviert', { field: 'resourceId' });
    }
  }

  private async redistributeExistingAllocations(
    userId: string,
    date: Date,
    weeklyHours: number,
    totalCount: number
  ): Promise<void> {
    const existing = await this.allocationRepository.findByUserAndDate(userId, date);
    const newHours = AllocationCalculator.calculatePlannedHours(weeklyHours, totalCount);

    const updates = existing.map((allocation) => ({
      id: allocation.id,
      plannedHours: newHours,
    }));

    if (updates.length > 0) {
      await this.allocationRepository.updateManyPlannedHours(updates);
    }
  }

  private async checkAndUpdatePhaseDates(
    phase: ProjectPhase,
    allocationDate: Date
  ): Promise<AllocationWarning | null> {
    // Normalisiere Daten für Vergleich (nur Datum, keine Zeit)
    const allocDate = new Date(allocationDate);
    allocDate.setHours(0, 0, 0, 0);

    // Phase verlängern wenn Allocation nach endDate
    if (phase.endDate) {
      const endDate = new Date(phase.endDate);
      endDate.setHours(0, 0, 0, 0);

      if (allocDate > endDate) {
        await this.phaseRepository.updateDates(phase.id, {
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
        await this.phaseRepository.updateDates(phase.id, {
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
