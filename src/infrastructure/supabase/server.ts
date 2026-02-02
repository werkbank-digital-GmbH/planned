/**
 * Supabase Server Client
 *
 * Verwendet in Server Components (RSC).
 * Hat read-only Zugriff auf Cookies.
 *
 * @example
 * ```ts
 * // In einem Server Component
 * import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
 *
 * export default async function Page() {
 *   const supabase = await createServerSupabaseClient();
 *   const { data } = await supabase.from('users').select('*');
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/lib/database.types';
import { env } from '@/lib/env-server';

/**
 * Erstellt einen Supabase-Client für Server Components
 *
 * Dieser Client:
 * - Hat read-only Zugriff auf Cookies
 * - Verwendet den anon/publishable key
 * - Respektiert RLS Policies
 * - Ist für Server Components (RSC) optimiert
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // In Server Components sind Cookies read-only
            // setAll wird hier ignoriert (kein Fehler)
          }
        },
      },
    }
  );
}

/**
 * Type Export für den Server Client
 */
export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
