import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';
import { type UserRole } from '@/domain/types';

import { User, type CreateUserProps } from '../User';

describe('User', () => {
  const validProps: CreateUserProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    authId: 'auth-123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    email: 'max.mueller@zimmerei.de',
    fullName: 'Max Müller',
    role: 'planer',
    weeklyHours: 40,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid User', () => {
      // Act
      const user = User.create(validProps);

      // Assert
      expect(user.id).toBe(validProps.id);
      expect(user.authId).toBe(validProps.authId);
      expect(user.tenantId).toBe(validProps.tenantId);
      expect(user.email).toBe(validProps.email);
      expect(user.fullName).toBe(validProps.fullName);
      expect(user.role).toBe('planer');
      expect(user.weeklyHours).toBe(40);
      expect(user.isActive).toBe(true);
    });

    it('should create User with optional fields', () => {
      // Arrange
      const propsWithOptional: CreateUserProps = {
        ...validProps,
        timetacId: 'timetac-123',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      // Act
      const user = User.create(propsWithOptional);

      // Assert
      expect(user.timetacId).toBe('timetac-123');
      expect(user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should create User with all valid roles', () => {
      const roles: UserRole[] = ['admin', 'planer', 'gewerblich'];

      roles.forEach((role) => {
        const user = User.create({ ...validProps, role });
        expect(user.role).toBe(role);
      });
    });

    it('should throw ValidationError when email is empty', () => {
      // Arrange
      const invalidProps: CreateUserProps = {
        ...validProps,
        email: '',
      };

      // Act & Assert
      expect(() => User.create(invalidProps)).toThrow(ValidationError);
      expect(() => User.create(invalidProps)).toThrow(
        'E-Mail ist erforderlich'
      );
    });

    it('should throw ValidationError when email is invalid', () => {
      // Arrange
      const invalidProps: CreateUserProps = {
        ...validProps,
        email: 'invalid-email',
      };

      // Act & Assert
      expect(() => User.create(invalidProps)).toThrow(ValidationError);
      expect(() => User.create(invalidProps)).toThrow(
        'E-Mail-Format ist ungültig'
      );
    });

    it('should throw ValidationError when fullName is empty', () => {
      // Arrange
      const invalidProps: CreateUserProps = {
        ...validProps,
        fullName: '',
      };

      // Act & Assert
      expect(() => User.create(invalidProps)).toThrow(ValidationError);
      expect(() => User.create(invalidProps)).toThrow('Name ist erforderlich');
    });

    it('should throw ValidationError when fullName is only whitespace', () => {
      // Arrange
      const invalidProps: CreateUserProps = {
        ...validProps,
        fullName: '   ',
      };

      // Act & Assert
      expect(() => User.create(invalidProps)).toThrow(ValidationError);
      expect(() => User.create(invalidProps)).toThrow('Name ist erforderlich');
    });

    it('should throw ValidationError when weeklyHours is negative', () => {
      // Arrange
      const invalidProps: CreateUserProps = {
        ...validProps,
        weeklyHours: -5,
      };

      // Act & Assert
      expect(() => User.create(invalidProps)).toThrow(ValidationError);
      expect(() => User.create(invalidProps)).toThrow(
        'Wochenstunden müssen zwischen 0 und 60 liegen'
      );
    });

    it('should throw ValidationError when weeklyHours exceeds 60', () => {
      // Arrange
      const invalidProps: CreateUserProps = {
        ...validProps,
        weeklyHours: 70,
      };

      // Act & Assert
      expect(() => User.create(invalidProps)).toThrow(ValidationError);
      expect(() => User.create(invalidProps)).toThrow(
        'Wochenstunden müssen zwischen 0 und 60 liegen'
      );
    });

    it('should accept weeklyHours of 0', () => {
      // Arrange
      const propsWithZeroHours: CreateUserProps = {
        ...validProps,
        weeklyHours: 0,
      };

      // Act
      const user = User.create(propsWithZeroHours);

      // Assert
      expect(user.weeklyHours).toBe(0);
    });

    it('should trim whitespace from fullName', () => {
      // Arrange
      const propsWithWhitespace: CreateUserProps = {
        ...validProps,
        fullName: '  Max Müller  ',
      };

      // Act
      const user = User.create(propsWithWhitespace);

      // Assert
      expect(user.fullName).toBe('Max Müller');
    });

    it('should lowercase email', () => {
      // Arrange
      const propsWithUppercase: CreateUserProps = {
        ...validProps,
        email: 'Max.Mueller@Zimmerei.DE',
      };

      // Act
      const user = User.create(propsWithUppercase);

      // Assert
      expect(user.email).toBe('max.mueller@zimmerei.de');
    });
  });

  describe('deactivate', () => {
    it('should deactivate user and return new instance', () => {
      // Arrange
      const user = User.create(validProps);

      // Act
      const deactivatedUser = user.deactivate();

      // Assert
      expect(deactivatedUser).not.toBe(user); // Immutability
      expect(deactivatedUser.isActive).toBe(false);
      expect(user.isActive).toBe(true); // Original unchanged
    });
  });

  describe('activate', () => {
    it('should activate user and return new instance', () => {
      // Arrange
      const user = User.create({ ...validProps, isActive: false });

      // Act
      const activatedUser = user.activate();

      // Assert
      expect(activatedUser).not.toBe(user); // Immutability
      expect(activatedUser.isActive).toBe(true);
    });
  });

  describe('updateRole', () => {
    it('should update role and return new instance', () => {
      // Arrange
      const user = User.create(validProps);

      // Act
      const updatedUser = user.updateRole('admin');

      // Assert
      expect(updatedUser).not.toBe(user); // Immutability
      expect(updatedUser.role).toBe('admin');
      expect(user.role).toBe('planer'); // Original unchanged
    });
  });

  describe('updateWeeklyHours', () => {
    it('should update weeklyHours and return new instance', () => {
      // Arrange
      const user = User.create(validProps);

      // Act
      const updatedUser = user.updateWeeklyHours(38.5);

      // Assert
      expect(updatedUser).not.toBe(user); // Immutability
      expect(updatedUser.weeklyHours).toBe(38.5);
    });

    it('should throw ValidationError for invalid weeklyHours', () => {
      // Arrange
      const user = User.create(validProps);

      // Act & Assert
      expect(() => user.updateWeeklyHours(-5)).toThrow(ValidationError);
      expect(() => user.updateWeeklyHours(65)).toThrow(ValidationError);
    });
  });

  describe('updateProfile', () => {
    it('should update fullName and return new instance', () => {
      // Arrange
      const user = User.create(validProps);

      // Act
      const updatedUser = user.updateProfile({ fullName: 'Maximilian Müller' });

      // Assert
      expect(updatedUser.fullName).toBe('Maximilian Müller');
    });

    it('should update avatarUrl and return new instance', () => {
      // Arrange
      const user = User.create(validProps);

      // Act
      const updatedUser = user.updateProfile({
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });

      // Assert
      expect(updatedUser.avatarUrl).toBe('https://example.com/new-avatar.jpg');
    });

    it('should throw ValidationError for empty fullName', () => {
      // Arrange
      const user = User.create(validProps);

      // Act & Assert
      expect(() => user.updateProfile({ fullName: '' })).toThrow(
        ValidationError
      );
    });
  });

  describe('getDailyHours', () => {
    it('should calculate daily hours from weekly hours', () => {
      // Arrange
      const user = User.create(validProps); // 40h/week

      // Act
      const dailyHours = user.getDailyHours();

      // Assert
      expect(dailyHours).toBe(8); // 40 / 5 = 8
    });

    it('should handle non-standard weekly hours', () => {
      // Arrange
      const user = User.create({ ...validProps, weeklyHours: 38.5 });

      // Act
      const dailyHours = user.getDailyHours();

      // Assert
      expect(dailyHours).toBe(7.7); // 38.5 / 5 = 7.7
    });
  });

  describe('hasDesktopAccess', () => {
    it('should return true for admin', () => {
      const user = User.create({ ...validProps, role: 'admin' });
      expect(user.hasDesktopAccess()).toBe(true);
    });

    it('should return true for planer', () => {
      const user = User.create({ ...validProps, role: 'planer' });
      expect(user.hasDesktopAccess()).toBe(true);
    });

    it('should return false for gewerblich', () => {
      const user = User.create({ ...validProps, role: 'gewerblich' });
      expect(user.hasDesktopAccess()).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      const user = User.create({ ...validProps, role: 'admin' });
      expect(user.isAdmin()).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      const planerUser = User.create({ ...validProps, role: 'planer' });
      const gewerblichUser = User.create({ ...validProps, role: 'gewerblich' });

      expect(planerUser.isAdmin()).toBe(false);
      expect(gewerblichUser.isAdmin()).toBe(false);
    });
  });
});
