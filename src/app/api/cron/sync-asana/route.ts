import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { SyncAsanaProjectsUseCase } from '@/application/use-cases/integrations/SyncAsanaProjectsUseCase';

import { SupabaseIntegrationCredentialsRepository } from '@/infrastructure/repositories/SupabaseIntegrationCredentialsRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseProjectRepository } from '@/infrastructure/repositories/SupabaseProjectRepository';
import { SupabaseSyncLogRepository } from '@/infrastructure/repositories/SupabaseSyncLogRepository';
import { AsanaService } from '@/infrastructure/services/AsanaService';
import { EncryptionService } from '@/infrastructure/services/EncryptionService';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

/**
 * GET /api/cron/sync-asana
 *
 * Cron-Job für automatischen Asana-Sync.
 * Wird alle 15 Minuten ausgeführt (via Vercel Cron oder externem Service).
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
    .select('tenant_id')
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

  // Use Case erstellen
  const syncUseCase = new SyncAsanaProjectsUseCase(
    asanaService,
    projectRepository,
    projectPhaseRepository,
    credentialsRepository,
    syncLogRepository,
    encryptionService
  );

  // Sync für alle Tenants durchführen
  const results: Array<{
    tenantId: string;
    success: boolean;
    projectsCreated?: number;
    projectsUpdated?: number;
    phasesCreated?: number;
    phasesUpdated?: number;
    error?: string;
  }> = [];

  for (const cred of credentials) {
    try {
      const result = await syncUseCase.execute(cred.tenant_id);
      results.push({
        tenantId: cred.tenant_id,
        success: result.success,
        projectsCreated: result.projectsCreated,
        projectsUpdated: result.projectsUpdated,
        phasesCreated: result.phasesCreated,
        phasesUpdated: result.phasesUpdated,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      });
    } catch (error) {
      console.error(`Sync failed for tenant ${cred.tenant_id}:`, error);
      results.push({
        tenantId: cred.tenant_id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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
