import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '@/domain/entities/User';
import { AuthorizationError, NotFoundError, ValidationError } from '@/domain/errors';

import type { IUserRepository } from '@/application/ports/repositories';
import type { IAuthService } from '@/application/ports/services';

import { DeactivateUserUseCase } from '../DeactivateUserUseCase';


describe('DeactivateUserUseCase', () => {
  let useCase: DeactivateUserUseCase;
  let mockUserRepository: IUserRepository;
  let mockAuthService: IAuthService;

  const activeUser = User.create({
    id: 'user-123',
    authId: 'auth-123',
    tenantId: 'tenant-123',
    email: 'active@firma.de',
    fullName: 'Active User',
    role: 'planer',
    weeklyHours: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const inactiveUser = User.create({
    id: 'user-456',
    authId: 'auth-456',
    tenantId: 'tenant-123',
    email: 'inactive@firma.de',
    fullName: 'Inactive User',
    role: 'planer',
    weeklyHours: 40,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validRequest = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    currentUserRole: 'admin' as const,
    currentUserId: 'current-user-id',
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn().mockResolvedValue(activeUser),
      findByIds: vi.fn(),
      findByAuthId: vi.fn(),
      findByAuthIdWithTenant: vi.fn(),
      findByEmailAndTenant: vi.fn(),
      findAllByTenant: vi.fn(),
      findActiveByTenant: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockImplementation((user: User) => Promise.resolve(user)),
      delete: vi.fn(),
    };

    mockAuthService = {
      inviteUser: vi.fn(),
      resendInvitation: vi.fn(),
      disableUser: vi.fn().mockResolvedValue(undefined),
      enableUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    useCase = new DeactivateUserUseCase(mockUserRepository, mockAuthService);
  });

  describe('Erfolgreiche Deaktivierung', () => {
    it('should deactivate active user', async () => {
      const result = await useCase.execute(validRequest);

      expect(result.isActive).toBe(false);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should disable auth user', async () => {
      await useCase.execute(validRequest);

      expect(mockAuthService.disableUser).toHaveBeenCalledWith('auth-123');
    });

    it('should preserve other user data', async () => {
      const result = await useCase.execute(validRequest);

      expect(result.email).toBe('active@firma.de');
      expect(result.fullName).toBe('Active User');
      expect(result.role).toBe('planer');
      expect(result.weeklyHours).toBe(40);
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

  describe('Selbst-Deaktivierung verhindern', () => {
    it('should reject when admin tries to deactivate themselves', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          currentUserId: 'user-123', // Same as userId
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          ...validRequest,
          currentUserId: 'user-123',
        })
      ).rejects.toThrow('Sie können sich nicht selbst deaktivieren');
    });
  });

  describe('User nicht gefunden', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute(validRequest)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when user is in different tenant', async () => {
      const userInDifferentTenant = User.create({
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

  describe('Bereits deaktivierter User', () => {
    it('should succeed silently when user is already inactive', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(inactiveUser);

      const result = await useCase.execute({
        ...validRequest,
        userId: 'user-456',
      });

      expect(result.isActive).toBe(false);
      // Auth service should not be called for already inactive user
      expect(mockAuthService.disableUser).not.toHaveBeenCalled();
    });
  });
});
