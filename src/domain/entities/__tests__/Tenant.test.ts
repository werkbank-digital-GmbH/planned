import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { Tenant, type TenantSettings, type CreateTenantProps } from '../Tenant';

describe('Tenant', () => {
  const validProps: CreateTenantProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Zimmerei Müller GmbH',
    slug: 'zimmerei-mueller',
    settings: {
      defaultWeeklyHours: 40,
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid Tenant', () => {
      // Act
      const tenant = Tenant.create(validProps);

      // Assert
      expect(tenant.id).toBe(validProps.id);
      expect(tenant.name).toBe(validProps.name);
      expect(tenant.slug).toBe(validProps.slug);
      expect(tenant.settings.defaultWeeklyHours).toBe(40);
      expect(tenant.createdAt).toEqual(validProps.createdAt);
      expect(tenant.updatedAt).toEqual(validProps.updatedAt);
    });

    it('should create Tenant with optional logoUrl in settings', () => {
      // Arrange
      const propsWithLogo: CreateTenantProps = {
        ...validProps,
        settings: {
          defaultWeeklyHours: 40,
          logoUrl: 'https://example.com/logo.png',
        },
      };

      // Act
      const tenant = Tenant.create(propsWithLogo);

      // Assert
      expect(tenant.settings.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should throw ValidationError when name is empty', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        name: '',
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Firmenname ist erforderlich'
      );
    });

    it('should throw ValidationError when name is only whitespace', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        name: '   ',
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Firmenname ist erforderlich'
      );
    });

    it('should throw ValidationError when slug is empty', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        slug: '',
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Slug ist erforderlich'
      );
    });

    it('should throw ValidationError when slug contains invalid characters', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        slug: 'Invalid Slug!',
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'
      );
    });

    it('should throw ValidationError when slug starts with hyphen', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        slug: '-invalid-slug',
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Slug darf nicht mit einem Bindestrich beginnen oder enden'
      );
    });

    it('should throw ValidationError when slug ends with hyphen', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        slug: 'invalid-slug-',
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Slug darf nicht mit einem Bindestrich beginnen oder enden'
      );
    });

    it('should accept valid slug with numbers', () => {
      // Arrange
      const propsWithNumbers: CreateTenantProps = {
        ...validProps,
        slug: 'zimmerei-mueller-2026',
      };

      // Act
      const tenant = Tenant.create(propsWithNumbers);

      // Assert
      expect(tenant.slug).toBe('zimmerei-mueller-2026');
    });

    it('should throw ValidationError when defaultWeeklyHours is negative', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        settings: {
          defaultWeeklyHours: -5,
        },
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Wochenstunden müssen zwischen 0 und 60 liegen'
      );
    });

    it('should throw ValidationError when defaultWeeklyHours exceeds 60', () => {
      // Arrange
      const invalidProps: CreateTenantProps = {
        ...validProps,
        settings: {
          defaultWeeklyHours: 70,
        },
      };

      // Act & Assert
      expect(() => Tenant.create(invalidProps)).toThrow(ValidationError);
      expect(() => Tenant.create(invalidProps)).toThrow(
        'Wochenstunden müssen zwischen 0 und 60 liegen'
      );
    });
  });

  describe('updateSettings', () => {
    it('should update settings and return new Tenant instance', () => {
      // Arrange
      const tenant = Tenant.create(validProps);
      const newSettings: TenantSettings = {
        defaultWeeklyHours: 38.5,
        logoUrl: 'https://example.com/new-logo.png',
      };

      // Act
      const updatedTenant = tenant.updateSettings(newSettings);

      // Assert
      expect(updatedTenant).not.toBe(tenant); // Immutability
      expect(updatedTenant.settings.defaultWeeklyHours).toBe(38.5);
      expect(updatedTenant.settings.logoUrl).toBe(
        'https://example.com/new-logo.png'
      );
      expect(updatedTenant.updatedAt.getTime()).toBeGreaterThanOrEqual(
        tenant.updatedAt.getTime()
      );
    });

    it('should validate new settings', () => {
      // Arrange
      const tenant = Tenant.create(validProps);
      const invalidSettings: TenantSettings = {
        defaultWeeklyHours: -10,
      };

      // Act & Assert
      expect(() => tenant.updateSettings(invalidSettings)).toThrow(
        ValidationError
      );
    });
  });

  describe('updateName', () => {
    it('should update name and return new Tenant instance', () => {
      // Arrange
      const tenant = Tenant.create(validProps);

      // Act
      const updatedTenant = tenant.updateName('Holzbau Schmidt AG');

      // Assert
      expect(updatedTenant).not.toBe(tenant); // Immutability
      expect(updatedTenant.name).toBe('Holzbau Schmidt AG');
      expect(updatedTenant.slug).toBe(tenant.slug); // Slug unchanged
    });

    it('should throw ValidationError for empty name', () => {
      // Arrange
      const tenant = Tenant.create(validProps);

      // Act & Assert
      expect(() => tenant.updateName('')).toThrow(ValidationError);
    });
  });
});
