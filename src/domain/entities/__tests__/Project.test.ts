import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';
import { type ProjectStatus } from '@/domain/types';

import { Project, type CreateProjectProps } from '../Project';

describe('Project', () => {
  const validProps: CreateProjectProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    name: 'Haus Weber',
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid Project', () => {
      // Act
      const project = Project.create(validProps);

      // Assert
      expect(project.id).toBe(validProps.id);
      expect(project.tenantId).toBe(validProps.tenantId);
      expect(project.name).toBe('Haus Weber');
      expect(project.status).toBe('active');
    });

    it('should create Project with optional fields', () => {
      // Arrange
      const propsWithOptional: CreateProjectProps = {
        ...validProps,
        clientName: 'Familie Weber',
        address: 'Musterstraße 123, 12345 Musterstadt',
        asanaGid: '1234567890',
        syncedAt: new Date('2026-01-01T12:00:00Z'),
      };

      // Act
      const project = Project.create(propsWithOptional);

      // Assert
      expect(project.clientName).toBe('Familie Weber');
      expect(project.address).toBe('Musterstraße 123, 12345 Musterstadt');
      expect(project.asanaGid).toBe('1234567890');
      expect(project.syncedAt).toEqual(new Date('2026-01-01T12:00:00Z'));
    });

    it('should create Project with all valid statuses', () => {
      const statuses: ProjectStatus[] = ['planning', 'active', 'paused', 'completed'];

      statuses.forEach((status) => {
        const project = Project.create({ ...validProps, status });
        expect(project.status).toBe(status);
      });
    });

    it('should throw ValidationError when name is empty', () => {
      // Arrange
      const invalidProps: CreateProjectProps = {
        ...validProps,
        name: '',
      };

      // Act & Assert
      expect(() => Project.create(invalidProps)).toThrow(ValidationError);
      expect(() => Project.create(invalidProps)).toThrow('Projektname ist erforderlich');
    });

    it('should throw ValidationError when name is only whitespace', () => {
      // Arrange
      const invalidProps: CreateProjectProps = {
        ...validProps,
        name: '   ',
      };

      // Act & Assert
      expect(() => Project.create(invalidProps)).toThrow(ValidationError);
      expect(() => Project.create(invalidProps)).toThrow('Projektname ist erforderlich');
    });

    it('should throw ValidationError when status is invalid', () => {
      // Arrange
      const invalidProps = {
        ...validProps,
        status: 'invalid' as ProjectStatus,
      };

      // Act & Assert
      expect(() => Project.create(invalidProps)).toThrow(ValidationError);
      expect(() => Project.create(invalidProps)).toThrow('Ungültiger Projektstatus');
    });

    it('should trim whitespace from name', () => {
      // Arrange
      const propsWithWhitespace: CreateProjectProps = {
        ...validProps,
        name: '  Haus Weber  ',
      };

      // Act
      const project = Project.create(propsWithWhitespace);

      // Assert
      expect(project.name).toBe('Haus Weber');
    });

    it('should trim whitespace from clientName', () => {
      // Arrange
      const propsWithWhitespace: CreateProjectProps = {
        ...validProps,
        clientName: '  Familie Weber  ',
      };

      // Act
      const project = Project.create(propsWithWhitespace);

      // Assert
      expect(project.clientName).toBe('Familie Weber');
    });

    it('should trim whitespace from address', () => {
      // Arrange
      const propsWithWhitespace: CreateProjectProps = {
        ...validProps,
        address: '  Musterstraße 123  ',
      };

      // Act
      const project = Project.create(propsWithWhitespace);

      // Assert
      expect(project.address).toBe('Musterstraße 123');
    });
  });

  describe('withStatus', () => {
    it('should change status and return new instance', () => {
      // Arrange
      const project = Project.create(validProps);

      // Act
      const pausedProject = project.withStatus('paused');

      // Assert
      expect(pausedProject).not.toBe(project); // Immutability
      expect(pausedProject.status).toBe('paused');
      expect(project.status).toBe('active'); // Original unchanged
    });

    it('should update updatedAt when changing status', () => {
      // Arrange
      const project = Project.create(validProps);
      const originalUpdatedAt = project.updatedAt;

      // Wait a bit to ensure different timestamp
      const pausedProject = project.withStatus('paused');

      // Assert
      expect(pausedProject.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      );
    });

    it('should throw ValidationError for invalid status', () => {
      // Arrange
      const project = Project.create(validProps);

      // Act & Assert
      expect(() => project.withStatus('invalid' as ProjectStatus)).toThrow(
        ValidationError
      );
    });
  });

  describe('withClientInfo', () => {
    it('should update clientName and return new instance', () => {
      // Arrange
      const project = Project.create(validProps);

      // Act
      const updatedProject = project.withClientInfo({
        clientName: 'Familie Müller',
      });

      // Assert
      expect(updatedProject).not.toBe(project); // Immutability
      expect(updatedProject.clientName).toBe('Familie Müller');
      expect(project.clientName).toBeUndefined(); // Original unchanged
    });

    it('should update address and return new instance', () => {
      // Arrange
      const project = Project.create(validProps);

      // Act
      const updatedProject = project.withClientInfo({
        address: 'Neue Straße 456',
      });

      // Assert
      expect(updatedProject.address).toBe('Neue Straße 456');
    });

    it('should update both clientName and address', () => {
      // Arrange
      const project = Project.create(validProps);

      // Act
      const updatedProject = project.withClientInfo({
        clientName: 'Familie Müller',
        address: 'Neue Straße 456',
      });

      // Assert
      expect(updatedProject.clientName).toBe('Familie Müller');
      expect(updatedProject.address).toBe('Neue Straße 456');
    });
  });

  describe('withSyncedAt', () => {
    it('should update syncedAt and return new instance', () => {
      // Arrange
      const project = Project.create(validProps);
      const syncTime = new Date();

      // Act
      const syncedProject = project.withSyncedAt(syncTime);

      // Assert
      expect(syncedProject).not.toBe(project); // Immutability
      expect(syncedProject.syncedAt).toEqual(syncTime);
      expect(project.syncedAt).toBeUndefined(); // Original unchanged
    });
  });

  describe('isActive', () => {
    it('should return true when status is active', () => {
      const project = Project.create({ ...validProps, status: 'active' });
      expect(project.isActive).toBe(true);
    });

    it('should return false when status is not active', () => {
      const planningProject = Project.create({ ...validProps, status: 'planning' });
      const pausedProject = Project.create({ ...validProps, status: 'paused' });
      const completedProject = Project.create({ ...validProps, status: 'completed' });

      expect(planningProject.isActive).toBe(false);
      expect(pausedProject.isActive).toBe(false);
      expect(completedProject.isActive).toBe(false);
    });
  });

  describe('isFromAsana', () => {
    it('should return true when asanaGid is set', () => {
      const project = Project.create({
        ...validProps,
        asanaGid: '1234567890',
      });
      expect(project.isFromAsana).toBe(true);
    });

    it('should return false when asanaGid is not set', () => {
      const project = Project.create(validProps);
      expect(project.isFromAsana).toBe(false);
    });
  });

  describe('canBeModified', () => {
    it('should return true when status is not completed', () => {
      const planningProject = Project.create({ ...validProps, status: 'planning' });
      const activeProject = Project.create({ ...validProps, status: 'active' });
      const pausedProject = Project.create({ ...validProps, status: 'paused' });

      expect(planningProject.canBeModified).toBe(true);
      expect(activeProject.canBeModified).toBe(true);
      expect(pausedProject.canBeModified).toBe(true);
    });

    it('should return false when status is completed', () => {
      const completedProject = Project.create({ ...validProps, status: 'completed' });
      expect(completedProject.canBeModified).toBe(false);
    });
  });
});
