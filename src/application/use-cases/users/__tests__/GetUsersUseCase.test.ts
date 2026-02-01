import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '@/domain/entities/User';
import { AuthorizationError } from '@/domain/errors';

import type { IUserRepository } from '@/application/ports/repositories';

import { GetUsersUseCase } from '../GetUsersUseCase';

describe('GetUsersUseCase', () => {
  let useCase: GetUsersUseCase;
  let mockUserRepository: IUserRepository;

  const testUsers = [
    User.create({
      id: 'user-1',
      authId: 'auth-1',
      tenantId: 'tenant-123',
      email: 'user1@firma.de',
      fullName: 'User Eins',
      role: 'admin',
      weeklyHours: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    User.create({
      id: 'user-2',
      authId: 'auth-2',
      tenantId: 'tenant-123',
      email: 'user2@firma.de',
      fullName: 'User Zwei',
      role: 'planer',
      weeklyHours: 38,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    User.create({
      id: 'user-3',
      authId: 'auth-3',
      tenantId: 'tenant-123',
      email: 'user3@firma.de',
      fullName: 'User Drei',
      role: 'gewerblich',
      weeklyHours: 40,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      findByIds: vi.fn(),
      findByAuthId: vi.fn(),
      findByAuthIdWithTenant: vi.fn(),
      findByEmailAndTenant: vi.fn(),
      findAllByTenant: vi.fn().mockResolvedValue(testUsers),
      findActiveByTenant: vi.fn().mockResolvedValue(testUsers.filter((u) => u.isActive)),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByTenantWithTimetacId: vi.fn(),
      updateTimetacId: vi.fn(),
    };

    useCase = new GetUsersUseCase(mockUserRepository);
  });

  describe('Alle User laden', () => {
    it('should return all users for admin', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        currentUserRole: 'admin',
      });

      expect(result).toHaveLength(3);
      expect(mockUserRepository.findAllByTenant).toHaveBeenCalledWith('tenant-123');
    });

    it('should return all users for planer', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        currentUserRole: 'planer',
      });

      expect(result).toHaveLength(3);
    });

    it('should filter by active status when requested', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        currentUserRole: 'admin',
        activeOnly: true,
      });

      expect(result).toHaveLength(2);
      expect(mockUserRepository.findActiveByTenant).toHaveBeenCalledWith('tenant-123');
    });
  });

  describe('Berechtigungsprüfung', () => {
    it('should reject when current user is gewerblich', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          currentUserRole: 'gewerblich',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should allow admin to view all users', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        currentUserRole: 'admin',
      });

      expect(result).toBeDefined();
    });

    it('should allow planer to view all users', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        currentUserRole: 'planer',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Leere Ergebnisse', () => {
    it('should return empty array when no users exist', async () => {
      vi.mocked(mockUserRepository.findAllByTenant).mockResolvedValue([]);

      const result = await useCase.execute({
        tenantId: 'tenant-123',
        currentUserRole: 'admin',
      });

      expect(result).toEqual([]);
    });
  });
});
