/**
 * Supabase Client Exports
 *
 * Zentrale Export-Datei für alle Supabase-Clients.
 *
 * @example
 * ```ts
 * // Server Component
 * import { createServerSupabaseClient } from '@/infrastructure/supabase';
 *
 * // Client Component
 * import { createBrowserSupabaseClient } from '@/infrastructure/supabase';
 *
 * // Server Action
 * import { createActionSupabaseClient } from '@/infrastructure/supabase';
 *
 * // Admin/Cron
 * import { createAdminSupabaseClient } from '@/infrastructure/supabase';
 * ```
 */

// Server Components Client
export { createServerSupabaseClient, type ServerSupabaseClient } from './server';

// Browser/Client Components Client
export {
  createBrowserSupabaseClient,
  getBrowserSupabaseClient,
  type BrowserSupabaseClient,
} from './client';

// Server Actions Client
export { createActionSupabaseClient, type ActionSupabaseClient } from './actions';

// Admin Client (Service Role)
export { createAdminSupabaseClient, type AdminSupabaseClient } from './admin';

// Middleware Client
export { createMiddlewareClient, type MiddlewareSupabaseClient } from './middleware';
