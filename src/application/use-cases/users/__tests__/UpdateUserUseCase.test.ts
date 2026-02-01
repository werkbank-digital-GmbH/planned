import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '@/domain/entities/User';
import { AuthorizationError, NotFoundError, ValidationError } from '@/domain/errors';

import type { IUserRepository } from '@/application/ports/repositories';

import { UpdateUserUseCase } from '../UpdateUserUseCase';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepository: IUserRepository;

  const existingUser = User.create({
    id: 'user-123',
    authId: 'auth-123',
    tenantId: 'tenant-123',
    email: 'existing@firma.de',
    fullName: 'Existing User',
    role: 'planer',
    weeklyHours: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validRequest = {
    userId: 'user-123',
    fullName: 'Updated Name',
    role: 'admin' as const,
    weeklyHours: 38,
    tenantId: 'tenant-123',
    currentUserRole: 'admin' as const,
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn().mockResolvedValue(existingUser),
      findByIds: vi.fn(),
      findByAuthId: vi.fn(),
      findByAuthIdWithTenant: vi.fn(),
      findByEmailAndTenant: vi.fn(),
      findAllByTenant: vi.fn(),
      findActiveByTenant: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockImplementation((user: User) => Promise.resolve(user)),
      delete: vi.fn(),
      findByTenantWithTimetacId: vi.fn(),
      updateTimetacId: vi.fn(),
    };

    useCase = new UpdateUserUseCase(mockUserRepository);
  });

  describe('Erfolgreiche Aktualisierung', () => {
    it('should update user name', async () => {
      const result = await useCase.execute({
        ...validRequest,
        fullName: 'Neuer Name',
      });

      expect(result.fullName).toBe('Neuer Name');
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should update user role', async () => {
      const result = await useCase.execute({
        ...validRequest,
        role: 'gewerblich',
      });

      expect(result.role).toBe('gewerblich');
    });

    it('should update weekly hours', async () => {
      const result = await useCase.execute({
        ...validRequest,
        weeklyHours: 32,
      });

      expect(result.weeklyHours).toBe(32);
    });

    it('should update multiple fields at once', async () => {
      const result = await useCase.execute({
        userId: 'user-123',
        fullName: 'Komplett Neu',
        role: 'gewerblich',
        weeklyHours: 20,
        tenantId: 'tenant-123',
        currentUserRole: 'admin',
      });

      expect(result.fullName).toBe('Komplett Neu');
      expect(result.role).toBe('gewerblich');
      expect(result.weeklyHours).toBe(20);
    });

    it('should preserve unchanged fields', async () => {
      const result = await useCase.execute({
        userId: 'user-123',
        tenantId: 'tenant-123',
        currentUserRole: 'admin',
        // Nur Name ändern
        fullName: 'Nur Name Geändert',
      });

      expect(result.email).toBe('existing@firma.de');
      expect(result.tenantId).toBe('tenant-123');
    });
  });

  describe('Berechtigungsprüfung', () => {
    it('should reject when current user is not admin', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          currentUserRole: 'planer',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should reject when current user is gewerblich', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          currentUserRole: 'gewerblich',
        })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('User nicht gefunden', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute(validRequest)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when user is in different tenant', async () => {
      const userInDifferentTenant = User.create({
        ...existingUser,
        id: 'user-123',
        authId: 'auth-123',
        tenantId: 'other-tenant',
        email: 'other@firma.de',
        fullName: 'Other User',
        role: 'planer',
        weeklyHours: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockUserRepository.findById).mockResolvedValue(userInDifferentTenant);

      await expect(useCase.execute(validRequest)).rejects.toThrow(NotFoundError);
    });
  });

  describe('Validierung', () => {
    it('should reject empty fullName', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          fullName: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject weekly hours greater than 60', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          weeklyHours: 61,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject negative weekly hours', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          weeklyHours: -1,
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
