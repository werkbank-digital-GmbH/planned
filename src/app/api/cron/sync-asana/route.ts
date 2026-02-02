import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { SyncAsanaAbsencesUseCase } from '@/application/use-cases/integrations/SyncAsanaAbsencesUseCase';
import { SyncAsanaTaskPhasesUseCase } from '@/application/use-cases/integrations/SyncAsanaTaskPhasesUseCase';
import { SyncAsanaUsersUseCase } from '@/application/use-cases/integrations/SyncAsanaUsersUseCase';

import { SupabaseAbsenceRepository } from '@/infrastructure/repositories/SupabaseAbsenceRepository';
import { SupabaseIntegrationCredentialsRepository } from '@/infrastructure/repositories/SupabaseIntegrationCredentialsRepository';
import { SupabaseIntegrationMappingRepository } from '@/infrastructure/repositories/SupabaseIntegrationMappingRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseProjectRepository } from '@/infrastructure/repositories/SupabaseProjectRepository';
import { SupabaseSyncLogRepository } from '@/infrastructure/repositories/SupabaseSyncLogRepository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { AsanaService } from '@/infrastructure/services/AsanaService';
import { EncryptionService } from '@/infrastructure/services/EncryptionService';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TenantSyncResult {
  tenantId: string;
  success: boolean;
  projects?: { created: number; updated: number };
  phases?: { created: number; updated: number; skipped: number };
  absences?: { created: number; updated: number; skipped: number };
  users?: { matched: number; unmatchedPlanned: number; unmatchedAsana: number };
  errors?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/cron/sync-asana
 *
 * Cron-Job für automatischen Asana-Sync.
 * Wird alle 15 Minuten ausgeführt (via Vercel Cron oder externem Service).
 *
 * Führt für jeden Tenant mit aktiver Asana-Integration durch:
 * 1. Task-Phasen Sync (Projekte + Phasen aus Tasks)
 * 2. Abwesenheiten Sync (wenn Absence-Projekt konfiguriert)
 * 3. User-Mapping aktualisieren
 *
 * Erfordert CRON_SECRET Header für Authentifizierung.
 */
export async function GET() {
  // Verify cron secret
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Cron not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Environment Variables prüfen
  const clientId = process.env.ASANA_CLIENT_ID;
  const clientSecret = process.env.ASANA_CLIENT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !encryptionKey) {
    console.error('Missing required environment variables for Asana sync');
    return NextResponse.json(
      { error: 'Configuration missing' },
      { status: 500 }
    );
  }

  const supabase = createAdminSupabaseClient();

  // Alle Tenants mit aktiver Asana-Integration finden
  const { data: credentials, error: queryError } = await supabase
    .from('integration_credentials')
    .select('tenant_id, asana_workspace_id, asana_absence_project_id')
    .not('asana_access_token', 'is', null);

  if (queryError) {
    console.error('Error fetching tenants:', queryError);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }

  if (!credentials || credentials.length === 0) {
    return NextResponse.json({
      message: 'No tenants with Asana connection found',
      synced: 0,
      results: [],
    });
  }

  // Services erstellen
  const asanaService = new AsanaService({ clientId, clientSecret });
  const encryptionService = new EncryptionService(encryptionKey);
  const credentialsRepository = new SupabaseIntegrationCredentialsRepository(supabase);
  const projectRepository = new SupabaseProjectRepository(supabase);
  const projectPhaseRepository = new SupabaseProjectPhaseRepository(supabase);
  const syncLogRepository = new SupabaseSyncLogRepository(supabase);
  const mappingRepository = new SupabaseIntegrationMappingRepository(supabase);
  const absenceRepository = new SupabaseAbsenceRepository(supabase);
  const userRepository = new SupabaseUserRepository(supabase);

  // Use Cases erstellen
  const syncTaskPhasesUseCase = new SyncAsanaTaskPhasesUseCase(
    asanaService,
    projectRepository,
    projectPhaseRepository,
    credentialsRepository,
    syncLogRepository,
    encryptionService
  );

  const syncAbsencesUseCase = new SyncAsanaAbsencesUseCase(
    asanaService,
    credentialsRepository,
    mappingRepository,
    absenceRepository
  );

  const syncUsersUseCase = new SyncAsanaUsersUseCase(
    asanaService,
    mappingRepository,
    userRepository
  );

  // Sync für alle Tenants durchführen
  const results: TenantSyncResult[] = [];

  for (const cred of credentials) {
    const tenantId = cred.tenant_id;
    const tenantResult: TenantSyncResult = {
      tenantId,
      success: true,
      errors: [],
    };

    try {
      // ─────────────────────────────────────────────────────────────────────
      // 1. Task-Phasen Sync (Projekte + Phasen)
      // ─────────────────────────────────────────────────────────────────────
      const taskSyncResult = await syncTaskPhasesUseCase.execute(tenantId);

      tenantResult.projects = {
        created: taskSyncResult.projectsCreated,
        updated: taskSyncResult.projectsUpdated,
      };
      tenantResult.phases = {
        created: taskSyncResult.phasesCreated,
        updated: taskSyncResult.phasesUpdated,
        skipped: taskSyncResult.tasksSkipped,
      };

      if (!taskSyncResult.success) {
        tenantResult.success = false;
      }
      if (taskSyncResult.errors.length > 0) {
        tenantResult.errors?.push(...taskSyncResult.errors.map((e) => `[TaskPhases] ${e}`));
      }

      // ─────────────────────────────────────────────────────────────────────
      // 2. User-Mapping aktualisieren
      // ─────────────────────────────────────────────────────────────────────
      if (cred.asana_workspace_id) {
        try {
          const accessToken = await getAccessToken(
            tenantId,
            credentialsRepository,
            encryptionService,
            asanaService
          );

          const userSyncResult = await syncUsersUseCase.execute({
            tenantId,
            accessToken,
            workspaceId: cred.asana_workspace_id,
          });

          tenantResult.users = {
            matched: userSyncResult.matched,
            unmatchedPlanned: userSyncResult.unmatchedPlanned,
            unmatchedAsana: userSyncResult.unmatchedAsana,
          };
        } catch (error) {
          tenantResult.errors?.push(
            `[Users] ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          );
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // 3. Abwesenheiten Sync (wenn Absence-Projekt konfiguriert)
      // ─────────────────────────────────────────────────────────────────────
      if (cred.asana_absence_project_id) {
        try {
          const accessToken = await getAccessToken(
            tenantId,
            credentialsRepository,
            encryptionService,
            asanaService
          );

          const absenceSyncResult = await syncAbsencesUseCase.execute({
            tenantId,
            accessToken,
          });

          tenantResult.absences = {
            created: absenceSyncResult.created,
            updated: absenceSyncResult.updated,
            skipped: absenceSyncResult.skipped,
          };

          if (absenceSyncResult.errors.length > 0) {
            tenantResult.errors?.push(...absenceSyncResult.errors.map((e) => `[Absences] ${e}`));
          }
        } catch (error) {
          tenantResult.errors?.push(
            `[Absences] ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          );
        }
      }
    } catch (error) {
      console.error(`Sync failed for tenant ${tenantId}:`, error);
      tenantResult.success = false;
      tenantResult.errors?.push(error instanceof Error ? error.message : 'Unknown error');
    }

    // Leere Errors-Array entfernen für saubereres JSON
    if (tenantResult.errors?.length === 0) {
      delete tenantResult.errors;
    }

    results.push(tenantResult);
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    message: `Sync completed for ${successCount}/${results.length} tenants`,
    synced: results.length,
    successful: successCount,
    failed: results.length - successCount,
    results,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt Access Token für einen Tenant, mit automatischem Refresh bei Ablauf.
 */
async function getAccessToken(
  tenantId: string,
  credentialsRepository: SupabaseIntegrationCredentialsRepository,
  encryptionService: EncryptionService,
  asanaService: AsanaService
): Promise<string> {
  const credentials = await credentialsRepository.findByTenantId(tenantId);

  if (!credentials?.asanaAccessToken) {
    throw new Error('Asana ist nicht verbunden');
  }

  let accessToken = encryptionService.decrypt(credentials.asanaAccessToken);

  // Token abgelaufen? -> Refresh versuchen
  if (
    credentials.asanaTokenExpiresAt &&
    new Date(credentials.asanaTokenExpiresAt) <= new Date()
  ) {
    if (!credentials.asanaRefreshToken) {
      throw new Error('Token abgelaufen und kein Refresh Token vorhanden');
    }

    const refreshToken = encryptionService.decrypt(credentials.asanaRefreshToken);

    try {
      const newTokens = await asanaService.refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;

      // Neue Tokens speichern
      await credentialsRepository.update(tenantId, {
        asanaAccessToken: encryptionService.encrypt(newTokens.access_token),
        asanaRefreshToken: newTokens.refresh_token
          ? encryptionService.encrypt(newTokens.refresh_token)
          : null,
        asanaTokenExpiresAt: newTokens.expires_in
          ? new Date(Date.now() + newTokens.expires_in * 1000)
          : null,
      });
    } catch {
      throw new Error('Token-Erneuerung fehlgeschlagen. Bitte erneut verbinden.');
    }
  }

  return accessToken;
}
