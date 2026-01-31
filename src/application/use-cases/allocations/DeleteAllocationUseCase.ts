import type { Allocation } from '@/domain/entities/Allocation';
import { NotFoundError, ValidationError } from '@/domain/errors';
import { AllocationCalculator } from '@/domain/services/AllocationCalculator';

import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';

/**
 * Request für DeleteAllocation
 */
export interface DeleteAllocationRequest {
  allocationId: string;
  confirmed?: boolean; // Für Allocations mit Notes
}

/**
 * Response von DeleteAllocation
 */
export interface DeleteAllocationResponse {
  deletedId: string;
  redistributedAllocations: Allocation[];
}

/**
 * Use Case: DeleteAllocation
 *
 * Löscht eine Allocation und redistributiert verbleibende Allocations.
 *
 * Business Rules:
 * - Bestätigung erforderlich wenn Notes vorhanden
 * - Verbleibende Allocations am gleichen Tag werden redistributiert
 *
 * @example
 * ```typescript
 * const result = await useCase.execute({
 *   allocationId: 'alloc-123',
 *   confirmed: true,
 * });
 * ```
 */
export class DeleteAllocationUseCase {
  constructor(
    private readonly allocationRepository: IAllocationRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: DeleteAllocationRequest): Promise<DeleteAllocationResponse> {
    // 1. Allocation laden
    const allocation = await this.allocationRepository.findById(request.allocationId);
    if (!allocation) {
      throw new NotFoundError('Allocation', request.allocationId);
    }

    // 2. Bestätigung prüfen wenn Notes vorhanden
    if (allocation.notes && !request.confirmed) {
      throw new ValidationError('Bestätigung erforderlich', {
        field: 'confirmed',
        reason: 'Allocation hat Notizen',
      });
    }

    // 3. Löschen
    await this.allocationRepository.delete(request.allocationId);

    // 4. Redistribute für verbleibende Allocations (nur User-Allocations)
    const redistributedAllocations: Allocation[] = [];

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

          const updates = remaining.map((alloc) => ({
            id: alloc.id,
            plannedHours: hoursPerAllocation,
          }));

          await this.allocationRepository.updateManyPlannedHours(updates);
          redistributedAllocations.push(...remaining);
        }
      }
    }

    return {
      deletedId: request.allocationId,
      redistributedAllocations,
    };
  }
}
