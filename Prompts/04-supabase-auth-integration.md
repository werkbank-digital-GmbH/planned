# Prompt 04: Supabase Auth Integration

**Phase:** 2 – Authentifizierung & Multi-Tenancy
**Komplexität:** L (Large)
**Geschätzte Zeit:** 4-5 Stunden

---

## Kontext

Die Clean Architecture Basis steht. Jetzt implementieren wir die Authentifizierung mit Supabase Auth.

**Bereits vorhanden:**
- Next.js 15 mit TypeScript
- Supabase mit allen Tabellen und RLS
- DI Container und ActionResult Pattern
- Domain Errors

---

## Ziel

Implementiere den vollständigen Auth-Flow mit Login, Logout, Passwort-Reset und Session-Management.

---

## Referenz-Dokumentation

- `FEATURES.md` – F1: Authentifizierung (F1.1-F1.5)
- `API_SPEC.md` – Auth Middleware, Server Actions
- `UI_COMPONENTS.md` – Login Screen Design
- **UI-Screen:** `stitch_planned./login_screen/login_screen.png`

---

## Akzeptanzkriterien

```gherkin
Feature: F1 - Authentifizierung

Scenario: F1.1 - Login mit E-Mail/Passwort
  Given ich bin auf der Login-Seite
  When ich gültige Credentials eingebe
  And ich auf "Anmelden" klicke
  Then werde ich basierend auf meiner Rolle weitergeleitet:
    | Rolle      | Redirect      |
    | admin      | /dashboard    |
    | planer     | /dashboard    |
    | gewerblich | /meine-woche  |
  And meine Session ist aktiv (7 Tage bei "Angemeldet bleiben")

Scenario: F1.2 - Ungültiger Login
  Given ich bin auf der Login-Seite
  When ich ungültige Credentials eingebe
  Then sehe ich "Ungültige Anmeldedaten" (generisch, kein Hinweis ob E-Mail existiert)
  And ich bleibe auf der Login-Seite
  And nach 5 Fehlversuchen: Rate Limiting (15 Min Sperre)

Scenario: F1.3 - Logout
  Given ich bin eingeloggt
  When ich auf "Abmelden" klicke
  Then werde ich zur Login-Seite weitergeleitet
  And meine Session ist serverseitig invalidiert
  And alle lokalen Daten sind gelöscht

Scenario: F1.4 - Passwort vergessen
  Given ich bin auf der Login-Seite
  When ich auf "Passwort vergessen?" klicke
  Then sehe ich ein E-Mail-Eingabefeld
  When ich eine E-Mail eingebe und absende
  Then sehe ich "Falls ein Konto existiert, wurde eine E-Mail gesendet"
  And ein Reset-Link wird gesendet (gültig 1 Stunde)

Scenario: F1.5 - Passwort zurücksetzen
  Given ich habe einen gültigen Reset-Link
  When ich die Reset-Seite öffne
  Then kann ich ein neues Passwort eingeben (2x)
  And das Passwort muss mindestens 8 Zeichen haben
  And nach Erfolg werde ich zur Login-Seite weitergeleitet

Scenario: F1.6 - Route Protection
  Given ich bin nicht eingeloggt
  When ich eine geschützte Route aufrufe (z.B. /planung)
  Then werde ich zu /login weitergeleitet
  And die ursprüngliche URL wird als redirectTo gespeichert
  When ich mich erfolgreich anmelde
  Then werde ich zur ursprünglichen URL weitergeleitet

Scenario: F1.7 - Session-Persistenz
  Given ich bin eingeloggt
  When ich die Seite neu lade
  Then bin ich weiterhin eingeloggt
```

---

## Technische Anforderungen

### Login Server Action

```typescript
// src/presentation/actions/auth.ts
'use server';

import { z } from 'zod';
import { createActionSupabaseClient } from '@/infrastructure/supabase/actions';
import { Result, ActionResult } from '@/application/common/ActionResult';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  rememberMe: z.boolean().optional(),
});

export async function loginAction(formData: FormData): Promise<ActionResult<void>> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    rememberMe: formData.get('rememberMe') === 'on',
  });

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  const supabase = await createActionSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
  });

  if (error) {
    return Result.fail('AUTH_INVALID_CREDENTIALS', 'Ungültige Anmeldedaten');
  }

  return Result.ok(undefined);
}
```

### Middleware für Route Protection

Die vollständige Middleware-Implementation ist in `FEATURES.md` F1.3 dokumentiert.

```typescript
// middleware.ts
// Siehe FEATURES.md für vollständige Implementation

const PUBLIC_ROUTES = ['/login', '/reset-password', '/update-password'];
const DESKTOP_ROUTES = ['/dashboard', '/planung', '/projekte', '/ressourcen', '/mitarbeiter', '/einstellungen'];
const MOBILE_ROUTES = ['/meine-woche', '/profil'];
```

---

## Implementierungsschritte

### 🔴 RED: E2E Test für Login-Flow

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@test.de');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@test.de');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Ungültige Anmeldedaten')).toBeVisible();
  });

  test('should redirect to original URL after login', async ({ page }) => {
    await page.goto('/planung');
    await expect(page).toHaveURL('/login?redirectTo=/planung');

    await page.fill('input[name="email"]', 'admin@test.de');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/planung');
  });
});
```

### 🟢 GREEN: Login Page mit Form

```typescript
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/presentation/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-light-gray">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black">planned.</h1>
            <p className="text-gray mt-2">Kapazitätsplanung für Holzbau</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
```

### 🟢 GREEN: LoginForm Component

```typescript
// src/presentation/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction } from '@/presentation/actions/auth';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Checkbox } from '@/presentation/components/ui/checkbox';
import Link from 'next/link';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await loginAction(formData);
    if (!result.success) {
      setError(result.error.message);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-error-light text-error rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ihre@email.de"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="rememberMe" name="rememberMe" />
          <Label htmlFor="rememberMe" className="text-sm">
            Angemeldet bleiben
          </Label>
        </div>
        <Link
          href="/reset-password"
          className="text-sm text-accent hover:underline"
        >
          Passwort vergessen?
        </Link>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Wird angemeldet...' : 'Anmelden'}
    </Button>
  );
}
```

### 🟢 GREEN: Passwort-Reset Pages

```typescript
// src/app/(auth)/reset-password/page.tsx
// Zeigt E-Mail-Eingabefeld für Reset-Link

// src/app/(auth)/update-password/page.tsx
// Zeigt Passwort-Änderungsformular nach Klick auf Reset-Link
```

### 🟢 GREEN: Middleware implementieren

```typescript
// middleware.ts
// Vollständige Implementation aus FEATURES.md F1.3
```

### 🔵 REFACTOR: Error Messages auf Deutsch

Alle Fehlermeldungen aus `Rules.md` übernehmen.

---

## Erwartete Dateien

```
middleware.ts                    # Next.js Middleware (Root-Level!)
src/
├── app/
│   └── (auth)/
│       ├── login/
│       │   └── page.tsx
│       ├── reset-password/
│       │   └── page.tsx
│       ├── update-password/
│       │   └── page.tsx
│       └── layout.tsx
├── presentation/
│   ├── actions/
│   │   └── auth.ts
│   └── components/
│       └── auth/
│           ├── LoginForm.tsx
│           ├── ResetPasswordForm.tsx
│           └── UpdatePasswordForm.tsx
└── infrastructure/
    └── supabase/
        └── middleware.ts  # Middleware-Client Helper
```

---

## Hinweise

- UI-Design exakt nach `login_screen.png`
- Deutsche Fehlermeldungen aus `Rules.md`
- Session Cookie muss HttpOnly sein
- Rate Limiting: 5 Fehlversuche pro 15 Minuten (Supabase Auth built-in)
- Reset-Link gültig für 1 Stunde
- "Angemeldet bleiben" verlängert Session auf 7 Tage

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Login funktioniert mit gültigen Credentials
- [ ] Fehlermeldung bei ungültigen Credentials
- [ ] Redirect basierend auf Rolle
- [ ] Passwort vergessen Flow funktioniert
- [ ] Route Protection für nicht-eingeloggte User
- [ ] Session bleibt nach Page Refresh erhalten

---

*Vorheriger Prompt: 03 – Clean Architecture Grundstruktur*
*Nächster Prompt: 05 – Multi-Tenancy & RLS*
