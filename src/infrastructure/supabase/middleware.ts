/**
 * Supabase Middleware Client
 *
 * Verwendet in der Next.js Middleware.
 * Spezielles Cookie-Handling für Middleware-Kontext.
 *
 * @example
 * ```ts
 * // In middleware.ts
 * import { createMiddlewareClient } from '@/infrastructure/supabase/middleware';
 *
 * export async function middleware(request: NextRequest) {
 *   const { supabase, response } = createMiddlewareClient(request);
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 *   return response;
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env-server';

/**
 * Erstellt einen Supabase-Client für Middleware
 *
 * Dieser Client:
 * - Hat spezielles Cookie-Handling für Middleware
 * - Gibt sowohl den Client als auch die Response zurück
 * - Die Response muss am Ende der Middleware zurückgegeben werden
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, response };
}

/**
 * Type Export für den Middleware Client
 */
export type MiddlewareSupabaseClient = ReturnType<typeof createMiddlewareClient>['supabase'];
