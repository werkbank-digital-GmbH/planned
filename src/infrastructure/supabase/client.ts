/**
 * Supabase Browser Client
 *
 * Verwendet in Client Components.
 * Hat Zugriff auf Browser-Cookies.
 *
 * @example
 * ```ts
 * // In einem Client Component
 * 'use client';
 *
 * import { createBrowserSupabaseClient } from '@/infrastructure/supabase/client';
 *
 * export function MyComponent() {
 *   const supabase = createBrowserSupabaseClient();
 *
 *   const handleClick = async () => {
 *     const { data } = await supabase.from('users').select('*');
 *     console.log(data);
 *   };
 *
 *   return <button onClick={handleClick}>Load Users</button>;
 * }
 * ```
 */

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';
import { clientEnv } from '@/lib/env';

/**
 * Erstellt einen Supabase-Client für Client Components (Browser)
 *
 * Dieser Client:
 * - Hat Zugriff auf Browser-Cookies
 * - Verwendet den anon/publishable key
 * - Respektiert RLS Policies
 * - Wird im Browser ausgeführt
 *
 * WICHTIG: Dieser Client sollte in Client Components verwendet werden.
 * Er wird NICHT für Server Components, Server Actions oder API Routes verwendet.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

/**
 * Singleton-Instance für den Browser-Client
 *
 * Kann verwendet werden, wenn derselbe Client in mehreren Stellen benötigt wird.
 * Achtung: Nur im Client-Code verwenden!
 */
let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

export function getBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserSupabaseClient kann nur im Browser verwendet werden');
  }

  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }

  return browserClient;
}

/**
 * Type Export für den Browser Client
 */
export type BrowserSupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
