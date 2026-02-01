import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Project } from '@/domain/entities/Project';

import type { IProjectRepository } from '@/application/ports/repositories/IProjectRepository';

import { UnlinkProjectUseCase } from '../UnlinkProjectUseCase';

describe('UnlinkProjectUseCase', () => {
  // Mock repository
  const mockProjectRepo = {
    findById: vi.fn(),
    findByAsanaGid: vi.fn(),
    findAllByTenant: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  };

  let useCase: UnlinkProjectUseCase;

  // Test fixtures
  const createTestProject = (overrides = {}) =>
    Project.create({
      id: 'project-123',
      tenantId: 'tenant-123',
      name: 'Schulhaus Muster',
      status: 'active',
      asanaGid: 'asana-gid-456',
      syncedAt: new Date('2026-01-15'),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-15'),
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();

    useCase = new UnlinkProjectUseCase(
      mockProjectRepo as unknown as IProjectRepository
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should unlink project from Asana', async () => {
      const project = createTestProject();
      mockProjectRepo.findById.mockResolvedValue(project);
      mockProjectRepo.update.mockResolvedValue(undefined);

      const result = await useCase.execute({
        projectId: 'project-123',
        tenantId: 'tenant-123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectId).toBe('project-123');
        expect(result.data.projectName).toBe('Schulhaus Muster');
      }

      expect(mockProjectRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'project-123',
          asanaGid: undefined,
          syncedAt: undefined,
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NOT FOUND
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Not Found', () => {
    it('should return failure when project not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);

      const result = await useCase.execute({
        projectId: 'non-existent',
        tenantId: 'tenant-123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }

      expect(mockProjectRepo.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Authorization', () => {
    it('should return failure when tenant does not match', async () => {
      const project = createTestProject({ tenantId: 'other-tenant' });
      mockProjectRepo.findById.mockResolvedValue(project);

      const result = await useCase.execute({
        projectId: 'project-123',
        tenantId: 'tenant-123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
        expect(result.error.message).toBe('Keine Berechtigung für dieses Projekt');
      }

      expect(mockProjectRepo.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NOT LINKED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Not Linked', () => {
    it('should return failure when project is not linked to Asana', async () => {
      const project = createTestProject({ asanaGid: undefined });
      mockProjectRepo.findById.mockResolvedValue(project);

      const result = await useCase.execute({
        projectId: 'project-123',
        tenantId: 'tenant-123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_LINKED');
        expect(result.error.message).toBe('Projekt ist nicht mit Asana verknüpft');
      }

      expect(mockProjectRepo.update).not.toHaveBeenCalled();
    });
  });
});
