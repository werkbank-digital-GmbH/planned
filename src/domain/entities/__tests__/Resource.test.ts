import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { Resource, type CreateResourceProps } from '../Resource';

describe('Resource', () => {
  const validProps: CreateResourceProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    resourceTypeId: 'type-123e4567-e89b-12d3-a456-426614174000',
    name: 'Sprinter 1',
    licensePlate: 'B-AB 1234',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid Resource', () => {
      const resource = Resource.create(validProps);

      expect(resource.id).toBe(validProps.id);
      expect(resource.tenantId).toBe(validProps.tenantId);
      expect(resource.resourceTypeId).toBe(validProps.resourceTypeId);
      expect(resource.name).toBe('Sprinter 1');
      expect(resource.licensePlate).toBe('B-AB 1234');
      expect(resource.isActive).toBe(true);
    });

    it('should create Resource without licensePlate', () => {
      const resource = Resource.create({
        ...validProps,
        licensePlate: undefined,
      });

      expect(resource.licensePlate).toBeUndefined();
    });

    it('should default isActive to true', () => {
      const resource = Resource.create({
        ...validProps,
        isActive: undefined,
      });

      expect(resource.isActive).toBe(true);
    });

    it('should throw ValidationError when name is empty', () => {
      expect(() =>
        Resource.create({
          ...validProps,
          name: '',
        })
      ).toThrow(ValidationError);
      expect(() =>
        Resource.create({
          ...validProps,
          name: '',
        })
      ).toThrow('Name ist erforderlich');
    });

    it('should throw ValidationError when name is only whitespace', () => {
      expect(() =>
        Resource.create({
          ...validProps,
          name: '   ',
        })
      ).toThrow(ValidationError);
    });

    it('should trim name', () => {
      const resource = Resource.create({
        ...validProps,
        name: '  Sprinter 1  ',
      });

      expect(resource.name).toBe('Sprinter 1');
    });

    it('should trim licensePlate', () => {
      const resource = Resource.create({
        ...validProps,
        licensePlate: '  B-AB 1234  ',
      });

      expect(resource.licensePlate).toBe('B-AB 1234');
    });
  });

  describe('deactivate', () => {
    it('should deactivate resource and return new instance', () => {
      const resource = Resource.create(validProps);
      const deactivated = resource.deactivate();

      expect(deactivated).not.toBe(resource); // Immutability
      expect(deactivated.isActive).toBe(false);
      expect(resource.isActive).toBe(true); // Original unchanged
    });
  });

  describe('activate', () => {
    it('should activate resource and return new instance', () => {
      const resource = Resource.create({
        ...validProps,
        isActive: false,
      });
      const activated = resource.activate();

      expect(activated).not.toBe(resource); // Immutability
      expect(activated.isActive).toBe(true);
      expect(resource.isActive).toBe(false); // Original unchanged
    });
  });

  describe('withName', () => {
    it('should update name and return new instance', () => {
      const resource = Resource.create(validProps);
      const updated = resource.withName('Sprinter 2');

      expect(updated).not.toBe(resource); // Immutability
      expect(updated.name).toBe('Sprinter 2');
      expect(resource.name).toBe('Sprinter 1'); // Original unchanged
    });

    it('should throw ValidationError for empty name', () => {
      const resource = Resource.create(validProps);

      expect(() => resource.withName('')).toThrow(ValidationError);
    });
  });

  describe('withLicensePlate', () => {
    it('should update licensePlate and return new instance', () => {
      const resource = Resource.create(validProps);
      const updated = resource.withLicensePlate('M-XY 5678');

      expect(updated).not.toBe(resource); // Immutability
      expect(updated.licensePlate).toBe('M-XY 5678');
      expect(resource.licensePlate).toBe('B-AB 1234'); // Original unchanged
    });

    it('should allow setting licensePlate to undefined', () => {
      const resource = Resource.create(validProps);
      const updated = resource.withLicensePlate(undefined);

      expect(updated.licensePlate).toBeUndefined();
    });
  });

  describe('withResourceType', () => {
    it('should update resourceTypeId and return new instance', () => {
      const resource = Resource.create(validProps);
      const updated = resource.withResourceType('new-type-id');

      expect(updated).not.toBe(resource); // Immutability
      expect(updated.resourceTypeId).toBe('new-type-id');
    });
  });
});
