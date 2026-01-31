/**
 * Next.js Middleware für Route Protection
 *
 * Implementiert die Zugriffssteuerung basierend auf:
 * - Authentifizierungsstatus
 * - Benutzerrolle (admin, planer, gewerblich)
 *
 * @see FEATURES.md F1.3 für vollständige Spezifikation
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Öffentliche Routen - kein Login erforderlich
 */
const PUBLIC_ROUTES = ['/login', '/reset-password', '/update-password'];

/**
 * Auth-Routen - nur für NICHT eingeloggte User
 */
const AUTH_ROUTES = ['/login', '/reset-password'];

/**
 * Desktop-Routen - nur für admin & planer
 */
const DESKTOP_ROUTES = [
  '/dashboard',
  '/planung',
  '/projekte',
  '/ressourcen',
  '/mitarbeiter',
  '/einstellungen',
];

/**
 * API-Routen die KEINEN Auth-Check brauchen
 */
const PUBLIC_API_ROUTES = ['/api/webhooks/asana', '/api/cron/'];

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Skip für statische Assets und spezielle Routen
  // ─────────────────────────────────────────────────────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Supabase Client erstellen mit Cookie-Handling
  // ─────────────────────────────────────────────────────────────────────────
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Session prüfen
  // ─────────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: authError } = await (supabase.auth as any).getUser();
  const authUser = data?.user;

  const isAuthenticated = !!authUser && !authError;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isDesktopRoute = DESKTOP_ROUTES.some((route) => pathname.startsWith(route));

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Nicht eingeloggt → Login-Redirect
  // ─────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Original-URL für Redirect nach Login speichern
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Eingeloggt auf Auth-Route → Dashboard-Redirect
  // ─────────────────────────────────────────────────────────────────────────
  if (isAuthenticated && isAuthRoute) {
    // User-Rolle aus Datenbank holen
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', authUser.id)
      .single();

    const role = userData?.role ?? 'gewerblich';

    // Redirect basierend auf Rolle
    if (role === 'gewerblich') {
      return NextResponse.redirect(new URL('/meine-woche', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Rollen-basierte Zugriffskontrolle
  // ─────────────────────────────────────────────────────────────────────────
  if (isAuthenticated && isDesktopRoute) {
    // User-Rolle aus Datenbank holen
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', authUser.id)
      .single();

    const role = userData?.role ?? 'gewerblich';

    // Gewerbliche dürfen nicht auf Desktop-Routen
    if (role === 'gewerblich') {
      return NextResponse.redirect(new URL('/meine-woche', request.url));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Root-Redirect
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (isAuthenticated) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', authUser.id)
        .single();

      const role = userData?.role ?? 'gewerblich';

      if (role === 'gewerblich') {
        return NextResponse.redirect(new URL('/meine-woche', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHER CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
