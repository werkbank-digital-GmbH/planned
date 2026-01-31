/**
 * Supabase Admin Client
 *
 * Verwendet für administrative Operationen wie Cron Jobs, Sync-Tasks etc.
 * WICHTIG: Dieser Client umgeht RLS und sollte nur serverseitig verwendet werden!
 *
 * @example
 * ```ts
 * // In einem Cron Job oder Admin-API-Route
 * import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';
 *
 * export async function syncFromAsana() {
 *   const supabase = createAdminSupabaseClient();
 *
 *   // Zugriff auf alle Daten ohne RLS-Einschränkungen
 *   const { data: tenants } = await supabase
 *     .from('tenants')
 *     .select('*');
 *
 *   for (const tenant of tenants ?? []) {
 *     // Sync-Logik...
 *   }
 * }
 * ```
 */

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';
import { env } from '@/lib/env';

/**
 * Erstellt einen Supabase Admin-Client mit Service Role Key
 *
 * WARNUNG: Dieser Client:
 * - Umgeht alle RLS Policies
 * - Hat vollen Datenbank-Zugriff
 * - Sollte NIEMALS im Client-Code verwendet werden
 * - Sollte NIEMALS in Server Components verwendet werden
 *
 * Verwendungszwecke:
 * - Cron Jobs (TimeTac/Asana Sync)
 * - Webhooks von externen Services
 * - Admin-Operationen
 * - Datenbank-Migrationen
 */
export function createAdminSupabaseClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ist erforderlich für den Admin-Client');
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Admin-Client verwendet keine Session-Persistenz
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Type Export für den Admin Client
 */
export type AdminSupabaseClient = ReturnType<typeof createAdminSupabaseClient>;
