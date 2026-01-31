import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { SyncTimeTacAbsencesUseCase } from '@/application/use-cases/integrations/SyncTimeTacAbsencesUseCase';
import { SyncTimeTacTimeEntriesUseCase } from '@/application/use-cases/integrations/SyncTimeTacTimeEntriesUseCase';

import { SupabaseAbsenceConflictRepository } from '@/infrastructure/repositories/SupabaseAbsenceConflictRepository';
import { SupabaseAbsenceRepository } from '@/infrastructure/repositories/SupabaseAbsenceRepository';
import { SupabaseAllocationRepository } from '@/infrastructure/repositories/SupabaseAllocationRepository';
import { SupabaseIntegrationCredentialsRepository } from '@/infrastructure/repositories/SupabaseIntegrationCredentialsRepository';
import { SupabaseSyncLogRepository } from '@/infrastructure/repositories/SupabaseSyncLogRepository';
import { SupabaseTimeEntryRepository } from '@/infrastructure/repositories/SupabaseTimeEntryRepository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { EncryptionService } from '@/infrastructure/services/EncryptionService';
import { TimeTacService } from '@/infrastructure/services/TimeTacService';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

/**
 * GET /api/cron/sync-timetac
 *
 * Cron-Job für automatischen TimeTac-Sync.
 * Wird alle 30 Minuten ausgeführt (via Vercel Cron oder externem Service).
 *
 * Synchronisiert:
 * - Abwesenheiten (nächste 90 Tage)
 * - Zeiteinträge (letzte 7 Tage)
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
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Environment Variables prüfen
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    console.error('Missing ENCRYPTION_KEY for TimeTac sync');
    return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
  }

  const supabase = createAdminSupabaseClient();

  // Alle Tenants mit aktiver TimeTac-Integration finden
  const { data: credentials, error: queryError } = await supabase
    .from('integration_credentials')
    .select('tenant_id')
    .not('timetac_api_token', 'is', null);

  if (queryError) {
    console.error('Error fetching tenants:', queryError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!credentials || credentials.length === 0) {
    return NextResponse.json({
      message: 'No tenants with TimeTac connection found',
      synced: 0,
      results: [],
    });
  }

  // Services erstellen
  const timetacService = new TimeTacService();
  const encryptionService = new EncryptionService(encryptionKey);
  const credentialsRepository = new SupabaseIntegrationCredentialsRepository(supabase);
  const userRepository = new SupabaseUserRepository(supabase);
  const absenceRepository = new SupabaseAbsenceRepository(supabase);
  const allocationRepository = new SupabaseAllocationRepository(supabase);
  const conflictRepository = new SupabaseAbsenceConflictRepository(supabase);
  const timeEntryRepository = new SupabaseTimeEntryRepository(supabase);
  const syncLogRepository = new SupabaseSyncLogRepository(supabase);

  // Use Cases erstellen
  const syncAbsencesUseCase = new SyncTimeTacAbsencesUseCase(
    timetacService,
    absenceRepository,
    userRepository,
    credentialsRepository,
    syncLogRepository,
    encryptionService,
    allocationRepository,
    conflictRepository
  );

  const syncTimeEntriesUseCase = new SyncTimeTacTimeEntriesUseCase(
    timetacService,
    timeEntryRepository,
    userRepository,
    credentialsRepository,
    syncLogRepository,
    encryptionService
  );

  // Sync für alle Tenants durchführen
  const results: Array<{
    tenantId: string;
    absences: { success: boolean; created?: number; updated?: number; conflictsDetected?: number; error?: string };
    timeEntries: { success: boolean; created?: number; updated?: number; error?: string };
  }> = [];

  for (const cred of credentials) {
    const tenantResult = {
      tenantId: cred.tenant_id,
      absences: { success: false as boolean, created: 0, updated: 0, conflictsDetected: 0, error: undefined as string | undefined },
      timeEntries: { success: false as boolean, created: 0, updated: 0, error: undefined as string | undefined },
    };

    // Absences synchronisieren
    try {
      const absencesResult = await syncAbsencesUseCase.execute(cred.tenant_id);
      tenantResult.absences = {
        success: absencesResult.success,
        created: absencesResult.created,
        updated: absencesResult.updated,
        conflictsDetected: absencesResult.conflictsDetected,
        error: absencesResult.errors.length > 0 ? absencesResult.errors.join('; ') : undefined,
      };
    } catch (error) {
      console.error(`Absence sync failed for tenant ${cred.tenant_id}:`, error);
      tenantResult.absences.error =
        error instanceof Error ? error.message : 'Unknown error';
    }

    // TimeEntries synchronisieren
    try {
      const entriesResult = await syncTimeEntriesUseCase.execute(cred.tenant_id);
      tenantResult.timeEntries = {
        success: entriesResult.success,
        created: entriesResult.created,
        updated: entriesResult.updated,
        error: entriesResult.errors.length > 0 ? entriesResult.errors.join('; ') : undefined,
      };
    } catch (error) {
      console.error(`TimeEntry sync failed for tenant ${cred.tenant_id}:`, error);
      tenantResult.timeEntries.error =
        error instanceof Error ? error.message : 'Unknown error';
    }

    results.push(tenantResult);
  }

  const successCount = results.filter(
    (r) => r.absences.success && r.timeEntries.success
  ).length;

  return NextResponse.json({
    message: `Sync completed for ${successCount}/${results.length} tenants`,
    synced: results.length,
    successful: successCount,
    failed: results.length - successCount,
    results,
  });
}
