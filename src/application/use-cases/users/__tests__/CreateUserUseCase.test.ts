import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '@/domain/entities/User';
import { AuthorizationError, ConflictError, ValidationError } from '@/domain/errors';

import type { IUserRepository } from '@/application/ports/repositories';
import type { IAuthService } from '@/application/ports/services';

import { CreateUserUseCase } from '../CreateUserUseCase';


describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: IUserRepository;
  let mockAuthService: IAuthService;

  const validRequest = {
    email: 'new@firma.de',
    fullName: 'Neuer Mitarbeiter',
    role: 'planer' as const,
    weeklyHours: 40,
    tenantId: 'tenant-123',
    currentUserRole: 'admin' as const,
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      findByIds: vi.fn(),
      findByAuthId: vi.fn(),
      findByAuthIdWithTenant: vi.fn(),
      findByEmailAndTenant: vi.fn().mockResolvedValue(null),
      findAllByTenant: vi.fn(),
      findActiveByTenant: vi.fn(),
      save: vi.fn().mockImplementation((user: User) => Promise.resolve(user)),
      update: vi.fn(),
      delete: vi.fn(),
      findByTenantWithTimetacId: vi.fn(),
      updateTimetacId: vi.fn(),
    };

    mockAuthService = {
      inviteUser: vi.fn().mockResolvedValue('auth-user-id-123'),
      resendInvitation: vi.fn(),
      disableUser: vi.fn(),
      enableUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    useCase = new CreateUserUseCase(mockUserRepository, mockAuthService);
  });

  describe('Erfolgreiche Erstellung', () => {
    it('should create user and send invitation email', async () => {
      const result = await useCase.execute(validRequest);

      expect(result).toBeDefined();
      expect(result.email).toBe('new@firma.de');
      expect(result.fullName).toBe('Neuer Mitarbeiter');
      expect(result.role).toBe('planer');
      expect(result.weeklyHours).toBe(40);
      expect(result.isActive).toBe(true);
      expect(mockAuthService.inviteUser).toHaveBeenCalledWith('new@firma.de', undefined);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const result = await useCase.execute({
        ...validRequest,
        email: 'NEW@FIRMA.DE',
      });

      expect(result.email).toBe('new@firma.de');
    });

    it('should trim whitespace from fullName', async () => {
      const result = await useCase.execute({
        ...validRequest,
        fullName: '  Max Müller  ',
      });

      expect(result.fullName).toBe('Max Müller');
    });

    it('should create user with authId from invitation', async () => {
      const result = await useCase.execute(validRequest);

      expect(result.authId).toBe('auth-user-id-123');
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

    it('should allow admin to create users', async () => {
      const result = await useCase.execute({
        ...validRequest,
        currentUserRole: 'admin',
      });

      expect(result).toBeDefined();
    });
  });

  describe('E-Mail Validierung', () => {
    it('should reject duplicate email in same tenant', async () => {
      vi.mocked(mockUserRepository.findByEmailAndTenant).mockResolvedValue(
        User.create({
          id: 'existing-id',
          authId: 'existing-auth-id',
          tenantId: 'tenant-123',
          email: 'new@firma.de',
          fullName: 'Existing User',
          role: 'planer',
          weeklyHours: 40,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      await expect(useCase.execute(validRequest)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(validRequest)).rejects.toThrow(
        'E-Mail-Adresse bereits vergeben'
      );
    });

    it('should reject invalid email format', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          email: 'invalid-email',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject empty email', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          email: '',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Name Validierung', () => {
    it('should reject empty fullName', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          fullName: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject whitespace-only fullName', async () => {
      await expect(
        useCase.execute({
          ...validRequest,
          fullName: '   ',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Wochenstunden Validierung', () => {
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

    it('should accept weekly hours of 0', async () => {
      const result = await useCase.execute({
        ...validRequest,
        weeklyHours: 0,
      });

      expect(result.weeklyHours).toBe(0);
    });

    it('should accept weekly hours of 60', async () => {
      const result = await useCase.execute({
        ...validRequest,
        weeklyHours: 60,
      });

      expect(result.weeklyHours).toBe(60);
    });
  });

  describe('Fehlerbehandlung', () => {
    it('should not save user if invitation fails', async () => {
      vi.mocked(mockAuthService.inviteUser).mockRejectedValue(
        new Error('E-Mail-Versand fehlgeschlagen')
      );

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        'E-Mail-Versand fehlgeschlagen'
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});
