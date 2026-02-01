'use server';

/**
 * Integration Server Actions
 *
 * Server Actions für die Asana-Integration:
 * - Projekte aus Asana laden
 * - Ausgewählte Projekte synchronisieren
 * - Custom Field Mapping verwalten
 * - Projekt-Verknüpfung entfernen
 */

import { revalidatePath } from 'next/cache';

import type { UserRole } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';
import type { AsanaCustomFieldDefinition, AsanaProject } from '@/application/ports/services/IAsanaService';
import { SyncAsanaProjectsUseCase, SyncAsanaTaskPhasesUseCase, UnlinkProjectUseCase } from '@/application/use-cases/integrations';

import { SupabaseIntegrationCredentialsRepository } from '@/infrastructure/repositories/SupabaseIntegrationCredentialsRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseProjectRepository } from '@/infrastructure/repositories/SupabaseProjectRepository';
import { SupabaseSyncLogRepository } from '@/infrastructure/repositories/SupabaseSyncLogRepository';
import { AsanaService } from '@/infrastructure/services/AsanaService';
import { createEncryptionService } from '@/infrastructure/services/EncryptionService';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { env } from '@/lib/env';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AsanaProjectDTO {
  gid: string;
  name: string;
  archived: boolean;
  isSynced: boolean;
}

export interface FieldMappingDTO {
  projectNumberFieldId?: string;
  sollProduktionFieldId?: string;
  sollMontageFieldId?: string;
}

export interface CustomFieldDTO {
  gid: string;
  name: string;
  type: string;
}

export interface SyncResultDTO {
  created: number;
  updated: number;
  archived: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt den aktuellen User mit Tenant-Daten.
 */
async function getCurrentUserWithTenant() {
  const supabase = await createActionSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Nicht eingeloggt');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData) {
    throw new Error('User nicht gefunden');
  }

  return {
    id: userData.id,
    role: userData.role as UserRole,
    tenantId: userData.tenant_id,
  };
}

/**
 * Holt gültigen Asana Access Token.
 * Erneuert automatisch abgelaufene Tokens.
 */
async function getAsanaAccessToken(tenantId: string): Promise<string> {
  const supabase = await createActionSupabaseClient();
  const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);
  const encryptionService = createEncryptionService();

  const credentials = await credentialsRepo.findByTenantId(tenantId);

  if (!credentials?.asanaAccessToken) {
    throw new Error('Asana ist nicht verbunden');
  }

  // Token-Refresh bei Ablauf
  if (credentials.asanaTokenExpiresAt && credentials.asanaTokenExpiresAt < new Date()) {
    if (!credentials.asanaRefreshToken) {
      throw new Error('Asana-Token abgelaufen und kein Refresh-Token vorhanden');
    }

    const asanaService = createAsanaService();
    const decryptedRefreshToken = encryptionService.decrypt(credentials.asanaRefreshToken);

    try {
      const newTokens = await asanaService.refreshAccessToken(decryptedRefreshToken);

      // Neue Tokens verschlüsseln und speichern
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await credentialsRepo.update(tenantId, {
        asanaAccessToken: encryptionService.encrypt(newTokens.access_token),
        asanaRefreshToken: encryptionService.encrypt(newTokens.refresh_token),
        asanaTokenExpiresAt: expiresAt,
      });

      return newTokens.access_token;
    } catch {
      throw new Error('Asana-Token konnte nicht erneuert werden. Bitte erneut verbinden.');
    }
  }

  return encryptionService.decrypt(credentials.asanaAccessToken);
}

/**
 * Erstellt eine AsanaService-Instanz.
 */
function createAsanaService(): AsanaService {
  return new AsanaService({
    clientId: env.ASANA_CLIENT_ID || '',
    clientSecret: env.ASANA_CLIENT_SECRET || '',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ASANA PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle Projekte aus dem verbundenen Asana Workspace.
 */
export async function getAsanaProjects(): Promise<ActionResult<AsanaProjectDTO[]>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin können Integration verwalten
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);
    const projectRepo = new SupabaseProjectRepository(supabase);

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials?.asanaWorkspaceId) {
      return Result.fail('NOT_CONFIGURED', 'Kein Asana Workspace konfiguriert');
    }

    const accessToken = await getAsanaAccessToken(currentUser.tenantId);
    const asanaService = createAsanaService();

    // Projekte von Asana laden (inkl. archivierte)
    const asanaProjects = await asanaService.getProjects(
      credentials.asanaWorkspaceId,
      accessToken
    );

    // Lokale Projekte laden um Sync-Status zu prüfen
    const localProjects = await projectRepo.findAllByTenant(currentUser.tenantId);
    const syncedGids = new Set(
      localProjects.filter((p) => p.asanaGid).map((p) => p.asanaGid)
    );

    // Zu DTOs mappen
    const projectDTOs: AsanaProjectDTO[] = asanaProjects.map((p: AsanaProject) => ({
      gid: p.gid,
      name: p.name,
      archived: p.archived,
      isSynced: syncedGids.has(p.gid),
    }));

    return Result.ok(projectDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC SELECTED PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Synchronisiert ausgewählte Projekte aus Asana.
 */
export async function syncSelectedProjects(
  _projectGids: string[]
): Promise<ActionResult<SyncResultDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin können synchronisieren
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const asanaService = createAsanaService();
    const encryptionService = createEncryptionService();

    const projectRepo = new SupabaseProjectRepository(supabase);
    const projectPhaseRepo = new SupabaseProjectPhaseRepository(supabase);
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);
    const syncLogRepo = new SupabaseSyncLogRepository(supabase);

    const useCase = new SyncAsanaProjectsUseCase(
      asanaService,
      projectRepo,
      projectPhaseRepo,
      credentialsRepo,
      syncLogRepo,
      encryptionService
    );

    // TODO: In Zukunft nur ausgewählte Projekte synchronisieren
    // Aktuell synchronisiert der UseCase alle Projekte
    const result = await useCase.execute(currentUser.tenantId);

    // Paths revalidieren
    revalidatePath('/planung');
    revalidatePath('/einstellungen/integrationen');

    return Result.ok({
      created: result.projectsCreated,
      updated: result.projectsUpdated,
      archived: result.projectsArchived,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ASANA CUSTOM FIELDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt Custom Field Definitionen aus dem konfigurierten Asana Quell-Projekt.
 * Wenn kein Quell-Projekt konfiguriert ist, wird ein Fehler zurückgegeben.
 */
export async function getAsanaCustomFields(): Promise<ActionResult<CustomFieldDTO[]>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials?.asanaWorkspaceId) {
      return Result.fail('NOT_CONFIGURED', 'Kein Asana Workspace konfiguriert');
    }

    // Custom Fields vom Quell-Projekt laden, nicht vom Workspace
    if (!credentials.asanaSourceProjectId) {
      return Result.fail('NOT_CONFIGURED', 'Bitte zuerst ein Quell-Projekt auswählen');
    }

    const accessToken = await getAsanaAccessToken(currentUser.tenantId);
    const asanaService = createAsanaService();

    // Projekt-spezifische Custom Fields laden
    const customFields = await asanaService.getProjectCustomFields(
      credentials.asanaSourceProjectId,
      accessToken
    );

    const fieldDTOs: CustomFieldDTO[] = customFields.map((f: AsanaCustomFieldDefinition) => ({
      gid: f.gid,
      name: f.name,
      type: f.resource_subtype,
    }));

    return Result.ok(fieldDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET FIELD MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt das aktuelle Custom Field Mapping.
 */
export async function getFieldMapping(): Promise<ActionResult<FieldMappingDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials) {
      return Result.ok({});
    }

    return Result.ok({
      projectNumberFieldId: credentials.asanaProjectStatusFieldId ?? undefined,
      sollProduktionFieldId: credentials.asanaSollProduktionFieldId ?? undefined,
      sollMontageFieldId: credentials.asanaSollMontageFieldId ?? undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE FIELD MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Speichert das Custom Field Mapping.
 */
export async function saveFieldMapping(
  mapping: FieldMappingDTO
): Promise<ActionResult<FieldMappingDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    await credentialsRepo.update(currentUser.tenantId, {
      asanaProjectStatusFieldId: mapping.projectNumberFieldId ?? null,
      asanaSollProduktionFieldId: mapping.sollProduktionFieldId ?? null,
      asanaSollMontageFieldId: mapping.sollMontageFieldId ?? null,
    });

    return Result.ok(mapping);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UNLINK PROJECT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Entfernt die Asana-Verknüpfung eines Projekts.
 * Das Projekt bleibt in Planned erhalten.
 */
export async function unlinkProject(
  projectId: string
): Promise<ActionResult<{ projectId: string; projectName: string }>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const projectRepo = new SupabaseProjectRepository(supabase);

    const useCase = new UnlinkProjectUseCase(projectRepo);

    const result = await useCase.execute({
      projectId,
      tenantId: currentUser.tenantId,
    });

    if (!result.success) {
      return Result.fail(result.error.code, result.error.message);
    }

    // Paths revalidieren
    revalidatePath('/planung');
    revalidatePath('/einstellungen/integrationen');

    return Result.ok(result.data!);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISCONNECT ASANA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trennt die Asana-Verbindung.
 */
export async function disconnectAsana(): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Admin kann Integration trennen
    if (currentUser.role !== 'admin') {
      return Result.fail('FORBIDDEN', 'Nur Administratoren können Integrationen trennen');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    await credentialsRepo.update(currentUser.tenantId, {
      asanaAccessToken: null,
      asanaRefreshToken: null,
      asanaTokenExpiresAt: null,
      asanaWorkspaceId: null,
    });

    // Paths revalidieren
    revalidatePath('/einstellungen/integrationen');
    revalidatePath('/einstellungen/integrationen/asana');

    return Result.ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ASANA CONNECTION STATUS
// ═══════════════════════════════════════════════════════════════════════════

export interface AsanaConnectionStatus {
  connected: boolean;
  workspaceName?: string;
  lastSyncedAt?: string;
}

/**
 * Lädt den Asana-Verbindungsstatus.
 */
export async function getAsanaConnectionStatus(): Promise<ActionResult<AsanaConnectionStatus>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials?.asanaAccessToken) {
      return Result.ok({ connected: false });
    }

    return Result.ok({
      connected: true,
      workspaceName: credentials.asanaWorkspaceId ?? undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NEU: ASANA TEAMS
// ═══════════════════════════════════════════════════════════════════════════

export interface AsanaTeamDTO {
  gid: string;
  name: string;
}

/**
 * Lädt alle Teams aus dem verbundenen Asana Workspace.
 */
export async function getAsanaTeams(): Promise<ActionResult<AsanaTeamDTO[]>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials?.asanaWorkspaceId) {
      return Result.fail('NOT_CONFIGURED', 'Kein Asana Workspace konfiguriert');
    }

    const accessToken = await getAsanaAccessToken(currentUser.tenantId);
    const asanaService = createAsanaService();

    const teams = await asanaService.getTeams(credentials.asanaWorkspaceId, accessToken);

    const teamDTOs: AsanaTeamDTO[] = teams.map((t) => ({
      gid: t.gid,
      name: t.name,
    }));

    return Result.ok(teamDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NEU: ASANA TEAM PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle Projekte eines Asana Teams.
 */
export async function getAsanaTeamProjects(
  teamGid: string
): Promise<ActionResult<AsanaProjectDTO[]>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const accessToken = await getAsanaAccessToken(currentUser.tenantId);
    const asanaService = createAsanaService();

    const projects = await asanaService.getTeamProjects(teamGid, accessToken, {
      archived: false,
    });

    const projectDTOs: AsanaProjectDTO[] = projects.map((p) => ({
      gid: p.gid,
      name: p.name,
      archived: p.archived,
      isSynced: false, // Nicht relevant für Team-Projekte
    }));

    return Result.ok(projectDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NEU: ASANA SOURCE CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface AsanaSourceConfigDTO {
  sourceProjectId: string | null;
  sourceProjectName?: string;
  teamId: string | null;
  teamName?: string;
  phaseTypeFieldId: string | null;
  zuordnungFieldId: string | null;
  sollStundenFieldId: string | null;
}

/**
 * Lädt die aktuelle Asana Source-Konfiguration.
 */
export async function getAsanaSourceConfig(): Promise<ActionResult<AsanaSourceConfigDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials) {
      return Result.ok({
        sourceProjectId: null,
        teamId: null,
        phaseTypeFieldId: null,
        zuordnungFieldId: null,
        sollStundenFieldId: null,
      });
    }

    return Result.ok({
      sourceProjectId: credentials.asanaSourceProjectId,
      teamId: credentials.asanaTeamId,
      phaseTypeFieldId: credentials.asanaPhaseTypeFieldId,
      zuordnungFieldId: credentials.asanaZuordnungFieldId,
      sollStundenFieldId: credentials.asanaSollStundenFieldId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

/**
 * Speichert die Asana Source-Konfiguration.
 */
export async function saveAsanaSourceConfig(
  config: Omit<AsanaSourceConfigDTO, 'sourceProjectName' | 'teamName'>
): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (currentUser.role !== 'admin') {
      return Result.fail('FORBIDDEN', 'Nur Administratoren können die Konfiguration ändern');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    await credentialsRepo.update(currentUser.tenantId, {
      asanaSourceProjectId: config.sourceProjectId,
      asanaTeamId: config.teamId,
      asanaPhaseTypeFieldId: config.phaseTypeFieldId,
      asanaZuordnungFieldId: config.zuordnungFieldId,
      asanaSollStundenFieldId: config.sollStundenFieldId,
    });

    // Paths revalidieren
    revalidatePath('/einstellungen/integrationen/asana');

    return Result.ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NEU: SYNC TASK PHASES
// ═══════════════════════════════════════════════════════════════════════════

export interface TaskSyncResultDTO {
  projectsCreated: number;
  projectsUpdated: number;
  phasesCreated: number;
  phasesUpdated: number;
  tasksSkipped: number;
  errors: string[];
}

/**
 * Synchronisiert Phasen aus dem Asana Source-Projekt (Task-basiert).
 */
export async function syncAsanaTaskPhases(): Promise<ActionResult<TaskSyncResultDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const asanaService = createAsanaService();
    const encryptionService = createEncryptionService();

    const projectRepo = new SupabaseProjectRepository(supabase);
    const projectPhaseRepo = new SupabaseProjectPhaseRepository(supabase);
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);
    const syncLogRepo = new SupabaseSyncLogRepository(supabase);

    const useCase = new SyncAsanaTaskPhasesUseCase(
      asanaService,
      projectRepo,
      projectPhaseRepo,
      credentialsRepo,
      syncLogRepo,
      encryptionService
    );

    const result = await useCase.execute(currentUser.tenantId);

    // Paths revalidieren
    revalidatePath('/planung');
    revalidatePath('/einstellungen/integrationen');
    revalidatePath('/einstellungen/integrationen/asana');

    if (!result.success) {
      return Result.fail('SYNC_FAILED', result.errors.join(', '));
    }

    return Result.ok({
      projectsCreated: result.projectsCreated,
      projectsUpdated: result.projectsUpdated,
      phasesCreated: result.phasesCreated,
      phasesUpdated: result.phasesUpdated,
      tasksSkipped: result.tasksSkipped,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
