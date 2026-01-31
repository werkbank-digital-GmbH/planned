import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Allocation } from '@/domain/entities/Allocation';
import { User } from '@/domain/entities/User';
import { NotFoundError, ValidationError } from '@/domain/errors';

import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';

import { DeleteAllocationUseCase } from '../DeleteAllocationUseCase';

describe('DeleteAllocationUseCase', () => {
  // Mock repositories
  const mockAllocationRepo = {
    findById: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByResourceAndDate: vi.fn(),
    findByPhaseAndDateRange: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findByTenantAndDateRange: vi.fn(),
    countByUserAndDate: vi.fn(),
    save: vi.fn(),
    saveMany: vi.fn(),
    update: vi.fn(),
    updateManyPlannedHours: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    moveToDate: vi.fn(),
    moveToPhase: vi.fn(),
  };

  const mockUserRepo = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByAuthId: vi.fn(),
    findByAuthIdWithTenant: vi.fn(),
    findByEmailAndTenant: vi.fn(),
    findAllByTenant: vi.fn(),
    findActiveByTenant: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  let useCase: DeleteAllocationUseCase;

  // Test fixtures
  const createTestUser = (overrides = {}) =>
    User.create({
      id: 'user-123',
      authId: 'auth-123',
      tenantId: 'tenant-123',
      email: 'max@example.com',
      fullName: 'Max Mustermann',
      role: 'gewerblich',
      weeklyHours: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const createTestAllocation = (overrides = {}) =>
    Allocation.create({
      id: 'alloc-123',
      tenantId: 'tenant-123',
      userId: 'user-123',
      projectPhaseId: 'phase-123',
      date: new Date('2026-02-05'),
      plannedHours: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockAllocationRepo.findById.mockResolvedValue(createTestAllocation());
    mockUserRepo.findById.mockResolvedValue(createTestUser());
    mockAllocationRepo.findByUserAndDate.mockResolvedValue([]);
    mockAllocationRepo.delete.mockResolvedValue(undefined);
    mockAllocationRepo.updateManyPlannedHours.mockResolvedValue(undefined);

    useCase = new DeleteAllocationUseCase(
      mockAllocationRepo as unknown as IAllocationRepository,
      mockUserRepo as unknown as IUserRepository
    );
  });

  describe('Basic deletion', () => {
    it('should delete allocation', async () => {
      const result = await useCase.execute({ allocationId: 'alloc-123' });

      expect(result.deletedId).toBe('alloc-123');
      expect(mockAllocationRepo.delete).toHaveBeenCalledWith('alloc-123');
    });

    it('should throw NotFoundError when allocation not found', async () => {
      mockAllocationRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ allocationId: 'nonexistent' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Confirmation for notes', () => {
    it('should require confirmation when allocation has notes', async () => {
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({ notes: 'Wichtige Notiz' })
      );

      await expect(
        useCase.execute({ allocationId: 'alloc-123', confirmed: false })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({ allocationId: 'alloc-123', confirmed: false })
      ).rejects.toThrow('Bestätigung erforderlich');
    });

    it('should delete when allocation has notes and confirmed is true', async () => {
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({ notes: 'Wichtige Notiz' })
      );

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        confirmed: true,
      });

      expect(result.deletedId).toBe('alloc-123');
      expect(mockAllocationRepo.delete).toHaveBeenCalled();
    });

    it('should delete without confirmation when allocation has no notes', async () => {
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({ notes: undefined })
      );

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        confirmed: false,
      });

      expect(result.deletedId).toBe('alloc-123');
    });
  });

  describe('Redistribution after deletion', () => {
    it('should redistribute remaining allocations after deletion', async () => {
      // Setup: 2 remaining allocations after delete
      const remainingAllocations = [
        createTestAllocation({ id: 'remaining-1', plannedHours: 4 }),
        createTestAllocation({ id: 'remaining-2', plannedHours: 4 }),
      ];
      mockAllocationRepo.findByUserAndDate.mockResolvedValue(remainingAllocations);

      const result = await useCase.execute({ allocationId: 'alloc-123' });

      // 2 remaining allocations → 4h each (was 2.67h when there were 3)
      expect(mockAllocationRepo.updateManyPlannedHours).toHaveBeenCalledWith([
        { id: 'remaining-1', plannedHours: 4 },
        { id: 'remaining-2', plannedHours: 4 },
      ]);
      expect(result.redistributedAllocations).toHaveLength(2);
    });

    it('should redistribute single remaining allocation to full hours', async () => {
      // Setup: 1 remaining allocation after delete
      const remainingAllocation = createTestAllocation({
        id: 'remaining-123',
        plannedHours: 4,
      });
      mockAllocationRepo.findByUserAndDate.mockResolvedValue([remainingAllocation]);

      const result = await useCase.execute({ allocationId: 'alloc-123' });

      // 1 remaining allocation → 8h
      expect(mockAllocationRepo.updateManyPlannedHours).toHaveBeenCalledWith([
        { id: 'remaining-123', plannedHours: 8 },
      ]);
      expect(result.redistributedAllocations).toHaveLength(1);
    });

    it('should not redistribute when last allocation is deleted', async () => {
      // No remaining allocations
      mockAllocationRepo.findByUserAndDate.mockResolvedValue([]);

      const result = await useCase.execute({ allocationId: 'alloc-123' });

      expect(mockAllocationRepo.updateManyPlannedHours).not.toHaveBeenCalled();
      expect(result.redistributedAllocations).toHaveLength(0);
    });
  });

  describe('Resource allocations', () => {
    it('should delete resource allocation without redistribution', async () => {
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({
          userId: undefined,
          resourceId: 'resource-123',
          plannedHours: undefined,
        })
      );

      const result = await useCase.execute({ allocationId: 'alloc-123' });

      expect(result.deletedId).toBe('alloc-123');
      expect(mockAllocationRepo.updateManyPlannedHours).not.toHaveBeenCalled();
      expect(result.redistributedAllocations).toHaveLength(0);
    });
  });

  describe('User not found', () => {
    it('should still delete if user not found (edge case)', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      mockAllocationRepo.findByUserAndDate.mockResolvedValue([
        createTestAllocation({ id: 'remaining-123' }),
      ]);

      const result = await useCase.execute({ allocationId: 'alloc-123' });

      // Deletion happens but redistribution skipped
      expect(result.deletedId).toBe('alloc-123');
      expect(mockAllocationRepo.updateManyPlannedHours).not.toHaveBeenCalled();
    });
  });

  describe('Response structure', () => {
    it('should return correct response structure', async () => {
      const result = await useCase.execute({ allocationId: 'alloc-123' });

      expect(result).toHaveProperty('deletedId');
      expect(result).toHaveProperty('redistributedAllocations');
      expect(Array.isArray(result.redistributedAllocations)).toBe(true);
    });
  });
});
