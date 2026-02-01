import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Project } from '@/domain/entities/Project';

import type {
  IIntegrationCredentialsRepository,
  IProjectPhaseRepository,
  IProjectRepository,
  ISyncLogRepository,
} from '@/application/ports/repositories';
import type { IAsanaService } from '@/application/ports/services';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';

import { SyncAsanaProjectsUseCase } from '../SyncAsanaProjectsUseCase';

describe('SyncAsanaProjectsUseCase', () => {
  // Mocks
  const mockAsanaService = {
    getProjects: vi.fn(),
    getSections: vi.fn(),
    mapToProject: vi.fn(),
    mapSectionToPhase: vi.fn(),
    refreshAccessToken: vi.fn(),
    exchangeCodeForToken: vi.fn(),
    getWorkspaces: vi.fn(),
    getProjectDetails: vi.fn(),
    updateSection: vi.fn(),
    updateProjectCustomField: vi.fn(),
  };

  const mockProjectRepo = {
    findById: vi.fn(),
    findByAsanaGid: vi.fn(),
    findAllByTenant: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  };

  const mockPhaseRepo = {
    findById: vi.fn(),
    findByAsanaGid: vi.fn(),
    findAllByProject: vi.fn(),
    findActiveByProject: vi.fn(),
    findByBereich: vi.fn(),
    findReadyForHardDelete: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    updateDates: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockCredentialsRepo = {
    findByTenantId: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };

  const mockSyncLogRepo = {
    create: vi.fn(),
    update: vi.fn(),
    findByTenantAndService: vi.fn(),
    findLatestByTenant: vi.fn(),
  };

  const mockEncryptionService = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  };

  let useCase: SyncAsanaProjectsUseCase;

  // Test fixtures
  const createTestCredentials = (overrides = {}) => ({
    asanaAccessToken: 'encrypted-access-token',
    asanaRefreshToken: 'encrypted-refresh-token',
    asanaTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1h in future
    asanaWorkspaceId: 'workspace-123',
    asanaProjectStatusFieldId: 'field-1',
    asanaSollProduktionFieldId: 'field-2',
    asanaSollMontageFieldId: 'field-3',
    asanaPhaseBereichFieldId: 'field-4',
    asanaPhaseBudgetHoursFieldId: 'field-5',
    ...overrides,
  });

  const createAsanaProject = (overrides = {}) => ({
    gid: 'asana-proj-1',
    name: 'Schulhaus Muster',
    archived: false,
    custom_fields: [],
    ...overrides,
  });

  const createAsanaSection = (overrides = {}) => ({
    gid: 'asana-sec-1',
    name: 'Produktion Phase 1',
    ...overrides,
  });

  const createTestProject = (overrides = {}) =>
    Project.create({
      id: 'project-123',
      tenantId: 'tenant-123',
      name: 'Schulhaus Muster',
      status: 'active',
      asanaGid: 'asana-proj-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockSyncLogRepo.create.mockResolvedValue({ id: 'sync-log-1' });
    mockSyncLogRepo.update.mockResolvedValue(undefined);
    mockEncryptionService.decrypt.mockImplementation((val) => `decrypted-${val}`);
    mockEncryptionService.encrypt.mockImplementation((val) => `encrypted-${val}`);

    useCase = new SyncAsanaProjectsUseCase(
      mockAsanaService as unknown as IAsanaService,
      mockProjectRepo as unknown as IProjectRepository,
      mockPhaseRepo as unknown as IProjectPhaseRepository,
      mockCredentialsRepo as unknown as IIntegrationCredentialsRepository,
      mockSyncLogRepo as unknown as ISyncLogRepository,
      mockEncryptionService as unknown as IEncryptionService
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should sync new project from Asana', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.getProjects.mockResolvedValue([createAsanaProject()]);
      mockAsanaService.mapToProject.mockReturnValue({
        asanaGid: 'asana-proj-1',
        name: 'Schulhaus Muster',
        isArchived: false,
      });
      mockProjectRepo.findByAsanaGid.mockResolvedValue(null); // Project does not exist
      mockProjectRepo.save.mockResolvedValue(undefined);
      mockAsanaService.getSections.mockResolvedValue([]);
      mockProjectRepo.findAllByTenant.mockResolvedValue([]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.projectsCreated).toBe(1);
      expect(result.projectsUpdated).toBe(0);
      expect(mockProjectRepo.save).toHaveBeenCalled();
      expect(mockSyncLogRepo.update).toHaveBeenCalledWith('sync-log-1', {
        status: 'success',
        result: expect.any(Object),
        completedAt: expect.any(Date),
      });
    });

    it('should update existing project from Asana', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.getProjects.mockResolvedValue([createAsanaProject()]);
      mockAsanaService.mapToProject.mockReturnValue({
        asanaGid: 'asana-proj-1',
        name: 'Schulhaus Muster Updated',
        isArchived: false,
      });
      mockProjectRepo.findByAsanaGid.mockResolvedValue(createTestProject());
      mockProjectRepo.update.mockResolvedValue(undefined);
      mockAsanaService.getSections.mockResolvedValue([]);
      mockProjectRepo.findAllByTenant.mockResolvedValue([createTestProject()]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.projectsCreated).toBe(0);
      expect(result.projectsUpdated).toBe(1);
      expect(mockProjectRepo.update).toHaveBeenCalled();
    });

    it('should sync phases (sections) for projects', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.getProjects.mockResolvedValue([createAsanaProject()]);
      mockAsanaService.mapToProject.mockReturnValue({
        asanaGid: 'asana-proj-1',
        name: 'Schulhaus Muster',
        isArchived: false,
      });
      mockProjectRepo.findByAsanaGid.mockResolvedValue(createTestProject());
      mockProjectRepo.update.mockResolvedValue(undefined);
      mockAsanaService.getSections.mockResolvedValue([
        createAsanaSection(),
        createAsanaSection({ gid: 'asana-sec-2', name: 'Montage Phase 1' }),
      ]);
      mockAsanaService.mapSectionToPhase.mockImplementation((section) => ({
        asanaGid: section.gid,
        name: section.name,
        bereich: section.name.includes('Montage') ? 'montage' : 'produktion',
        budgetHours: undefined,
      }));
      mockPhaseRepo.findByAsanaGid.mockResolvedValue(null);
      mockPhaseRepo.save.mockResolvedValue(undefined);
      mockProjectRepo.findAllByTenant.mockResolvedValue([createTestProject()]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.phasesCreated).toBe(2);
      expect(mockPhaseRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should archive projects no longer in Asana', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.getProjects.mockResolvedValue([]); // No projects in Asana
      mockProjectRepo.findAllByTenant.mockResolvedValue([createTestProject()]);
      mockProjectRepo.updateStatus.mockResolvedValue(undefined);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.projectsArchived).toBe(1);
      expect(mockProjectRepo.updateStatus).toHaveBeenCalledWith('project-123', 'completed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NO ASANA CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('No Asana Connection', () => {
    it('should fail when no credentials', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(null);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Asana ist nicht verbunden');
      expect(mockSyncLogRepo.update).toHaveBeenCalledWith('sync-log-1', {
        status: 'failed',
        errorMessage: 'Asana ist nicht verbunden',
        completedAt: expect.any(Date),
      });
    });

    it('should fail when no access token', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({ asanaAccessToken: null })
      );

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Asana ist nicht verbunden');
    });

    it('should fail when no workspace configured', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({ asanaWorkspaceId: null })
      );

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Kein Asana Workspace konfiguriert');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN REFRESH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Token Refresh', () => {
    it('should refresh expired token and persist new tokens', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({
          asanaTokenExpiresAt: new Date(Date.now() - 1000), // Expired
        })
      );
      mockAsanaService.refreshAccessToken.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      });
      mockCredentialsRepo.update.mockResolvedValue(undefined);
      mockAsanaService.getProjects.mockResolvedValue([]);
      mockProjectRepo.findAllByTenant.mockResolvedValue([]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(mockAsanaService.refreshAccessToken).toHaveBeenCalled();
      expect(mockCredentialsRepo.update).toHaveBeenCalledWith('tenant-123', {
        asanaAccessToken: 'encrypted-new-access-token',
        asanaRefreshToken: 'encrypted-new-refresh-token',
        asanaTokenExpiresAt: expect.any(Date),
      });
    });

    it('should fail when token expired and no refresh token', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({
          asanaTokenExpiresAt: new Date(Date.now() - 1000), // Expired
          asanaRefreshToken: null,
        })
      );

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Token abgelaufen und kein Refresh Token vorhanden');
    });

    it('should fail when token refresh fails', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({
          asanaTokenExpiresAt: new Date(Date.now() - 1000), // Expired
        })
      );
      mockAsanaService.refreshAccessToken.mockRejectedValue(
        new Error('Refresh failed')
      );

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Token-Erneuerung fehlgeschlagen. Bitte erneut verbinden.');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL SERVICE ERRORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('External Service Errors', () => {
    it('should handle Asana API errors gracefully', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.getProjects.mockRejectedValue(
        new Error('Asana API nicht erreichbar')
      );

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Asana API nicht erreichbar');
      expect(mockSyncLogRepo.update).toHaveBeenCalledWith('sync-log-1', {
        status: 'failed',
        errorMessage: 'Asana API nicht erreichbar',
        completedAt: expect.any(Date),
      });
    });

    it('should continue sync when single project fails', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.getProjects.mockResolvedValue([
        createAsanaProject({ gid: 'proj-1', name: 'Project 1' }),
        createAsanaProject({ gid: 'proj-2', name: 'Project 2' }),
      ]);
      mockAsanaService.mapToProject
        .mockReturnValueOnce({
          asanaGid: 'proj-1',
          name: 'Project 1',
          isArchived: false,
        })
        .mockImplementationOnce(() => {
          throw new Error('Mapping failed');
        });
      mockProjectRepo.findByAsanaGid.mockResolvedValue(null);
      mockProjectRepo.save.mockResolvedValue(undefined);
      mockAsanaService.getSections.mockResolvedValue([]);
      mockProjectRepo.findAllByTenant.mockResolvedValue([]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true); // Still succeeds overall
      expect(result.projectsCreated).toBe(1);
      expect(result.errors).toContain('Projekt Project 2: Mapping failed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCHIVED PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Archived Projects', () => {
    it('should mark archived Asana projects as completed', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.getProjects.mockResolvedValue([
        createAsanaProject({ archived: true }),
      ]);
      mockAsanaService.mapToProject.mockReturnValue({
        asanaGid: 'asana-proj-1',
        name: 'Archived Project',
        isArchived: true,
      });
      mockProjectRepo.findByAsanaGid.mockResolvedValue(null);
      mockProjectRepo.save.mockResolvedValue(undefined);
      mockAsanaService.getSections.mockResolvedValue([]);
      mockProjectRepo.findAllByTenant.mockResolvedValue([]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(mockProjectRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });
});
