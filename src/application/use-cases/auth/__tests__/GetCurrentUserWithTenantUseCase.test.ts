import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NotFoundError } from '@/domain/errors';

import type { IUserRepository, UserWithTenant } from '@/application/ports/repositories';

import { GetCurrentUserWithTenantUseCase } from '../GetCurrentUserWithTenantUseCase';

describe('GetCurrentUserWithTenantUseCase', () => {
  let useCase: GetCurrentUserWithTenantUseCase;
  let mockUserRepository: IUserRepository;

  const mockUserWithTenant: UserWithTenant = {
    id: 'user-123',
    authId: 'auth-456',
    email: 'max.mueller@zimmerei.de',
    fullName: 'Max Müller',
    role: 'planer',
    weeklyHours: 40,
    isActive: true,
    avatarUrl: 'https://example.com/avatar.jpg',
    tenant: {
      id: 'tenant-789',
      name: 'Zimmerei Müller GmbH',
      slug: 'zimmerei-mueller',
    },
  };

  beforeEach(() => {
    mockUserRepository = {
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
      findByTenantWithTimetacId: vi.fn(),
      updateTimetacId: vi.fn(),
    };

    useCase = new GetCurrentUserWithTenantUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('should return user with tenant data when user exists', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByAuthIdWithTenant).mockResolvedValue(
        mockUserWithTenant
      );

      // Act
      const result = await useCase.execute('auth-456');

      // Assert
      expect(result).toEqual(mockUserWithTenant);
      expect(mockUserRepository.findByAuthIdWithTenant).toHaveBeenCalledWith(
        'auth-456'
      );
      expect(mockUserRepository.findByAuthIdWithTenant).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByAuthIdWithTenant).mockResolvedValue(
        null
      );

      // Act & Assert
      await expect(useCase.execute('non-existent-auth-id')).rejects.toThrow(
        NotFoundError
      );
      await expect(useCase.execute('non-existent-auth-id')).rejects.toThrow(
        'Benutzer mit ID non-existent-auth-id nicht gefunden'
      );
    });

    it('should throw NotFoundError when authId is empty', async () => {
      // Act & Assert
      await expect(useCase.execute('')).rejects.toThrow(NotFoundError);
    });

    it('should return inactive user if they exist', async () => {
      // Arrange
      const inactiveUser: UserWithTenant = {
        ...mockUserWithTenant,
        isActive: false,
      };
      vi.mocked(mockUserRepository.findByAuthIdWithTenant).mockResolvedValue(
        inactiveUser
      );

      // Act
      const result = await useCase.execute('auth-456');

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should return all tenant fields', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByAuthIdWithTenant).mockResolvedValue(
        mockUserWithTenant
      );

      // Act
      const result = await useCase.execute('auth-456');

      // Assert
      expect(result.tenant).toEqual({
        id: 'tenant-789',
        name: 'Zimmerei Müller GmbH',
        slug: 'zimmerei-mueller',
      });
    });

    it('should handle users without avatarUrl', async () => {
      // Arrange
      const userWithoutAvatar: UserWithTenant = {
        ...mockUserWithTenant,
        avatarUrl: undefined,
      };
      vi.mocked(mockUserRepository.findByAuthIdWithTenant).mockResolvedValue(
        userWithoutAvatar
      );

      // Act
      const result = await useCase.execute('auth-456');

      // Assert
      expect(result.avatarUrl).toBeUndefined();
    });
  });
});
