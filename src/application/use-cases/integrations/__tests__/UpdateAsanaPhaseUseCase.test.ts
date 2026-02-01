import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IAsanaService } from '@/application/ports/services/IAsanaService';

import {
  UpdateAsanaPhaseUseCase,
  type IPhaseRepository,
  type IIntegrationCredentialsRepository,
} from '../UpdateAsanaPhaseUseCase';

describe('UpdateAsanaPhaseUseCase', () => {
  // Mocks
  const mockPhaseRepo = {
    findById: vi.fn(),
    update: vi.fn(),
  };

  const mockCredentialsRepo = {
    findByTenantId: vi.fn(),
    update: vi.fn(),
  };

  const mockAsanaService = {
    updateSection: vi.fn(),
    updateProjectCustomField: vi.fn(),
    refreshAccessToken: vi.fn(),
    exchangeCodeForToken: vi.fn(),
    getWorkspaces: vi.fn(),
    getProjects: vi.fn(),
    getProjectDetails: vi.fn(),
    getSections: vi.fn(),
    mapToProject: vi.fn(),
    mapSectionToPhase: vi.fn(),
  };

  let useCase: UpdateAsanaPhaseUseCase;

  // Test fixtures
  const createTestPhase = (overrides = {}) => ({
    id: 'phase-123',
    tenantId: 'tenant-123',
    projectId: 'project-456',
    asanaGid: 'asana-section-789',
    name: 'Produktion Phase 1',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-28'),
    budgetHours: 100,
    project: {
      id: 'project-456',
      asanaGid: 'asana-project-456',
    },
    ...overrides,
  });

  const createTestCredentials = (overrides = {}) => ({
    asanaAccessToken: 'access-token-123',
    asanaRefreshToken: 'refresh-token-456',
    asanaTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1h in future
    asanaPhaseBudgetHoursFieldId: 'custom-field-789',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    useCase = new UpdateAsanaPhaseUseCase(
      mockPhaseRepo as unknown as IPhaseRepository,
      mockCredentialsRepo as unknown as IIntegrationCredentialsRepository,
      mockAsanaService as unknown as IAsanaService
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should update phase locally and in Asana', async () => {
      mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
      mockPhaseRepo.update.mockResolvedValue(undefined);
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.updateSection.mockResolvedValue(undefined);

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Phase Name' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.synced).toBe(true);
        expect(result.data.asanaGid).toBe('asana-section-789');
      }

      expect(mockPhaseRepo.update).toHaveBeenCalledWith('phase-123', {
        name: 'New Phase Name',
        updatedAt: expect.any(Date),
      });

      expect(mockAsanaService.updateSection).toHaveBeenCalledWith(
        'asana-section-789',
        { name: 'New Phase Name' },
        'access-token-123'
      );
    });

    it('should update budget hours as custom field in Asana', async () => {
      mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
      mockPhaseRepo.update.mockResolvedValue(undefined);
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.updateProjectCustomField.mockResolvedValue(undefined);

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { budgetHours: 150 },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.synced).toBe(true);
      }

      expect(mockAsanaService.updateProjectCustomField).toHaveBeenCalledWith(
        'asana-project-456',
        'custom-field-789',
        150,
        'access-token-123'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE NOT FOUND / UNAUTHORIZED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Phase Not Found / Unauthorized', () => {
    it('should return failure when phase not found', async () => {
      mockPhaseRepo.findById.mockResolvedValue(null);

      const result = await useCase.execute({
        phaseId: 'non-existent',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PHASE_NOT_FOUND');
      }
    });

    it('should return failure when tenant does not match', async () => {
      mockPhaseRepo.findById.mockResolvedValue(
        createTestPhase({ tenantId: 'other-tenant' })
      );

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NO ASANA CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('No Asana Connection', () => {
    it('should update locally only when phase has no asanaGid', async () => {
      mockPhaseRepo.findById.mockResolvedValue(
        createTestPhase({ asanaGid: undefined })
      );
      mockPhaseRepo.update.mockResolvedValue(undefined);

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.synced).toBe(false);
      }

      expect(mockPhaseRepo.update).toHaveBeenCalled();
      expect(mockCredentialsRepo.findByTenantId).not.toHaveBeenCalled();
      expect(mockAsanaService.updateSection).not.toHaveBeenCalled();
    });

    it('should update locally only when no Asana credentials', async () => {
      mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
      mockPhaseRepo.update.mockResolvedValue(undefined);
      mockCredentialsRepo.findByTenantId.mockResolvedValue(null);

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.synced).toBe(false);
        expect(result.data.asanaGid).toBe('asana-section-789');
      }

      expect(mockAsanaService.updateSection).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN REFRESH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Token Refresh', () => {
    it('should refresh expired token and persist new tokens', async () => {
      mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
      mockPhaseRepo.update.mockResolvedValue(undefined);
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
      mockAsanaService.updateSection.mockResolvedValue(undefined);
      mockCredentialsRepo.update.mockResolvedValue(undefined);

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.synced).toBe(true);
      }

      expect(mockAsanaService.refreshAccessToken).toHaveBeenCalledWith('refresh-token-456');
      expect(mockCredentialsRepo.update).toHaveBeenCalledWith('tenant-123', {
        asanaAccessToken: 'new-access-token',
        asanaRefreshToken: 'new-refresh-token',
        asanaTokenExpiresAt: expect.any(Date),
      });
      expect(mockAsanaService.updateSection).toHaveBeenCalledWith(
        'asana-section-789',
        { name: 'New Name' },
        'new-access-token'
      );
    });

    it('should skip sync when token refresh fails', async () => {
      mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
      mockPhaseRepo.update.mockResolvedValue(undefined);
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({
          asanaTokenExpiresAt: new Date(Date.now() - 1000), // Expired
        })
      );
      mockAsanaService.refreshAccessToken.mockRejectedValue(
        new Error('Token refresh failed')
      );

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.synced).toBe(false);
      }

      // Local update still happened
      expect(mockPhaseRepo.update).toHaveBeenCalled();
      // Asana update was skipped
      expect(mockAsanaService.updateSection).not.toHaveBeenCalled();
    });

    it('should skip sync when no refresh token available', async () => {
      mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
      mockPhaseRepo.update.mockResolvedValue(undefined);
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({
          asanaTokenExpiresAt: new Date(Date.now() - 1000), // Expired
          asanaRefreshToken: null,
        })
      );

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.synced).toBe(false);
      }

      expect(mockAsanaService.refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL SERVICE ERRORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('External Service Errors', () => {
    it('should return failure when Asana API fails', async () => {
      mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
      mockPhaseRepo.update.mockResolvedValue(undefined);
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockAsanaService.updateSection.mockRejectedValue(
        new Error('Asana API nicht erreichbar')
      );

      const result = await useCase.execute({
        phaseId: 'phase-123',
        tenantId: 'tenant-123',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYNC_ERROR');
        expect(result.error.message).toBe('Asana API nicht erreichbar');
      }
    });
  });
});
