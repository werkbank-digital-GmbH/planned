'use server';

/**
 * Integration Server Actions
 *
 * Server Actions für die Asana- und TimeTac-Integration:
 * - Projekte aus Asana laden
 * - Ausgewählte Projekte synchronisieren
 * - Custom Field Mapping verwalten
 * - Projekt-Verknüpfung entfernen
 * - TimeTac Projekt-Mapping verwalten
 */

import { revalidatePath } from 'next/cache';

import type { UserRole } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';
import type { AsanaCustomFieldDefinition, AsanaProject } from '@/application/ports/services/IAsanaService';
import type { TimeTacProject } from '@/application/ports/services/ITimeTacService';
import { ConnectTimeTacUseCase, SyncAsanaProjectsUseCase, UnlinkProjectUseCase } from '@/application/use-cases/integrations';

import { SupabaseIntegrationCredentialsRepository } from '@/infrastructure/repositories/SupabaseIntegrationCredentialsRepository';
import { SupabaseIntegrationMappingRepository } from '@/infrastructure/repositories/SupabaseIntegrationMappingRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseProjectRepository } from '@/infrastructure/repositories/SupabaseProjectRepository';
import { SupabaseSyncLogRepository } from '@/infrastructure/repositories/SupabaseSyncLogRepository';
import { AsanaService } from '@/infrastructure/services/AsanaService';
import { createEncryptionService } from '@/infrastructure/services/EncryptionService';
import { TimeTacService } from '@/infrastructure/services/TimeTacService';
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
 * Lädt alle Custom Field Definitionen aus dem Asana Workspace.
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

    const accessToken = await getAsanaAccessToken(currentUser.tenantId);
    const asanaService = createAsanaService();

    const customFields = await asanaService.getCustomFields(
      credentials.asanaWorkspaceId,
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
// CONNECT TIMETAC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verbindet TimeTac mit einem API-Key.
 */
export async function connectTimeTac(
  apiKey: string
): Promise<ActionResult<{ accountName: string }>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Admin kann Integration einrichten
    if (currentUser.role !== 'admin') {
      return Result.fail('FORBIDDEN', 'Nur Administratoren können Integrationen einrichten');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);
    const encryptionService = createEncryptionService();
    const timetacService = new TimeTacService();

    const useCase = new ConnectTimeTacUseCase(
      timetacService,
      credentialsRepo,
      encryptionService
    );

    const result = await useCase.execute(currentUser.tenantId, apiKey);

    // Paths revalidieren
    revalidatePath('/einstellungen/integrationen');
    revalidatePath('/einstellungen/integrationen/timetac');

    return Result.ok({ accountName: result.accountName ?? '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISCONNECT TIMETAC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trennt die TimeTac-Verbindung.
 */
export async function disconnectTimeTac(): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Admin kann Integration trennen
    if (currentUser.role !== 'admin') {
      return Result.fail('FORBIDDEN', 'Nur Administratoren können Integrationen trennen');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    await credentialsRepo.update(currentUser.tenantId, {
      timetacApiToken: null,
      timetacAccountId: null,
    });

    // Paths revalidieren
    revalidatePath('/einstellungen/integrationen');
    revalidatePath('/einstellungen/integrationen/timetac');

    return Result.ok(undefined);
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
// GET TIMETAC CONNECTION STATUS
// ═══════════════════════════════════════════════════════════════════════════

export interface TimeTacConnectionStatus {
  connected: boolean;
  accountId?: string;
}

/**
 * Lädt den TimeTac-Verbindungsstatus.
 */
export async function getTimeTacConnectionStatus(): Promise<ActionResult<TimeTacConnectionStatus>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials?.timetacApiToken) {
      return Result.ok({ connected: false });
    }

    return Result.ok({
      connected: true,
      accountId: credentials.timetacAccountId ?? undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMETAC TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TimeTacProjectDTO {
  id: number;
  name: string;
  number?: string;
  active: boolean;
}

export interface LocalProjectWithPhasesDTO {
  id: string;
  name: string;
  phases: Array<{
    id: string;
    name: string;
    bereich: string;
  }>;
}

export interface ProjectMappingDTO {
  timetacProjectId: number;
  plannedPhaseId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET TIMETAC PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle Projekte aus TimeTac.
 */
export async function getTimeTacProjects(): Promise<ActionResult<TimeTacProjectDTO[]>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const credentialsRepo = new SupabaseIntegrationCredentialsRepository(supabase);
    const encryptionService = createEncryptionService();

    const credentials = await credentialsRepo.findByTenantId(currentUser.tenantId);

    if (!credentials?.timetacApiToken) {
      return Result.fail('NOT_CONFIGURED', 'TimeTac ist nicht verbunden');
    }

    const apiKey = encryptionService.decrypt(credentials.timetacApiToken);
    const timetacService = new TimeTacService();

    const projects = await timetacService.getProjects(apiKey);

    const projectDTOs: TimeTacProjectDTO[] = projects.map((p: TimeTacProject) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      active: p.active,
    }));

    return Result.ok(projectDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET TIMETAC PROJECT MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt das aktuelle TimeTac Projekt-Mapping.
 * Gibt ein Record zurück: TimeTac Project ID → Planned Phase ID
 */
export async function getTimeTacProjectMapping(): Promise<ActionResult<Record<number, string>>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const mappingRepo = new SupabaseIntegrationMappingRepository(supabase);

    const mappings = await mappingRepo.findByTenantAndType(
      currentUser.tenantId,
      'timetac',
      'project'
    );

    const mappingRecord: Record<number, string> = {};
    for (const m of mappings) {
      mappingRecord[parseInt(m.externalId, 10)] = m.internalId;
    }

    return Result.ok(mappingRecord);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE TIMETAC PROJECT MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Speichert ein TimeTac Projekt-Mapping.
 */
export async function saveTimeTacProjectMapping(
  mapping: ProjectMappingDTO
): Promise<ActionResult<ProjectMappingDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const mappingRepo = new SupabaseIntegrationMappingRepository(supabase);

    await mappingRepo.upsert({
      tenantId: currentUser.tenantId,
      service: 'timetac',
      mappingType: 'project',
      externalId: String(mapping.timetacProjectId),
      internalId: mapping.plannedPhaseId,
    });

    // Pfade revalidieren
    revalidatePath('/einstellungen/integrationen');

    return Result.ok(mapping);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE TIMETAC PROJECT MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Löscht ein TimeTac Projekt-Mapping.
 */
export async function deleteTimeTacProjectMapping(
  timetacProjectId: number
): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const mappingRepo = new SupabaseIntegrationMappingRepository(supabase);

    const existing = await mappingRepo.findByExternalId(
      currentUser.tenantId,
      'timetac',
      'project',
      String(timetacProjectId)
    );

    if (existing) {
      await mappingRepo.delete(existing.id);
    }

    // Pfade revalidieren
    revalidatePath('/einstellungen/integrationen');

    return Result.ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET LOCAL PROJECTS WITH PHASES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle lokalen Projekte mit ihren Phasen.
 */
export async function getLocalProjectsWithPhases(): Promise<
  ActionResult<LocalProjectWithPhasesDTO[]>
> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const projectRepo = new SupabaseProjectRepository(supabase);
    const phaseRepo = new SupabaseProjectPhaseRepository(supabase);

    const projects = await projectRepo.findActiveByTenant(currentUser.tenantId);

    const result: LocalProjectWithPhasesDTO[] = [];

    for (const project of projects) {
      const phases = await phaseRepo.findActiveByProject(project.id);

      result.push({
        id: project.id,
        name: project.name,
        phases: phases.map((p) => ({
          id: p.id,
          name: p.name,
          bereich: p.bereich,
        })),
      });
    }

    return Result.ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
