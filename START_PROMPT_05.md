# Start-Prompt: planned. – Fortsetzung ab Prompt 05

## Projektübersicht

Du hilfst mir bei der Entwicklung von **planned.** – einer Webanwendung zur Kapazitäts- und Einsatzplanung für Holzbauunternehmen (Zimmereien, Generalunternehmen).

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **Architektur**: Clean Architecture mit DI Container

---

## ✅ Bereits implementiert (Prompts 01-04)

### Prompt 01 – Next.js Projekt-Initialisierung
- Next.js 15 mit TypeScript strict mode
- Tailwind CSS + shadcn/ui
- Clean Architecture Ordnerstruktur

### Prompt 02 – Supabase Integration
- Vier Supabase-Clients (Server, Browser, Action, Admin)
- Generierte TypeScript Types
- Alle Tabellen und RLS-Policies

### Prompt 03 – Clean Architecture Grundstruktur
- DI Container (Singleton)
- ActionResult Pattern
- Domain Errors (ValidationError, NotFoundError, etc.)
- Error Codes

### Prompt 04 – Supabase Auth Integration
- Login mit E-Mail/Passwort
- Rollen-basierter Redirect nach Login
- Passwort vergessen/zurücksetzen Flow
- Route Protection Middleware
- "Angemeldet bleiben" Checkbox

**Erstellte Dateien:**
```
middleware.ts
src/
├── infrastructure/supabase/middleware.ts
├── presentation/
│   ├── actions/auth.ts
│   └── components/
│       ├── ui/ (button, input, label, checkbox)
│       └── auth/ (LoginForm, ResetPasswordForm, UpdatePasswordForm)
├── app/(auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── reset-password/page.tsx
│   └── update-password/page.tsx
tests/e2e/auth/login.spec.ts
```

**Validierung:** ✅ 95 Tests bestanden, TypeCheck clean, ESLint clean

---

## 📁 Ordnerstruktur

### `guard rails/` – Projektdokumentation

| Datei | Beschreibung |
|-------|--------------|
| **FEATURES.md** | Alle Features mit Gherkin-Akzeptanzkriterien |
| **DATA_MODEL.md** | Datenbankschema, Tabellen, RLS-Policies |
| **API_SPEC.md** | ActionResult Pattern, Error Codes |
| **FOLDER_STRUCTURE.md** | Clean Architecture Schichten |
| **Rules.md** | Coding-Konventionen, deutsche Fehlermeldungen |

### `Prompts/` – Implementierungs-Prompts
- **INDEX.md** – Übersicht aller 31 Prompts
- Jeder Prompt enthält TDD-Schritte (🔴→🟢→🔵)

### `Stitch UI Screens/` – UI-Referenzen
- Screenshots für pixelgenaue Implementierung

---

## 🎯 Nächster Schritt: Prompt 05 – Multi-Tenancy & RLS

### Ziel
Implementiere Multi-Tenancy mit Row Level Security für Mandantentrennung.

### Was zu tun ist
1. Tenant Entity erstellen
2. useTenant Hook implementieren
3. TenantContext für Client-Komponenten
4. RLS-Policies verifizieren
5. Tenant-Switching für Super-Admins

### Referenz
- Lies `Prompts/05-multi-tenancy-rls.md` für alle Details
- Siehe `guard rails/DATA_MODEL.md` für die tenants-Tabelle
- Siehe `guard rails/FEATURES.md` für F2 (Multi-Tenancy)

---

## ⚠️ Arbeitsweise: Schritt-für-Schritt

**Nach jedem abgeschlossenen Schritt holst du dir mein "Go" ab.**

```
Agent: "Ich starte mit Prompt 05 – Multi-Tenancy & RLS.
       Schritt 1: Tenant Entity erstellen
       - src/domain/entities/Tenant.ts
       - src/domain/entities/__tests__/Tenant.test.ts

       Soll ich starten?"

User: "Go"

Agent: [führt aus, zeigt Ergebnis]

Agent: "Schritt 1 abgeschlossen. ✅
       Weiter mit Schritt 2: useTenant Hook?"

User: "Go"
```

---

## Wichtige Regeln

- **Domain Layer**: Keine externen Imports
- **Deutsche Fehlermeldungen** aus Rules.md
- **TDD**: Test zuerst schreiben
- **TypeScript strict**: Keine `any` Types

---

## Start

1. Lies `Prompts/05-multi-tenancy-rls.md`
2. Zeig mir deinen Plan für Schritt 1
3. Warte auf mein "Go"

**Los geht's mit Prompt 05!**
