import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { ResourceType, type CreateResourceTypeProps } from '../ResourceType';

describe('ResourceType', () => {
  const validProps: CreateResourceTypeProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    name: 'Fahrzeug',
    icon: '🚗',
    color: '#3B82F6',
    sortOrder: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid ResourceType', () => {
      const type = ResourceType.create(validProps);

      expect(type.id).toBe(validProps.id);
      expect(type.tenantId).toBe(validProps.tenantId);
      expect(type.name).toBe('Fahrzeug');
      expect(type.icon).toBe('🚗');
      expect(type.color).toBe('#3B82F6');
      expect(type.sortOrder).toBe(1);
    });

    it('should create ResourceType with optional fields undefined', () => {
      const type = ResourceType.create({
        ...validProps,
        icon: undefined,
        color: undefined,
      });

      expect(type.icon).toBeUndefined();
      expect(type.color).toBeUndefined();
    });

    it('should throw ValidationError when name is empty', () => {
      expect(() =>
        ResourceType.create({
          ...validProps,
          name: '',
        })
      ).toThrow(ValidationError);
      expect(() =>
        ResourceType.create({
          ...validProps,
          name: '',
        })
      ).toThrow('Name ist erforderlich');
    });

    it('should throw ValidationError when name is only whitespace', () => {
      expect(() =>
        ResourceType.create({
          ...validProps,
          name: '   ',
        })
      ).toThrow(ValidationError);
    });

    it('should trim name', () => {
      const type = ResourceType.create({
        ...validProps,
        name: '  Fahrzeug  ',
      });

      expect(type.name).toBe('Fahrzeug');
    });
  });

  describe('withName', () => {
    it('should update name and return new instance', () => {
      const type = ResourceType.create(validProps);
      const updated = type.withName('Maschine');

      expect(updated).not.toBe(type); // Immutability
      expect(updated.name).toBe('Maschine');
      expect(type.name).toBe('Fahrzeug'); // Original unchanged
    });

    it('should throw ValidationError for empty name', () => {
      const type = ResourceType.create(validProps);

      expect(() => type.withName('')).toThrow(ValidationError);
    });
  });

  describe('withIcon', () => {
    it('should update icon and return new instance', () => {
      const type = ResourceType.create(validProps);
      const updated = type.withIcon('🔧');

      expect(updated).not.toBe(type); // Immutability
      expect(updated.icon).toBe('🔧');
      expect(type.icon).toBe('🚗'); // Original unchanged
    });

    it('should allow setting icon to undefined', () => {
      const type = ResourceType.create(validProps);
      const updated = type.withIcon(undefined);

      expect(updated.icon).toBeUndefined();
    });
  });

  describe('withColor', () => {
    it('should update color and return new instance', () => {
      const type = ResourceType.create(validProps);
      const updated = type.withColor('#EF4444');

      expect(updated).not.toBe(type); // Immutability
      expect(updated.color).toBe('#EF4444');
    });
  });

  describe('withSortOrder', () => {
    it('should update sortOrder and return new instance', () => {
      const type = ResourceType.create(validProps);
      const updated = type.withSortOrder(5);

      expect(updated).not.toBe(type); // Immutability
      expect(updated.sortOrder).toBe(5);
      expect(type.sortOrder).toBe(1); // Original unchanged
    });
  });
});
