# planned. – Features & Akzeptanzkriterien

> Alle MVP-Features mit detaillierten Akzeptanzkriterien

**Version:** 1.3  
**Datum:** 29. Januar 2026

---

## Feature-Übersicht

| Bereich | Features | Priorität |
|---------|----------|-----------|
| [1. Authentifizierung](#1-authentifizierung--autorisierung) | F1.1-F1.5 | P0 |
| [2. Dashboard](#2-dashboard) | F2.1-F2.3 | P0 |
| [3. Projektplanung](#3-projektplanung-desktop) | F3.1-F3.16 | P0 |
| [4. Projekt-Management](#4-projekt-management) | F4.1-F4.4 | P1 |
| [5. Ressourcen-Verwaltung](#5-ressourcen-verwaltung) | F5.1-F5.6 | P1 |
| [6. Mitarbeiter-Verwaltung](#6-mitarbeiter-verwaltung) | F6.1-F6.5 | P1 |
| [7. Einstellungen](#7-einstellungen) | F7.1-F7.8 | P1 |
| [8. Mobile App](#8-mobile-app--meine-woche) | F8.1-F8.6 | P1 |
| [9. Echtzeit-Updates](#9-echtzeit-updates) | F9.1-F9.2 | P1 |
| [10. Loading & Error States](#10-loading--error-states) | F10.1-F10.4 | P0 |
| [11. Keyboard & Accessibility](#11-keyboard--accessibility) | F11.1-F11.3 | P2 |
| [12. Performance](#12-performance) | F12.1-F12.3 | P1 |
| [13. TimeTac-Integration](#13-timetac-integration) | F13.1-F13.5 | P1 |

---

## 1. Authentifizierung & Autorisierung

### F1.1: Login

**Beschreibung:** User können sich mit E-Mail/Passwort anmelden.

**Akzeptanzkriterien:**
- [ ] Login-Formular mit E-Mail und Passwort
- [ ] Validierung: E-Mail-Format, Passwort min. 8 Zeichen
- [ ] Error-Handling: "Ungültige Anmeldedaten" (generisch, kein Hinweis ob E-Mail existiert)
- [ ] "Passwort vergessen" Link → F1.4
- [ ] Nach Login: Redirect basierend auf Rolle
  - `admin`, `planer` → `/planung`
  - `gewerblich` → `/meine-woche`
- [ ] Session-Timeout: 7 Tage (mit "Angemeldet bleiben" Checkbox)
- [ ] Rate Limiting: Max. 5 Fehlversuche pro 15 Minuten

**Technische Details:**
- Supabase Auth mit E-Mail/Passwort Provider
- Session wird via `auth_id` auf `users` Tabelle gemapped

### F1.2: Logout

**Beschreibung:** User können sich abmelden.

**Akzeptanzkriterien:**
- [ ] Logout-Button in Navigation (User-Dropdown)
- [ ] Session wird serverseitig invalidiert
- [ ] Redirect zu `/login`
- [ ] Alle lokalen Daten werden gelöscht

### F1.3: Route Protection

**Beschreibung:** Routen sind basierend auf Rolle geschützt.

**Akzeptanzkriterien:**
- [ ] Nicht-eingeloggte User → Redirect zu `/login`
- [ ] `gewerblich` auf Desktop-Routen → Redirect zu `/meine-woche`
- [ ] `gewerblich` kann NICHT auf `/planung`, `/projekte`, `/ressourcen`, `/mitarbeiter`, `/einstellungen` zugreifen
- [ ] Middleware prüft Session bei jedem Request
- [ ] Nach Login: Redirect zu ursprünglich angefragter URL (wenn berechtigt)

**Technische Implementation – Middleware:**

```typescript
// middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Öffentliche Routen - kein Login erforderlich
 */
const PUBLIC_ROUTES = [
  '/login',
  '/reset-password',
  '/update-password',
];

/**
 * Auth-Routen - nur für NICHT eingeloggte User
 */
const AUTH_ROUTES = [
  '/login',
  '/reset-password',
];

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
 * Mobile-Routen - für alle Rollen
 */
const MOBILE_ROUTES = [
  '/meine-woche',
  '/profil',
];

/**
 * API-Routen die KEINEN Auth-Check brauchen
 */
const PUBLIC_API_ROUTES = [
  '/api/webhooks/asana',
  '/api/cron/',
];

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. Skip für statische Assets und spezielle Routen
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }
  
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 2. Supabase Client erstellen mit Cookie-Handling
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 3. Session prüfen
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  const isAuthenticated = !!authUser && !authError;
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isDesktopRoute = DESKTOP_ROUTES.some(route => pathname.startsWith(route));
  
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 4. Nicht eingeloggt → Login-Redirect
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Original-URL für Redirect nach Login speichern
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 5. Eingeloggt auf Auth-Route → Dashboard-Redirect
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 6. Rollen-basierte Zugriffskontrolle
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 7. Root-Redirect
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// ═══════════════════════════════════════════════════════════════════════════
// MATCHER CONFIG
// ═══════════════════════════════════════════════════════════════════════════

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
```

**Middleware-Flussdiagramm:**

```
+-------------------------------------------------------------------+
|                      INCOMING REQUEST                             |
+-------------------------------------------------------------------+
                              |
                              v
                    +-------------------+
                    | Static Asset?     |
                    | (_next, public)   |
                    +--------+----------+
                             |
              +--------------+--------------+
              | JA                          | NEIN
              v                             v
        [DURCHLASSEN]              +-------------------+
                                   | Session prüfen    |
                                   | (Supabase Auth)   |
                                   +--------+----------+
                                            |
                         +------------------+------------------+
                         | EINGELOGGT?                         |
                         |                                     |
              +----------+----------+               +----------+----------+
              | NEIN                |               | JA                  |
              v                     |               v                     |
     +-------------------+          |      +-------------------+          |
     | Public Route?     |          |      | Auth Route?       |          |
     | (/login, etc.)    |          |      | (/login)          |          |
     +--------+----------+          |      +--------+----------+          |
              |                     |               |                     |
    +---------+---------+           |     +---------+---------+           |
    | JA      | NEIN    |           |     | JA      | NEIN    |           |
    v         v         |           |     v         v         |           |
[DURCH-  [REDIRECT     ]|           | [REDIRECT  +----------+ |           |
LASSEN]   /login       ]|           |  basierend | Desktop  | |           |
          + redirectTo  |           |  auf Rolle]| Route?   | |           |
                        |           |            +----+-----+ |           |
                        |           |                 |       |           |
                        |           |      +----------+----------+        |
                        |           |      | JA                  | NEIN   |
                        |           |      v                     v        |
                        |           | +-------------+      [DURCHLASSEN]  |
                        |           | | User-Rolle  |                     |
                        |           | | prüfen      |                     |
                        |           | +------+------+                     |
                        |           |        |                            |
                        |           | +------+-------------+              |
                        |           | | GEWERBLICH?        |              |
                        |           | v                    v              |
                        |           | [REDIRECT       [DURCHLASSEN]       |
                        |           |  /meine-woche]                      |
                        |           |                                     |
                        +-----------+-------------------------------------+
```


**Supabase Middleware Client:**

```typescript
// src/infrastructure/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
```

### F1.4: Passwort zurücksetzen

**Beschreibung:** User können ihr Passwort zurücksetzen.

**Akzeptanzkriterien:**
- [ ] "Passwort vergessen" Link auf Login-Seite
- [ ] E-Mail-Input mit Validierung
- [ ] Erfolgsmeldung: "Falls ein Konto existiert, wurde eine E-Mail gesendet"
- [ ] E-Mail enthält Reset-Link (gültig 1 Stunde)
- [ ] Reset-Seite: Neues Passwort eingeben (2x)
- [ ] Passwort-Anforderungen: Min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl

### F1.5: Passwort ändern (eingeloggt)

**Beschreibung:** Eingeloggte User können ihr Passwort ändern.

**Akzeptanzkriterien:**
- [ ] In Profil-Einstellungen
- [ ] Aktuelles Passwort eingeben (required)
- [ ] Neues Passwort (2x eingeben)
- [ ] Validierung wie F1.4
- [ ] Erfolgsmeldung: "Passwort wurde geändert"

---

## 2. Dashboard

### F2.1: Dashboard Übersicht

**Beschreibung:** Startseite für Admin/Planer mit KPIs und Warnungen.

**Akzeptanzkriterien:**
- [ ] KPI Cards:
  - **Auslastung diese Woche** (%) – Geplante Stunden / Verfügbare Stunden
  - **Aktive Projekte** (Anzahl) – Status = 'active'
  - **Mitarbeiter verfügbar heute** (X/Y) – Ohne Abwesenheit, nicht voll allokiert
  - **Offene Warnungen** (Anzahl) – Ungelöste Alerts
- [ ] Berechnung Auslastung:
  - Zähler: Summe aller `planned_hours` dieser Woche
  - Nenner: Summe aller `weekly_hours` aktiver User Ã— 5 (Tage)
- [ ] Anklickbare KPIs führen zu Detail-Ansichten

### F2.2: System Alerts

**Beschreibung:** Warnungen und Hinweise auf der Dashboard-Seite.

**Akzeptanzkriterien:**
- [ ] Alert-Liste (max. 10, sortiert nach Severity → Datum)
- [ ] Alert-Typen mit Icons:
  - ðŸ”´ `absence_conflict` – "Max Müller ist am 05.02. in Urlaub, aber eingeplant"
  - ðŸŸ¡ `multi_allocation` – "Lisa Schmidt hat am 06.02. mehrere Zuweisungen"
  - ðŸŸ  `phase_ending` – "Montage Dachstuhl endet in 2 Tagen"
  - ðŸ”´ `sync_error` – "Asana-Synchronisierung fehlgeschlagen"
  - ðŸŸ  `over_budget` – "Elementierung: IST (42h) > SOLL (40h)"
- [ ] Jeder Alert hat Action-Button:
  - "Lösen" → Öffnet Dialog/Navigation zum Problem
  - "Ignorieren" → Markiert Alert als dismissed (für 24h)
- [ ] "Alle anzeigen" Link wenn > 10 Alerts

### F2.3: Quick Actions & Sync Status

**Beschreibung:** Schnellzugriff und Synchronisations-Status.

**Akzeptanzkriterien:**
- [ ] Quick Actions Section:
  - "Zur Tagesplanung" Button
  - "Zur Wochenplanung" Button
- [ ] Sync Status Section:
  - **Asana:** Letzter Sync + Status (âœ“ Erfolgreich / âš  Teilweise / âœ— Fehlgeschlagen)
  - **TimeTac:** Letzter Sync + Status
  - "Jetzt synchronisieren" Button (nur wenn > 5 Min seit letztem Sync)
- [ ] Bei Klick auf Sync-Status → Details im Slide-Over

---

## 3. Projektplanung (Desktop)

### F3.1: Tagesplanung-Ansicht

**Beschreibung:** Hauptansicht für die Tagesplanung mit Grid.

**Akzeptanzkriterien:**
- [ ] Header: "TAGESPLANUNG" + Wochen-Navigator (F3.11)
- [ ] Toggle: Tag/Woche (Tabs)
- [ ] Filter-Button mit Badge für aktive Filter
- [ ] Grid-Layout:
  - Y-Achse: Projekte → Phasen (hierarchisch, einklappbar)
  - X-Achse: 5 Tage (Mo-Fr)
- [ ] Projekt-Zeile zeigt:
  - Projektname + Status-Badge (Geplant/Aktiv/Pausiert)
  - Adresse (gekürzt, Tooltip für vollständige)
  - Fortschrittsbalken (IST / SOLL)
  - Expand/Collapse Toggle
- [ ] Phase-Zeile zeigt:
  - Phasenname
  - Bereich-Badge (`PRODUKTION` grün / `VOR ORT` gelb)
  - SOLL/PLAN/IST Stunden: "40h / 35h / 28h"
  - Delta-Indikator (+ grün, - rot wenn IST > SOLL)
- [ ] Zellen zeigen Allocation-Chips (F3.8)
- [ ] Wochenende-Spalten werden nicht angezeigt (nur Mo-Fr)

### F3.2: Wochenplanung-Ansicht

**Beschreibung:** Übersicht über mehrere Kalenderwochen.

**Akzeptanzkriterien:**
- [ ] Header: "WOCHENPLANUNG" + Monats-Navigator
- [ ] Grid-Layout:
  - Y-Achse: Projekte → Phasen (wie Tagesplanung)
  - X-Achse: 5 KWs (Kalenderwochen)
- [ ] KW-Header zeigt: "KW 06" + "03.-07.02."
- [ ] Allocation-Chips zeigen aggregierte Daten:
  - Person: Name + "(Mo-Fr)" wenn ganze Woche
  - Person: Name + "(Mo-Mi)" wenn nur Teilwoche
  - Mehrere Personen: "+2" Badge
- [ ] Klick auf Zelle → Zoom in Tagesplanung für diese KW
- [ ] Drag & Drop erstellt Allocations für ganze Woche (Mo-Fr)

### F3.3: Ressourcen-Pool

**Beschreibung:** Fixierter Bereich am unteren Rand mit verfügbaren Ressourcen.

**Akzeptanzkriterien:**
- [ ] Fixiert am unteren Bildschirmrand (min-height: 180px)
- [ ] Resizable nach oben (max 50% viewport)
- [ ] Header: "RESSOURCEN-POOL" + Verfügbar-Zähler
- [ ] Filter-Tabs: `Alle` | `Mitarbeiter` | `Fuhrpark` | `Geräte`
- [ ] Suchfeld für Namen
- [ ] Ressourcen-Cards zeigen:
  - **Mitarbeiter:**
    - Avatar (Initialen, Farbe basierend auf Name-Hash)
    - Name
    - Rolle/Position
    - 5 Verfügbarkeitskreise (Mo-Fr):
      - â— Gelb (#EBBD04) = Verfügbar
      - â— Grau (#6D6D6D) = Teilweise belegt
      - â—‹ Leer (#DDDDDD) = Voll belegt
      - âŠ˜ Rot (#EF4444) = Abwesenheit
  - **Ressourcen:**
    - Icon (basierend auf ResourceType)
    - Name
    - Typ-Badge
    - 5 Verfügbarkeitskreise
- [ ] Cards sind draggable
- [ ] Tooltip bei Hover auf Verfügbarkeitskreis: "Mo: Projekt XYZ – Phase ABC (8h)"
- [ ] Bei Abwesenheit: Tooltip zeigt Typ ("Urlaub", "Krank")

### F3.4: Drag & Drop – Allocation erstellen

**Beschreibung:** Ressourcen per Drag & Drop auf Phasen ziehen.

**Akzeptanzkriterien:**
- [ ] Drag von Ressourcen-Pool auf Grid-Zelle
- [ ] Während Drag:
  - Source-Card wird halbtransparent (opacity: 0.5)
  - Ghost-Element folgt Cursor
  - Ghost zeigt Avatar/Icon + Name
  - Valid Drop-Zones werden highlighted (Akzent-Border)
  - Invalid Zones (falsche Phase, bereits belegt) werden rot
- [ ] Bei Drop:
  - Allocation wird erstellt (Server Action)
  - Chip erscheint in Zelle (optimistic update)
  - Pool aktualisiert Verfügbarkeit (Kreis wird grau/leer)
  - Toast: "Max Müller wurde zu Elementierung hinzugefügt"
- [ ] Animation: 300ms ease-out transition
- [ ] Bei Fehler: Rollback mit Toast-Error

### F3.5: Range-Select

**Beschreibung:** Mehrere Tage auf einmal allokieren.

**Akzeptanzkriterien:**
- [ ] Ressource auf ersten Tag droppen
- [ ] Resize-Handle erscheint am rechten Rand des Chips
- [ ] Drag nach rechts erweitert Selektion:
  - Ghost-Chips erscheinen in allen Folge-Zellen
  - Bis zum letzten gültigen Tag (innerhalb der Woche)
- [ ] Bei Release:
  - Separate Allocations pro Tag erstellt (Bulk Insert)
  - Wochenenden werden übersprungen
  - Toast: "Max Müller für Mo-Fr hinzugefügt"

### F3.6: Move Allocation

**Beschreibung:** Bestehende Allocations verschieben.

**Akzeptanzkriterien:**
- [ ] Drag bestehenden Chip auf andere Zelle
- [ ] Verschieben innerhalb desselben Projekts: Allowed
- [ ] Verschieben zu anderem Projekt: Allowed (mit Bestätigung)
- [ ] Bei Drop: Update der Allocation (date, project_phase_id)
- [ ] Undo via Ctrl+Z möglich

### F3.7: Delete Allocation

**Beschreibung:** Allocations entfernen.

**Akzeptanzkriterien:**
- [ ] Klick auf Chip → Popover (F3.9)
- [ ] "Entfernen" Button im Popover
- [ ] Keyboard: `Delete` oder `Backspace` bei Fokus
- [ ] Bestätigung nur wenn Notes vorhanden
- [ ] Optimistic Delete mit Undo-Option (5 Sekunden)

### F3.8: Allocation Chip

**Beschreibung:** Visuelle Darstellung einer Zuweisung.

**Akzeptanzkriterien:**
- [ ] Chip zeigt:
  - Avatar (User) oder Icon (Ressource)
  - Name (gekürzt wenn > 10 Zeichen)
  - Stunden (bei User): "8h" oder "4h" bei Split
- [ ] Farbkodierung:
  - Standard: Akzent-Light Background mit Akzent-Border
  - Abwesenheits-Warnung: Rot-Light Background mit Rot-Border
  - Multi-Warnung: Gelb-Light Background mit Gelb-Border
- [ ] Warning-Icon bei Konflikt (Tooltip erklärt)
- [ ] Hover: Leichte Schatten-Erhöhung
- [ ] Focus: Akzent-Ring

### F3.9: Allocation Popover

**Beschreibung:** Detail-Ansicht bei Klick auf Chip.

**Akzeptanzkriterien:**
- [ ] Öffnet bei Klick auf Chip
- [ ] Zeigt:
  - Avatar/Name groß
  - Projekt & Phase
  - Datum
  - Geplante Stunden
  - Notizen (editierbar)
- [ ] Aktionen:
  - "In Asana öffnen" Link (wenn vorhanden)
  - "Notiz hinzufügen" / "Notiz bearbeiten"
  - "Entfernen" Button
- [ ] Warnungen (wenn vorhanden):
  - "âš ï¸ Mitarbeiter hat an diesem Tag Urlaub"
  - "âš ï¸ Mitarbeiter ist an 2 weiteren Projekten eingeplant"
- [ ] Schließen: Klick außerhalb oder Escape

### F3.10: Filter-Panel

**Beschreibung:** Filtern der Projekte/Phasen.

**Akzeptanzkriterien:**
- [ ] Filter-Button in Header öffnet Slide-Over
- [ ] Filter-Optionen:
  - **Bereich:** Produktion / Montage / Alle
  - **Status:** Geplant / Aktiv / Pausiert / Abgeschlossen (Multi-Select)
  - **Suche:** Freitext (Projekt- oder Phasenname)
  - **Nur mit Zuweisungen:** Toggle
- [ ] Aktive Filter: Badge-Count am Filter-Button
- [ ] "Filter zurücksetzen" Link
- [ ] Filter persistent pro Session (localStorage)

### F3.11: Wochen-Navigator

**Beschreibung:** Navigation zwischen Kalenderwochen.

**Akzeptanzkriterien:**
- [ ] Zeigt aktuelle Woche: "KW 06 | 03. - 07. Februar 2026"
- [ ] Pfeile für Vor/Zurück (â† →)
- [ ] "Heute" Button springt zu aktueller Woche
- [ ] Keyboard: `â†` / `→` / `t` (heute)
- [ ] Datum-Picker für direkten Sprung (Kalender-Icon)

### F3.12: Phase-Dates Quick-Edit

**Beschreibung:** Start/Ende einer Phase direkt im Grid ändern.

**Akzeptanzkriterien:**
- [ ] Klick auf Phase-Zeile → Inline-Datepicker für Start/Ende
- [ ] Änderung wird zu Asana synchronisiert
- [ ] Optimistic Update mit Rollback bei Fehler

### F3.13: Projekte ein-/ausklappen

**Beschreibung:** Projekte können ein- und ausgeklappt werden.

**Akzeptanzkriterien:**
- [ ] Klick auf Projekt-Zeile → Toggle expand/collapse
- [ ] Eingeklappte Projekte zeigen nur Projekt-Zeile
- [ ] Ausgeklappte zeigen alle Phasen
- [ ] Alle ein-/ausklappen Button im Header
- [ ] State wird in localStorage gespeichert

### F3.14: SOLL/PLAN/IST Anzeige

**Beschreibung:** Stundenübersicht pro Phase mit drei Kennzahlen.

**Datenquellen:**
| Kennzahl | DB-Feld | Quelle | Aktualisierung |
|----------|---------|--------|----------------|
| **SOLL** | `project_phases.budget_hours` | Asana Custom Field | Bei Asana-Sync |
| **PLAN** | `project_phases.planned_hours` | Summe Allocations | Via Trigger bei Allocation-Änderung |
| **IST** | `project_phases.actual_hours` | Summe Time Entries | Via Trigger bei TimeTac-Sync |

**Akzeptanzkriterien:**
- [ ] In Phase-Zeile: "SOLL: 40h | PLAN: 35h | IST: 28h"
- [ ] SOLL zeigt "-" wenn `budget_hours` NULL (nicht in Asana definiert)
- [ ] Farbkodierung:
  - IST < SOLL: Grün
  - IST = SOLL: Gelb
  - IST > SOLL: Rot
- [ ] Tooltip mit Prozent-Anzeige: "70% abgeschlossen (28h von 40h)"
- [ ] Warnung wenn PLAN > SOLL (Überplanung)

### F3.15: Bulk-Allocation

**Beschreibung:** Mehrere Personen gleichzeitig zuweisen.

**Akzeptanzkriterien:**
- [ ] Shift+Klick auf mehrere Personen im Pool
- [ ] Drag der Selektion auf eine Zelle
- [ ] Alle ausgewählten Personen werden allokiert
- [ ] Toast: "3 Mitarbeiter zu Elementierung hinzugefügt"

### F3.16: Undo/Redo

**Beschreibung:** Letzte Aktionen rückgängig machen.

**Akzeptanzkriterien:**
- [ ] Ctrl+Z / Cmd+Z → Undo
- [ ] Ctrl+Shift+Z / Cmd+Shift+Z → Redo
- [ ] Undo-Stack: Max. 50 Aktionen
- [ ] Funktioniert für: Create, Delete, Move Allocation
- [ ] Toast: "Aktion rückgängig gemacht" mit "Wiederherstellen" Link

---

## 4. Projekt-Management

### F4.1: Projekt-Liste

**Beschreibung:** Übersicht aller Projekte.

**Akzeptanzkriterien:**
- [ ] Tabelle mit Sortierung (Name, Status, Letzte Aktivität)
- [ ] Spalten: Name, Kunde, Status, Phasen (Anzahl), Fortschritt, Letzte Sync
- [ ] Status-Badge mit Farbe
- [ ] Suche nach Name/Kunde
- [ ] Klick auf Zeile → Projekt-Details (F4.3)

### F4.2: Projekt-Sync-Status

**Beschreibung:** Anzeige des Asana-Sync-Status pro Projekt.

**Akzeptanzkriterien:**
- [ ] Sync-Icon mit Tooltip: "Letzte Sync: vor 5 Minuten"
- [ ] Bei Sync-Fehler: Rotes Icon mit Fehlermeldung
- [ ] Manueller Sync-Button pro Projekt

### F4.3: Projekt-Details

**Beschreibung:** Detail-Ansicht eines Projekts.

**Akzeptanzkriterien:**
- [ ] Header: Projektname, Kunde, Adresse
- [ ] Tabs: Phasen | Allocations | Zeiterfassung
- [ ] Phasen-Tab:
  - Liste aller Phasen
  - SOLL/PLAN/IST pro Phase
  - Fortschrittsbalken
- [ ] Allocations-Tab:
  - Wer ist diese Woche eingeplant?
  - Kalender-Ansicht
- [ ] Zeiterfassung-Tab:
  - IST-Stunden aus TimeTac
  - Nach Mitarbeiter gruppiert

### F4.4: Phase-Details

**Beschreibung:** Detail-Ansicht einer Phase.

**Akzeptanzkriterien:**
- [ ] Anzeige: Name, Bereich, Start/Ende, SOLL/PLAN/IST
- [ ] Allocations-Liste für diese Phase
- [ ] Timeline: Wann war wer eingeplant?
- [ ] Link zu Asana-Task

---

## 5. Ressourcen-Verwaltung

### F5.1: Ressourcen-Typen verwalten

**Beschreibung:** Konfiguration der Ressourcen-Kategorien.

**Akzeptanzkriterien:**
- [ ] Liste aller Typen (z.B. Fahrzeug, Maschine Produktion)
- [ ] Neuen Typ anlegen: Name, Icon, Farbe
- [ ] Typ bearbeiten
- [ ] Typ löschen (nur wenn keine Ressourcen zugeordnet)

### F5.2: Ressource anlegen

**Beschreibung:** Neue Fahrzeuge/Maschinen hinzufügen.

**Akzeptanzkriterien:**
- [ ] Formular: Name, Typ (Dropdown), Kennzeichen (optional)
- [ ] Validierung: Name unique pro Tenant
- [ ] Nach Speichern: Ressource erscheint im Pool

### F5.3: Ressource bearbeiten

**Beschreibung:** Ressourcen-Details ändern.

**Akzeptanzkriterien:**
- [ ] Name, Typ, Kennzeichen editierbar
- [ ] "Deaktivieren" Button (Soft-Delete)

### F5.4: Ressourcen-Liste

**Beschreibung:** Übersicht aller Ressourcen.

**Akzeptanzkriterien:**
- [ ] Tabelle: Name, Typ, Kennzeichen, Status, Auslastung
- [ ] Filter nach Typ
- [ ] Suche nach Name
- [ ] Sortierung

### F5.5: Ressource deaktivieren

**Beschreibung:** Ressource aus dem Pool entfernen.

**Akzeptanzkriterien:**
- [ ] Deaktivierte Ressourcen erscheinen nicht im Pool
- [ ] Bestehende Allocations bleiben erhalten
- [ ] Warnung wenn zukünftige Allocations existieren

### F5.6: Ressource reaktivieren

**Beschreibung:** Deaktivierte Ressource wieder aktivieren.

**Akzeptanzkriterien:**
- [ ] In der Liste: "Deaktivierte anzeigen" Toggle
- [ ] "Reaktivieren" Button
- [ ] Ressource erscheint wieder im Pool

---

## 6. Mitarbeiter-Verwaltung

### F6.1: Mitarbeiter anlegen

**Beschreibung:** Neue Mitarbeiter hinzufügen.

**Akzeptanzkriterien:**
- [ ] Formular: E-Mail, Name, Rolle, Wochenstunden
- [ ] Rolle: Admin / Planer / Gewerblich
- [ ] Wochenstunden: Default 40, Range 0-60
- [ ] Optional: Einladungs-E-Mail senden

### F6.2: Mitarbeiter bearbeiten

**Beschreibung:** Mitarbeiter-Details ändern.

**Akzeptanzkriterien:**
- [ ] Name, Rolle, Wochenstunden editierbar
- [ ] E-Mail nicht änderbar
- [ ] Avatar-Upload (optional)

### F6.3: Mitarbeiter-Liste

**Beschreibung:** Übersicht aller Mitarbeiter.

**Akzeptanzkriterien:**
- [ ] Tabelle: Avatar, Name, E-Mail, Rolle, Wochenstunden, Status
- [ ] Filter nach Rolle
- [ ] Filter: Nur aktive / Alle
- [ ] Suche nach Name/E-Mail

### F6.4: Mitarbeiter deaktivieren

**Beschreibung:** Mitarbeiter aus dem System entfernen.

**Akzeptanzkriterien:**
- [ ] Deaktivierte erscheinen nicht im Pool
- [ ] Login wird deaktiviert
- [ ] Bestehende Allocations bleiben sichtbar (historisch)
- [ ] Zukünftige Allocations: Warnung und Option zum Löschen

### F6.5: Einladung erneut senden

**Beschreibung:** Einladungs-E-Mail erneut versenden.

**Akzeptanzkriterien:**
- [ ] Button "Einladung erneut senden"
- [ ] Nur für User ohne ersten Login
- [ ] Cooldown: 5 Minuten zwischen Einladungen
- [ ] Toast: "Einladung wurde gesendet"

---

## 7. Einstellungen

### F7.1: Tenant-Einstellungen

**Beschreibung:** Firmenweite Einstellungen.

**Akzeptanzkriterien:**
- [ ] Firmenname ändern
- [ ] Default-Wochenstunden (für neue Mitarbeiter)
- [ ] Logo Upload (für E-Mails, Mobile Header)

**Logo-Upload Spezifikation:**
- **Erlaubte Formate:** JPEG, PNG, WebP
- **Maximale Dateigröße:** 2 MB
- **Empfohlene Auflösung:** 400×100 px (4:1 Ratio)
- **Supabase Storage Bucket:** `logos`
- **Pfad-Schema:** `{tenant_id}/logo.{ext}`
- **UI-Position:** Einstellungen → Firma → "Logo hochladen" Button
- **Vorschau:** Wird nach Upload sofort angezeigt
- **Verwendung:** E-Mail-Header, Mobile App Header, PDF-Export

### F7.2: Asana-Integration

**Beschreibung:** Asana verbinden und konfigurieren.

**Akzeptanzkriterien:**
- [ ] "Mit Asana verbinden" Button → OAuth Flow
- [ ] Nach Verbindung: Workspace auswählen
- [ ] Custom Fields zuordnen:
  - Projekt-Status
  - Phase-Bereich (Produktion/Montage)
  - Phase-Budget-Stunden
- [ ] "Jetzt synchronisieren" Button
- [ ] "Verbindung trennen" Button (mit Warnung)

### F7.3: TimeTac-Integration

**Beschreibung:** TimeTac verbinden.

**Akzeptanzkriterien:**
- [ ] Account-ID und API-Token eingeben
- [ ] "Verbindung testen" Button
- [ ] Nach Verbindung: User-Mapping (F7.5)
- [ ] Sync-Status anzeigen

### F7.4: Webhook-Status

**Beschreibung:** Status der Webhook-Verbindung.

**Akzeptanzkriterien:**
- [ ] Asana Webhook: Aktiv/Inaktiv
- [ ] Letzte empfangene Events
- [ ] "Webhook neu erstellen" bei Problemen

### F7.5: User-Mapping (TimeTac)

**Beschreibung:** planned.-User mit TimeTac-User verknüpfen.

**Akzeptanzkriterien:**
- [ ] Liste: planned.-User | TimeTac-User (Dropdown)
- [ ] Auto-Match via E-Mail vorgeschlagen
- [ ] Manuelles Override möglich
- [ ] Nicht-gemappte User werden hervorgehoben

### F7.6: Sync-Log

**Beschreibung:** Protokoll aller Synchronisierungen.

**Akzeptanzkriterien:**
- [ ] Liste der letzten 50 Syncs
- [ ] Spalten: Zeitpunkt, Service, Operation, Status, Details
- [ ] Filter nach Service (Asana/TimeTac)
- [ ] Bei Fehlern: Error-Message anzeigen

### F7.7: Profil-Einstellungen

**Beschreibung:** Persönliche Einstellungen des eingeloggten Users.

**Akzeptanzkriterien:**
- [ ] Name ändern
- [ ] Avatar ändern
- [ ] Passwort ändern (F1.5)
- [ ] E-Mail wird angezeigt (nicht änderbar)

### F7.8: Danger Zone

**Beschreibung:** Kritische Aktionen.

**Akzeptanzkriterien:**
- [ ] "Alle Daten löschen" (nur für Admins)
- [ ] Doppelte Bestätigung (Firmennamen eintippen)
- [ ] Löscht: Allocations, Projekte, User (außer sich selbst)
- [ ] Behält: Tenant, Integration-Credentials

---

## 8. Mobile App – "Meine Woche"

### F8.1: Wochenübersicht

**Beschreibung:** Mitarbeiter sieht seine Einsätze für die aktuelle Woche.

**Akzeptanzkriterien:**
- [ ] Header: "Meine Woche" + KW + Datumsbereich
- [ ] Navigation: Woche vor/zurück
- [ ] Liste der Tage (Mo-Fr):
  - Datum prominent
  - Anzahl Einsätze
- [ ] Heute wird hervorgehoben
- [ ] Wochenende nicht angezeigt (außer wenn Allocation)

### F8.2: Tagesdetails

**Beschreibung:** Detailansicht für einen Tag.

**Akzeptanzkriterien:**
- [ ] Klick auf Tag → Expandiert Details
- [ ] Zeigt alle Allocations:
  - Projektname
  - Phase
  - Bereich-Badge
  - Geplante Stunden
  - Adresse (wenn Montage)
- [ ] Bei mehreren: Sortiert nach Projekt

### F8.3: Einsatz-Card

**Beschreibung:** Einzelner Einsatz in der Tagesansicht.

**Akzeptanzkriterien:**
- [ ] Card zeigt:
  - Projekt (groß)
  - Phase
  - Bereich-Badge
  - Stunden: "8h geplant"
  - Adresse mit Map-Icon (wenn Montage)
- [ ] Klick auf Adresse → Navigation starten (F8.4)
- [ ] Abwesenheits-Card wenn Urlaub/Krank
- [ ] Keine Actions auf Abwesenheits-Card

### F8.4: Deep Links

**Beschreibung:** Navigation zu externen Apps.

**Akzeptanzkriterien:**
- [ ] **"Navigation starten":**
  - iOS: Apple Maps oder Google Maps (je nach Installation)
  - Android: Google Maps
  - Fallback: Web-Link
  - Query: Vollständige Adresse
- [ ] **"In Asana öffnen":**
  - Deep Link: `asana://0/${taskId}` (App)
  - Fallback: `https://app.asana.com/0/${taskId}` (Web)

### F8.5: Offline-Modus (Basisversion)

**Beschreibung:** App funktioniert eingeschränkt offline.

**Akzeptanzkriterien:**
- [ ] Zuletzt geladene Woche wird gecached
- [ ] Bei Offline:
  - Banner: "Offline – Zeige gecachte Daten"
  - Daten werden angezeigt (nicht editierbar)
  - Sync bei Reconnect
- [ ] Automatische Reconnection

### F8.6: Benachrichtigungen (Optional MVP)

**Beschreibung:** Push-Benachrichtigungen für neue Zuweisungen.

**Akzeptanzkriterien:**
- [ ] Bei neuer Allocation: Push "Neuer Einsatz: [Projekt] am [Datum]"
- [ ] Bei Änderung: Push "Einsatz geändert: [Projekt]"
- [ ] Bei Löschung: Push "Einsatz entfernt: [Projekt]"
- [ ] In App deaktivierbar

---

## 9. Echtzeit-Updates

### F9.1: Realtime Subscriptions

**Beschreibung:** Änderungen werden sofort synchronisiert.

**Akzeptanzkriterien:**
- [ ] **Subscriptions auf:**
  - `allocations` (INSERT, UPDATE, DELETE)
  - `absences` (INSERT, DELETE)
  - `projects` (UPDATE)
  - `project_phases` (UPDATE)
- [ ] **Bei Update:**
  - Neue Allocation erscheint bei anderen Planern (< 500ms)
  - Gelöschte Allocation verschwindet
  - Geänderte Allocation wird aktualisiert
- [ ] **Visual Feedback:**
  - Kurzes Highlight bei neuen/geänderten Chips
  - Toast (optional): "[Name] wurde von [Anderer User] zu [Projekt] hinzugefügt"
- [ ] **Konflikt-Handling:**
  - Wenn lokale Änderung während anderer ändert: Server-Version gewinnt
  - Toast: "Änderung wurde überschrieben"

### F9.2: Offline-Fallback

**Beschreibung:** Graceful degradation bei Verbindungsproblemen.

**Akzeptanzkriterien:**
- [ ] Bei Verbindungsverlust:
  - Banner oben: "Verbindung wird wiederhergestellt..." (gelb)
  - Keine Bearbeitung möglich (Buttons disabled)
- [ ] Automatische Reconnection:
  - Exponential Backoff (1s, 2s, 4s, max 30s)
  - Bei Reconnect: Full Refresh der aktuellen Woche
- [ ] Bei längerer Offline-Phase (> 60s):
  - Banner: "Offline – Bitte Verbindung prüfen"
  - "Seite neu laden" Button

---

## 10. Loading & Error States

### F10.1: Loading States

**Beschreibung:** Skeleton Loader für alle Ansichten.

**Akzeptanzkriterien:**
- [ ] **Projektplanung:**
  - Grid-Skeleton (Zeilen + Spalten)
  - Ressourcen-Pool Skeleton (3 Card-Shapes)
- [ ] **Tabellen:**
  - Row-Skeletons (5 Zeilen)
  - Header bleibt sichtbar
- [ ] **Cards:**
  - Card-Shape mit Pulse-Animation
- [ ] **Dialoge:**
  - Spinner in Button während Speichern
  - Disabled State
- [ ] Skeleton-Animation: Pulse (CSS) oder Shimmer

### F10.2: Error Handling

**Beschreibung:** Benutzerfreundliche Fehlermeldungen.

**Akzeptanzkriterien:**
- [ ] **Toast für temporäre Fehler:**
  - Position: Bottom-right
  - Auto-dismiss: 5 Sekunden
  - Error (rot), Warning (gelb), Success (grün), Info (blau)
- [ ] **Error Boundary für kritische Fehler:**
  - Fullpage Error mit freundlicher Message
  - "Seite neu laden" Button
  - "Problem melden" Link
- [ ] **Inline Errors:**
  - Bei Form-Validation: Unter dem Feld
  - Bei API-Fehler: Im Dialog/Form
- [ ] **Sentry Integration:**
  - Automatisches Error-Logging
  - User-Context (TenantId, UserId)
  - Breadcrumbs für Aktionen

### F10.3: Empty States

**Beschreibung:** Hilfreiche Anzeige wenn keine Daten vorhanden.

**Akzeptanzkriterien:**
- [ ] **Keine Projekte:**
  - Illustration + "Noch keine Projekte"
  - "Verbinden Sie Asana um Projekte zu importieren" (mit Button)
- [ ] **Keine Allocations diese Woche:**
  - "Keine Zuweisungen in KW [X]"
  - "Ziehen Sie Ressourcen aus dem Pool auf Projektphasen"
- [ ] **Keine Mitarbeiter:**
  - "Noch keine Mitarbeiter"
  - "Legen Sie Ihren ersten Mitarbeiter an" (mit Button)
- [ ] **Keine Ressourcen:**
  - "Noch keine Ressourcen"
  - "Erstellen Sie Ihre erste Ressource"
- [ ] **Suche ohne Ergebnis:**
  - "Keine Ergebnisse für '[Suchbegriff]'"
  - "Filter zurücksetzen" Link

### F10.4: Error Boundaries (NEU)

**Beschreibung:** React Error Boundaries für graceful Error Recovery.

**Akzeptanzkriterien:**
- [ ] Global Error Boundary auf App-Level
- [ ] Lokale Error Boundaries für kritische Komponenten
- [ ] Bei Fehler: Benutzerfreundliche Fehlerseite

**Technische Implementation:**

```typescript
// app/error.tsx – Global Error Boundary

'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, MessageCircle } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Error an Sentry senden
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error);
      });
    }
    
    // In Console loggen (Development)
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-error-light rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-error" />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-black mb-2">
          Etwas ist schiefgelaufen
        </h1>
        
        {/* Description */}
        <p className="text-gray mb-6">
          Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut 
          oder kontaktieren Sie den Support, wenn das Problem weiterhin besteht.
        </p>
        
        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="text-sm text-gray cursor-pointer hover:text-black">
              Technische Details
            </summary>
            <pre className="mt-2 p-3 bg-gray-lighter rounded text-xs overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        
        {/* Error Digest for Support */}
        {error.digest && (
          <p className="text-xs text-gray mb-6">
            Fehler-ID: {error.digest}
          </p>
        )}
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={reset}
            className="bg-accent text-black hover:bg-accent-hover"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Erneut versuchen
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.location.href = 'mailto:support@planned.de'}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Support kontaktieren
          </Button>
        </div>
        
        {/* Home Link */}
        <a 
          href="/dashboard"
          className="inline-block mt-6 text-sm text-accent hover:text-accent-hover"
        >
          Zurück zur Startseite
        </a>
      </div>
    </div>
  );
}
```

```typescript
// app/global-error.tsx – Root Error Boundary (für Layout-Fehler)

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Kritischer Fehler
            </h1>
            <p className="text-gray-600 mb-6">
              Die Anwendung konnte nicht geladen werden.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

```typescript
// app/not-found.tsx – 404 Page

import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-gray-lighter rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-8 h-8 text-gray" />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-black mb-2">
          Seite nicht gefunden
        </h1>
        
        {/* Description */}
        <p className="text-gray mb-6">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        
        {/* Action */}
        <Button asChild className="bg-accent text-black hover:bg-accent-hover">
          <Link href="/dashboard">
            Zur Startseite
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

```typescript
// src/presentation/components/feedback/ErrorBoundary.tsx – Reusable Component

'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable Error Boundary für kritische Komponenten.
 * 
 * Verwendung:
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 border border-error-light rounded-lg bg-error-light/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-black">
                Fehler beim Laden der Komponente
              </h3>
              <p className="text-sm text-gray mt-1">
                Diese Komponente konnte nicht geladen werden.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleReset}
                className="mt-3"
              >
                Erneut versuchen
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Verwendung der Error Boundaries:**

```typescript
// Beispiel: PlanningGrid mit Error Boundary

import { ErrorBoundary } from '@/presentation/components/feedback/ErrorBoundary';
import { PlanningGrid } from '@/presentation/components/planning/PlanningGrid';
import { PlanningGridSkeleton } from '@/presentation/components/feedback/Skeleton';

export function PlanningPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 text-center">
          <p className="text-gray">Das Planungsraster konnte nicht geladen werden.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Seite neu laden
          </Button>
        </div>
      }
      onError={(error) => {
        // An Sentry senden
        Sentry.captureException(error, {
          tags: { component: 'PlanningGrid' },
        });
      }}
    >
      <Suspense fallback={<PlanningGridSkeleton />}>
        <PlanningGrid />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## 11. Keyboard & Accessibility

### F11.1: Keyboard Shortcuts

**Beschreibung:** Schnelle Navigation via Tastatur.

**Akzeptanzkriterien:**
- [ ] **Global:**
  - `?` – Shortcut-Hilfe anzeigen
  - `Esc` – Dialog/Panel schließen
  - `/` – Fokus auf Suche
- [ ] **Planung:**
  - `â†` / `→` – Woche wechseln
  - `t` – Heute
  - `d` – Tagesansicht
  - `w` – Wochenansicht
  - `f` – Filter öffnen
- [ ] **Grid:**
  - `Enter` auf Chip – Popover öffnen
  - `Delete` / `Backspace` – Selektion löschen
  - `Ctrl+Z` – Undo
  - `Ctrl+Shift+Z` – Redo
- [ ] Shortcut-Cheatsheet (Dialog)

### F11.2: Focus Management

**Beschreibung:** Korrekte Fokus-Handhabung.

**Akzeptanzkriterien:**
- [ ] Focus-Trap in Modals/Dialogen
- [ ] Focus kehrt zu Trigger-Element zurück nach Schließen
- [ ] Sichtbarer Focus-Ring (Akzent-Farbe)
- [ ] Skip-Links für Screenreader

### F11.3: ARIA & Screenreader

**Beschreibung:** Basis-Zugänglichkeit.

**Akzeptanzkriterien:**
- [ ] Semantisches HTML (header, main, nav, etc.)
- [ ] ARIA-Labels für Icon-Buttons
- [ ] ARIA-Live für Toasts
- [ ] Alt-Text für Avatare/Icons (sinnvoll, nicht "Avatar")
- [ ] Kontrastverhältnis min. 4.5:1 (WCAG AA)

---

## 12. Performance

### F12.1: Initial Load

**Beschreibung:** Schnelle erste Ladezeit.

**Akzeptanzkriterien:**
- [ ] Time to First Byte (TTFB): < 200ms
- [ ] Largest Contentful Paint (LCP): < 2.5s
- [ ] First Input Delay (FID): < 100ms
- [ ] Cumulative Layout Shift (CLS): < 0.1
- [ ] Bundle Size: < 200KB gzipped (JS)

### F12.2: Runtime Performance

**Beschreibung:** Flüssige Interaktionen.

**Akzeptanzkriterien:**
- [ ] Drag & Drop: 60fps (kein Frame-Drop)
- [ ] Scroll: Smooth (virtualisiert wenn > 50 Projekte)
- [ ] Interaktionen: < 100ms Response
- [ ] Debounced Inputs: 300ms

### F12.3: Caching

**Beschreibung:** Intelligentes Caching.

**Akzeptanzkriterien:**
- [ ] React Query für API-Calls (stale-while-revalidate)
- [ ] Allocations: Cache invalidieren bei Mutation
- [ ] Statische Assets: Long-term Cache
- [ ] User-Präferenzen: localStorage

---

## 13. TimeTac-Integration

### F13.1: TimeTac API-Token Konfiguration

**Beschreibung:** Admin kann TimeTac API-Token eingeben und Verbindung testen.

**Akzeptanzkriterien:**
- [ ] Formular für API-Token Eingabe in Einstellungen → Integrationen
- [ ] "Verbindung testen" Button
- [ ] API-Token wird verschlüsselt in DB gespeichert (AES-256-GCM)
- [ ] Erfolgs-/Fehlermeldung nach Test
- [ ] Token kann aktualisiert oder gelöscht werden
- [ ] Letzte erfolgreiche Sync-Zeit wird angezeigt

### F13.2: TimeTac User-Mapping

**Beschreibung:** Admin kann TimeTac-Benutzer den planned.-Mitarbeitern zuordnen.

**Akzeptanzkriterien:**
- [ ] Dropdown/Tabelle zeigt alle aktiven planned.-Mitarbeiter
- [ ] Für jeden Mitarbeiter: Auswahl eines TimeTac-Users
- [ ] Auto-Match-Vorschlag basierend auf E-Mail/Name
- [ ] "Alle zuordnen" Button für Auto-Match
- [ ] Warnung wenn TimeTac-User bereits zugeordnet
- [ ] Mapping wird in `users.timetac_id` gespeichert

### F13.3: Time Entries Import

**Beschreibung:** Automatischer stündlicher Import von Arbeitszeiten.

**Akzeptanzkriterien:**
- [ ] Cron-Job läuft stündlich (Minute 0)
- [ ] Importiert Time Entries der letzten 2 Stunden
- [ ] Matching über `timetac_id` → `user_id`
- [ ] Time Entries werden Phasen zugeordnet (via Projekt-Name oder Custom Field)
- [ ] `project_phases.actual_hours` wird automatisch aktualisiert
- [ ] Duplikat-Erkennung (keine doppelten Imports)
- [ ] SyncLog-Eintrag mit Ergebnis

### F13.4: Absences Import

**Beschreibung:** Täglicher Import von Abwesenheiten.

**Akzeptanzkriterien:**
- [ ] Cron-Job läuft täglich um 6:00 UTC
- [ ] Importiert Abwesenheiten für die nächsten 30 Tage
- [ ] Mapping von TimeTac-Abwesenheitstypen zu DB-Werten:
  - `Urlaub` → `vacation`
  - `Krankheit` → `sick`
  - `Feiertag` → `holiday`
  - `Schulung` / `Weiterbildung` → `training`
  - `Sonstiges` → `other`
- [ ] Neue Abwesenheiten werden erstellt
- [ ] Gelöschte Abwesenheiten werden entfernt
- [ ] SyncLog-Eintrag mit Ergebnis

### F13.5: Sync-Status & Logs

**Beschreibung:** Übersicht über Sync-Status und Historie.

**Akzeptanzkriterien:**
- [ ] Status-Badge in Einstellungen (Grün/Gelb/Rot)
- [ ] Letzte Sync-Zeit für Time Entries und Absences
- [ ] Sync-Log-Tabelle mit letzten 50 Einträgen
- [ ] Filter nach Sync-Typ und Status
- [ ] Details zu Fehlern anzeigbar
- [ ] "Jetzt synchronisieren" Button für manuellen Sync

**Technische Details:**
- Unidirektionale Synchronisation (TimeTac → planned.)
- Keine Rückschreibe-Funktionalität
- API-Limit beachten (max. 100 Requests/Minute)

---

## Prioritäts-Legende

| Priorität | Bedeutung | Timeline |
|-----------|-----------|----------|
| **P0** | Must-Have für MVP | Sprint 1-2 |
| **P1** | Should-Have für MVP | Sprint 2-3 |
| **P2** | Nice-to-Have | Sprint 3+ / Post-MVP |

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial für Antigravity |
| 1.1 | Januar 2026 | + F1.4/F1.5 (Passwort Reset), + F3.13-F3.16 (Einklappen, SOLL/PLAN/IST, Bulk, Undo), + F4.3/F4.4 (Projekt/Phase Details), + F5.6 (Reaktivieren), + F6.5 (Einladung erneut), + F7.5-F7.8 (User Mapping, Sync Log, Profil, Danger Zone), + F8.5/F8.6 (Offline, Push), + F11 (Keyboard/A11y), + F12 (Performance), Prioritäten hinzugefügt |
| 1.2 | Januar 2026 | + **F1.3 Middleware-Spezifikation** (vollständige Implementation), + Middleware-Flussdiagramm, + Supabase Middleware Client, + **F10.4 Error Boundaries** (app/error.tsx, app/global-error.tsx, app/not-found.tsx, ErrorBoundary Component), + Verwendungsbeispiele für Error Boundaries |
| 1.3 | Januar 2026 | **Rebranding: "bänk" → "planned."**, UTF-8 Encoding korrigiert, Support-E-Mail aktualisiert |

---

*Version: 1.3 für Antigravity*  
*Erstellt: 29. Januar 2026*
