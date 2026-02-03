import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Absence } from '@/domain/entities/Absence';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type {
  IIntegrationCredentialsRepository,
  IntegrationCredentialsData,
} from '@/application/ports/repositories/IIntegrationCredentialsRepository';
import type { IIntegrationMappingRepository } from '@/application/ports/repositories/IIntegrationMappingRepository';
import type { AsanaAbsenceTask, IAsanaService } from '@/application/ports/services/IAsanaService';

import { SyncAsanaAbsencesUseCase } from '../SyncAsanaAbsencesUseCase';

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

const createMockCredentialsRepo = (): IIntegrationCredentialsRepository => ({
  findByTenantId: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  clearAsanaCredentials: vi.fn(),
  hasAsanaConnection: vi.fn(),
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

const createMockAbsenceRepo = (): IAbsenceRepository => ({
  findById: vi.fn(),
  findByAsanaGid: vi.fn(),
  findByUser: vi.fn(),
  findByUserAndDateRange: vi.fn(),
  findByUsersAndDateRange: vi.fn(),
  findByTenantAndDateRange: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

const createMockCredentials = (overrides: Partial<IntegrationCredentialsData> = {}): IntegrationCredentialsData => ({
  id: 'cred-1',
  tenantId: 'tenant-1',
  asanaAccessToken: 'encrypted-token',
  asanaRefreshToken: 'encrypted-refresh',
  asanaTokenExpiresAt: new Date(Date.now() + 3600000),
  asanaWorkspaceId: 'workspace-1',
  asanaSourceProjectId: 'source-1',
  asanaTeamId: 'team-1',
  asanaWebhookSecret: null,
  asanaProjectStatusFieldId: null,
  asanaSollProduktionFieldId: null,
  asanaSollMontageFieldId: null,
  asanaPhaseBereichFieldId: null,
  asanaPhaseBudgetHoursFieldId: null,
  asanaPhaseTypeFieldId: null,
  asanaZuordnungFieldId: null,
  asanaSollStundenFieldId: null,
  asanaIstStundenFieldId: null,
  asanaAbsenceProjectId: 'absence-project-1',
  asanaAddressFieldId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockAbsenceTask = (overrides: Partial<AsanaAbsenceTask> = {}): AsanaAbsenceTask => ({
  gid: 'task-1',
  name: 'Urlaub - Max',
  completed: false,
  start_on: '2024-03-01',
  due_on: '2024-03-05',
  assignee: {
    gid: 'asana-user-1',
  },
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('SyncAsanaAbsencesUseCase', () => {
  let useCase: SyncAsanaAbsencesUseCase;
  let mockAsanaService: ReturnType<typeof createMockAsanaService>;
  let mockCredentialsRepo: ReturnType<typeof createMockCredentialsRepo>;
  let mockMappingRepo: ReturnType<typeof createMockMappingRepo>;
  let mockAbsenceRepo: ReturnType<typeof createMockAbsenceRepo>;

  beforeEach(() => {
    mockAsanaService = createMockAsanaService();
    mockCredentialsRepo = createMockCredentialsRepo();
    mockMappingRepo = createMockMappingRepo();
    mockAbsenceRepo = createMockAbsenceRepo();

    useCase = new SyncAsanaAbsencesUseCase(
      mockAsanaService,
      mockCredentialsRepo,
      mockMappingRepo,
      mockAbsenceRepo
    );

    // Default mock setup
    vi.mocked(mockCredentialsRepo.findByTenantId).mockResolvedValue(createMockCredentials());
  });

  it('should create absence from Asana task', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      gid: 'task-1',
      name: 'Urlaub',
      start_on: '2024-03-01',
      due_on: '2024-03-05',
      assignee: { gid: 'asana-user-1' },
    });

    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
    });

    // Assert
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);

    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'planned-user-1',
        type: 'vacation',
        asanaGid: 'task-1',
      })
    );
  });

  it('should detect absence type "vacation" from task name', async () => {
    // Arrange
    const task = createMockAbsenceTask({ name: 'Urlaub - Max Müller' });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    await useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' });

    // Assert
    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'vacation' })
    );
  });

  it('should detect absence type "sick" from task name', async () => {
    // Arrange
    const task = createMockAbsenceTask({ name: 'Krank' });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    await useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' });

    // Assert
    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sick' })
    );
  });

  it('should detect absence type "training" from task name', async () => {
    // Arrange
    const task = createMockAbsenceTask({ name: 'Fortbildung React Kurs' });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    await useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' });

    // Assert
    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'training' })
    );
  });

  it('should detect absence type "holiday" from task name', async () => {
    // Arrange
    const task = createMockAbsenceTask({ name: 'Feiertag - Weihnachten' });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    await useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' });

    // Assert
    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'holiday' })
    );
  });

  it('should use "other" type for unrecognized task names', async () => {
    // Arrange - use a name that doesn't contain any keywords
    const task = createMockAbsenceTask({ name: 'Arzttermin vormittags' });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    await useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' });

    // Assert
    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'other' })
    );
  });

  it('should skip tasks without assignee', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      assignee: null,
    });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
    });

    // Assert
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(result.errors).toContainEqual(expect.stringContaining('Kein Assignee'));
    expect(mockAbsenceRepo.save).not.toHaveBeenCalled();
  });

  it('should skip tasks where assignee has no mapping', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      assignee: { gid: 'unmapped-user' },
    });
    const userMapping = new Map([['other-user', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
    });

    // Assert
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(result.errors).toContainEqual(expect.stringContaining('User nicht gemappt'));
    expect(mockAbsenceRepo.save).not.toHaveBeenCalled();
  });

  it('should update existing absence by asanaGid', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      gid: 'existing-task',
      name: 'Urlaub verlängert',
      start_on: '2024-03-01',
      due_on: '2024-03-10', // Extended
    });

    const existingAbsence = Absence.create({
      id: 'absence-1',
      tenantId: 'tenant-1',
      userId: 'planned-user-1',
      type: 'vacation',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-05'),
      notes: 'Urlaub',
      asanaGid: 'existing-task',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(existingAbsence);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
    });

    // Assert
    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(mockAbsenceRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'absence-1',
      })
    );
    expect(mockAbsenceRepo.save).not.toHaveBeenCalled();
  });

  it('should skip completed tasks', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      completed: true,
    });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
    });

    // Assert
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(mockAbsenceRepo.save).not.toHaveBeenCalled();
  });

  it('should skip tasks without dates', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      start_on: null,
      due_on: null,
    });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      accessToken: 'token',
    });

    // Assert
    expect(result.skipped).toBe(1);
    expect(result.errors).toContainEqual(expect.stringContaining('Kein Datum'));
    expect(mockAbsenceRepo.save).not.toHaveBeenCalled();
  });

  it('should throw error when no absence project configured', async () => {
    // Arrange
    vi.mocked(mockCredentialsRepo.findByTenantId).mockResolvedValue(
      createMockCredentials({ asanaAbsenceProjectId: null })
    );

    // Act & Assert
    await expect(
      useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' })
    ).rejects.toThrow('Kein Abwesenheiten-Projekt konfiguriert');
  });

  it('should throw error when no user mappings exist', async () => {
    // Arrange
    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(new Map());

    // Act & Assert
    await expect(
      useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' })
    ).rejects.toThrow('Keine User-Mappings vorhanden');
  });

  it('should use start_on as end date when due_on is missing', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      start_on: '2024-03-01',
      due_on: null,
    });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    await useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' });

    // Assert
    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-01'),
      })
    );
  });

  it('should use due_on as start date when start_on is missing', async () => {
    // Arrange
    const task = createMockAbsenceTask({
      start_on: null,
      due_on: '2024-03-05',
    });
    const userMapping = new Map([['asana-user-1', 'planned-user-1']]);

    vi.mocked(mockMappingRepo.getAsMap).mockResolvedValue(userMapping);
    vi.mocked(mockAsanaService.getAbsenceTasks).mockResolvedValue([task]);
    vi.mocked(mockAbsenceRepo.findByAsanaGid).mockResolvedValue(null);

    // Act
    await useCase.execute({ tenantId: 'tenant-1', accessToken: 'token' });

    // Assert
    expect(mockAbsenceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date('2024-03-05'),
        endDate: new Date('2024-03-05'),
      })
    );
  });
});
