/**
 * Supabase Action Client
 *
 * Verwendet in Server Actions.
 * Hat read/write Zugriff auf Cookies.
 *
 * @example
 * ```ts
 * // In einer Server Action
 * 'use server';
 *
 * import { createActionSupabaseClient } from '@/infrastructure/supabase/actions';
 *
 * export async function updateUserProfile(formData: FormData) {
 *   const supabase = await createActionSupabaseClient();
 *
 *   const { error } = await supabase
 *     .from('users')
 *     .update({ full_name: formData.get('name') })
 *     .eq('id', userId);
 *
 *   if (error) throw error;
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/lib/database.types';
import { env } from '@/lib/env';

/**
 * Erstellt einen Supabase-Client für Server Actions
 *
 * Dieser Client:
 * - Hat read/write Zugriff auf Cookies
 * - Verwendet den anon/publishable key
 * - Respektiert RLS Policies
 * - Ist für Server Actions optimiert
 *
 * Der Unterschied zum Server Client ist, dass hier Cookies
 * geschrieben werden können (z.B. für Auth-Token-Refresh).
 */
export async function createActionSupabaseClient() {
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Type Export für den Action Client
 */
export type ActionSupabaseClient = Awaited<ReturnType<typeof createActionSupabaseClient>>;
