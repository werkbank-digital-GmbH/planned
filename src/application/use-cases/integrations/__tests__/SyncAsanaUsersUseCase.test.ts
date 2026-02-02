import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '@/domain/entities/User';

import type { IIntegrationMappingRepository } from '@/application/ports/repositories/IIntegrationMappingRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import type { AsanaUser, IAsanaService } from '@/application/ports/services/IAsanaService';

import { SyncAsanaUsersUseCase } from '../SyncAsanaUsersUseCase';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const createMockAsanaService = (): IAsanaService => ({
  getWorkspaceUsers: vi.fn(),
  getTeams: vi.fn(),
  getTeamProjects: vi.fn(),
  getSections: vi.fn(),
  getTasksFromProject: vi.fn(),
  getAbsenceTasks: vi.fn(),
  getCustomFields: vi.fn(),
  getProjectCustomFields: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  getWorkspaces: vi.fn(),
  getProjects: vi.fn(),
  getProjectDetails: vi.fn(),
  mapTaskToPhase: vi.fn(),
  mapToProject: vi.fn(),
  mapSectionToPhase: vi.fn(),
  updateSection: vi.fn(),
  updateProjectCustomField: vi.fn(),
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  verifyWebhookSignature: vi.fn(),
});

const createMockMappingRepo = (): IIntegrationMappingRepository => ({
  findById: vi.fn(),
  upsert: vi.fn(),
  findByTenantAndType: vi.fn(),
  deleteByType: vi.fn(),
  getAsMap: vi.fn(),
  findByExternalId: vi.fn(),
  delete: vi.fn(),
});

const createMockUserRepo = (): IUserRepository => ({
  findActiveByTenant: vi.fn(),
  findById: vi.fn(),
  findByIds: vi.fn(),
  findAllByTenant: vi.fn(),
  findByAuthId: vi.fn(),
  findByAuthIdWithTenant: vi.fn(),
  findByEmailAndTenant: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

const createMockUser = (overrides: Partial<{
  id: string;
  authId: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'planer' | 'gewerblich';
  weeklyHours: number;
  isActive: boolean;
}> = {}): User => {
  return User.create({
    id: overrides.id ?? 'user-1',
    authId: overrides.authId ?? 'auth-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    email: overrides.email ?? 'max.mueller@firma.de',
    fullName: overrides.fullName ?? 'Max Müller',
    role: overrides.role ?? 'planer',
    weeklyHours: overrides.weeklyHours ?? 40,
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const createMockAsanaUser = (overrides: Partial<AsanaUser> = {}): AsanaUser => ({
  gid: 'asana-user-1',
  name: 'Max Mueller',
  email: 'max.mueller@asana.com',
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('SyncAsanaUsersUseCase', () => {
  let useCase: SyncAsanaUsersUseCase;
  let mockAsanaService: ReturnType<typeof createMockAsanaService>;
  let mockMappingRepo: ReturnType<typeof createMockMappingRepo>;
  let mockUserRepo: ReturnType<typeof createMockUserRepo>;

  beforeEach(() => {
    mockAsanaService = createMockAsanaService();
    mockMappingRepo = createMockMappingRepo();
    mockUserRepo = createMockUserRepo();

    useCase = new SyncAsanaUsersUseCase(
      mockAsanaService,
      mockMappingRepo,
      mockUserRepo
    );
  });

  it('should match users by email prefix', async () => {
    // Arrange
    const plannedUser = createMockUser({
      id: 'user-1',
      email: 'max.mueller@firma.de',
      fullName: 'Max Müller',
    });

    const asanaUser = createMockAsanaUser({
      gid: 'asana-1',
      email: 'max.mueller@asana.com',
      name: 'Max Mueller',
    });

    vi.mocked(mockAsanaService.getWorkspaceUsers).mockResolvedValue([asanaUser]);
    vi.mocked(mockUserRepo.findActiveByTenant).mockResolvedValue([plannedUser]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
      workspaceId: 'workspace-1',
    });

    // Assert
    expect(result.matched).toBe(1);
    expect(result.unmatchedPlanned).toBe(0);
    expect(result.unmatchedAsana).toBe(0);
    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0]).toMatchObject({
      plannedUserId: 'user-1',
      asanaUserGid: 'asana-1',
    });
  });

  it('should save mappings to integration_mappings', async () => {
    // Arrange
    const plannedUser = createMockUser({
      id: 'user-1',
      email: 'anna.schmidt@company.de',
    });

    const asanaUser = createMockAsanaUser({
      gid: 'asana-2',
      email: 'anna.schmidt@company.com',
      name: 'Anna Schmidt',
    });

    vi.mocked(mockAsanaService.getWorkspaceUsers).mockResolvedValue([asanaUser]);
    vi.mocked(mockUserRepo.findActiveByTenant).mockResolvedValue([plannedUser]);

    // Act
    await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
      workspaceId: 'workspace-1',
    });

    // Assert
    expect(mockMappingRepo.deleteByType).toHaveBeenCalledWith('tenant-1', 'asana', 'user');
    expect(mockMappingRepo.upsert).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      service: 'asana',
      mappingType: 'user',
      externalId: 'asana-2',
      internalId: 'user-1',
      externalName: 'Anna Schmidt',
    });
  });

  it('should return unmatched users in result', async () => {
    // Arrange
    const plannedUser1 = createMockUser({
      id: 'user-1',
      email: 'matched@firma.de',
      fullName: 'Matched User',
    });
    const plannedUser2 = createMockUser({
      id: 'user-2',
      email: 'unmatched@firma.de',
      fullName: 'Unmatched User',
    });

    const asanaUser1 = createMockAsanaUser({
      gid: 'asana-1',
      email: 'matched@asana.com',
      name: 'Matched User',
    });
    const asanaUser2 = createMockAsanaUser({
      gid: 'asana-2',
      email: 'other@asana.com',
      name: 'Other User',
    });

    vi.mocked(mockAsanaService.getWorkspaceUsers).mockResolvedValue([asanaUser1, asanaUser2]);
    vi.mocked(mockUserRepo.findActiveByTenant).mockResolvedValue([plannedUser1, plannedUser2]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
      workspaceId: 'workspace-1',
    });

    // Assert
    expect(result.matched).toBe(1);
    expect(result.unmatchedPlanned).toBe(1);
    expect(result.unmatchedAsana).toBe(1);

    // Unmatched planned user should be in mappings with null asana fields
    const unmatchedMapping = result.mappings.find((m) => m.plannedUserId === 'user-2');
    expect(unmatchedMapping).toBeDefined();
    expect(unmatchedMapping?.asanaUserGid).toBeNull();
  });

  it('should handle empty user lists', async () => {
    // Arrange
    vi.mocked(mockAsanaService.getWorkspaceUsers).mockResolvedValue([]);
    vi.mocked(mockUserRepo.findActiveByTenant).mockResolvedValue([]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
      workspaceId: 'workspace-1',
    });

    // Assert
    expect(result.matched).toBe(0);
    expect(result.unmatchedPlanned).toBe(0);
    expect(result.unmatchedAsana).toBe(0);
    expect(result.mappings).toHaveLength(0);
  });

  it('should skip Asana users without email', async () => {
    // Arrange
    const plannedUser = createMockUser({
      id: 'user-1',
      email: 'test@firma.de',
    });

    const asanaUserWithEmail = createMockAsanaUser({
      gid: 'asana-1',
      email: 'test@asana.com',
      name: 'Test User',
    });
    const asanaUserWithoutEmail = createMockAsanaUser({
      gid: 'asana-2',
      email: undefined as unknown as string,
      name: 'No Email User',
    });

    vi.mocked(mockAsanaService.getWorkspaceUsers).mockResolvedValue([
      asanaUserWithEmail,
      asanaUserWithoutEmail,
    ]);
    vi.mocked(mockUserRepo.findActiveByTenant).mockResolvedValue([plannedUser]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
      workspaceId: 'workspace-1',
    });

    // Assert
    expect(result.matched).toBe(1);
    // User without email is not counted in unmatchedAsana
    expect(result.unmatchedAsana).toBe(0);
  });

  it('should match users with different email domains', async () => {
    // Arrange
    const plannedUser = createMockUser({
      id: 'user-1',
      email: 'john.doe@internal.company.de',
      fullName: 'John Doe',
    });

    const asanaUser = createMockAsanaUser({
      gid: 'asana-1',
      email: 'john.doe@external.company.com',
      name: 'John Doe',
    });

    vi.mocked(mockAsanaService.getWorkspaceUsers).mockResolvedValue([asanaUser]);
    vi.mocked(mockUserRepo.findActiveByTenant).mockResolvedValue([plannedUser]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
      workspaceId: 'workspace-1',
    });

    // Assert
    expect(result.matched).toBe(1);
    expect(result.mappings[0].asanaUserGid).toBe('asana-1');
  });

  it('should not match users with different email prefixes', async () => {
    // Arrange
    const plannedUser = createMockUser({
      id: 'user-1',
      email: 'max.mueller@firma.de',
    });

    const asanaUser = createMockAsanaUser({
      gid: 'asana-1',
      email: 'max.schmidt@firma.de',
      name: 'Max Schmidt',
    });

    vi.mocked(mockAsanaService.getWorkspaceUsers).mockResolvedValue([asanaUser]);
    vi.mocked(mockUserRepo.findActiveByTenant).mockResolvedValue([plannedUser]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
      workspaceId: 'workspace-1',
    });

    // Assert
    expect(result.matched).toBe(0);
    expect(result.unmatchedPlanned).toBe(1);
    expect(result.unmatchedAsana).toBe(1);
  });
});
