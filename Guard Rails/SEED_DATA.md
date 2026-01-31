# planned. – Seed Data

> Testdaten für Entwicklung und E2E-Tests

**Version:** 1.2
**Datum:** 29. Januar 2026

---

## Übersicht

Dieses Dokument beschreibt die Seed-Daten für die lokale Entwicklung und E2E-Tests. Die Daten bilden einen realistischen Holzbaubetrieb mit mehreren Projekten, Mitarbeitern und Ressourcen ab.

### Testbetrieb

| Attribut | Wert |
|----------|------|
| **Name** | Zimmerei Holzbau Müller GmbH |
| **Slug** | `zimmerei-mueller` |
| **Mitarbeiter** | 8 Personen |
| **Fahrzeuge** | 3 |
| **Maschinen** | 2 |
| **Aktive Projekte** | 4 |

### Test-Login Credentials

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| **Admin** | hans.mueller@zimmerei-mueller.de | `Test1234!` |
| **Planer** | peter.schmidt@zimmerei-mueller.de | `Test1234!` |
| **Planer** | klaus.wagner@zimmerei-mueller.de | `Test1234!` |
| **Gewerblich** | max.bauer@zimmerei-mueller.de | `Test1234!` |

---

## ⚠️ WICHTIG: Auth-User-Verknüpfung

Die RLS-Policies in planned. basieren auf der `auth_id` in der `users`-Tabelle. Diese muss mit dem Supabase Auth User verknüpft sein:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTH FLOW                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Supabase Auth User         2. App User                     │
│   ┌──────────────────┐         ┌──────────────────┐            │
│   │ auth.users       │         │ public.users     │            │
│   │                  │         │                  │            │
│   │ id: UUID ────────┼────────►│ auth_id: UUID    │            │
│   │ email            │         │ tenant_id        │            │
│   │ password_hash    │         │ role             │            │
│   └──────────────────┘         └──────────────────┘            │
│                                                                 │
│   ⚠️ OHNE auth_id funktionieren RLS Policies NICHT!            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Seed-Strategie

Es gibt **zwei Möglichkeiten** um Seed-Daten mit funktionierender Auth zu erstellen:

| Methode | Verwendung | Automatisiert? |
|---------|------------|----------------|
| **A) TypeScript Seed Script** | Empfohlen für Development | ✅ Ja |
| **B) SQL + manuelle Auth** | Nur für spezielle Fälle | ❌ Nein |

---

## 1. TypeScript Seed Script (EMPFOHLEN)

Dieses Script erstellt sowohl Auth-Users als auch App-Users und verknüpft sie korrekt.

Datei: `supabase/seed.ts`

```typescript
// supabase/seed.ts
// 
// WICHTIG: Dieses Script erstellt Auth-Users UND verknüpft sie mit App-Users.
// Ausführung: npx tsx supabase/seed.ts
//
// Voraussetzungen:
// - Supabase CLI läuft (supabase start)
// - SUPABASE_SERVICE_ROLE_KEY ist gesetzt

import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt!');
  console.error('   Führe "supabase status" aus um den Key zu finden.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SEED DATA DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const TENANT = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Zimmerei Holzbau Müller GmbH',
  slug: 'zimmerei-mueller',
  settings: { defaultWeeklyHours: 40, logoUrl: null },
};

const USERS = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'hans.mueller@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Hans Müller',
    role: 'admin' as const,
    weeklyHours: 40,
    timetacId: null,
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'peter.schmidt@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Peter Schmidt',
    role: 'planer' as const,
    weeklyHours: 40,
    timetacId: null,
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'klaus.wagner@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Klaus Wagner',
    role: 'planer' as const,
    weeklyHours: 40,
    timetacId: null,
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'max.bauer@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Max Bauer',
    role: 'gewerblich' as const,
    weeklyHours: 40,
    timetacId: '1001',
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    email: 'lisa.weber@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Lisa Weber',
    role: 'gewerblich' as const,
    weeklyHours: 32, // Teilzeit
    timetacId: '1002',
  },
  {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    email: 'tom.schneider@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Tom Schneider',
    role: 'gewerblich' as const,
    weeklyHours: 40,
    timetacId: '1003',
  },
  {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'anna.fischer@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Anna Fischer',
    role: 'gewerblich' as const,
    weeklyHours: 40,
    timetacId: '1004',
  },
  {
    id: '22222222-3333-4444-5555-666666666666',
    email: 'markus.hoffmann@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Markus Hoffmann',
    role: 'gewerblich' as const,
    weeklyHours: 40,
    timetacId: '1005',
  },
];

const RESOURCE_TYPES = [
  { id: 'rt-11111111-1111-1111-1111-111111111111', name: 'Fahrzeug', icon: 'truck', color: '#3B82F6' },
  { id: 'rt-22222222-2222-2222-2222-222222222222', name: 'Maschine Montage', icon: 'crane', color: '#F59E0B' },
  { id: 'rt-33333333-3333-3333-3333-333333333333', name: 'Maschine Produktion', icon: 'cog', color: '#8B5CF6' },
];

const RESOURCES = [
  { id: 'res-11111111-1111-1111-1111-111111111111', typeId: 'rt-11111111-1111-1111-1111-111111111111', name: 'Sprinter 1', licensePlate: 'M-ZM 1234' },
  { id: 'res-22222222-2222-2222-2222-222222222222', typeId: 'rt-11111111-1111-1111-1111-111111111111', name: 'Sprinter 2', licensePlate: 'M-ZM 5678' },
  { id: 'res-33333333-3333-3333-3333-333333333333', typeId: 'rt-11111111-1111-1111-1111-111111111111', name: 'MAN LKW', licensePlate: 'M-ZM 9999' },
  { id: 'res-44444444-4444-4444-4444-444444444444', typeId: 'rt-22222222-2222-2222-2222-222222222222', name: 'Autokran 30t', licensePlate: null },
  { id: 'res-55555555-5555-5555-5555-555555555555', typeId: 'rt-33333333-3333-3333-3333-333333333333', name: 'CNC Abbundanlage', licensePlate: null },
];

const PROJECTS = [
  {
    id: 'proj-11111111-1111-1111-1111-111111111111',
    name: 'BVH 24-01: EFH Weber',
    clientName: 'Familie Weber',
    address: 'Waldstraße 42, 82031 Grünwald',
    status: 'active',
    asanaGid: 'asana_project_001',
  },
  {
    id: 'proj-22222222-2222-2222-2222-222222222222',
    name: 'BVH 24-02: Garage Schmitt',
    clientName: 'Herr Schmitt',
    address: 'Bergweg 7, 85521 Ottobrunn',
    status: 'active',
    asanaGid: 'asana_project_002',
  },
  {
    id: 'proj-33333333-3333-3333-3333-333333333333',
    name: 'BVH 24-03: DHH Meier/Koch',
    clientName: 'Familien Meier & Koch',
    address: 'Am Anger 15, 82041 Oberhaching',
    status: 'planned',
    asanaGid: 'asana_project_003',
  },
  {
    id: 'proj-44444444-4444-4444-4444-444444444444',
    name: 'BVH 24-04: Kindergarten Sonnenschein',
    clientName: 'Stadt München',
    address: 'Schulweg 8, 81549 München',
    status: 'active',
    asanaGid: 'asana_project_004',
  },
];

const PROJECT_PHASES = [
  // Projekt 1: EFH Weber
  { id: 'phase-1a', projectId: 'proj-11111111-1111-1111-1111-111111111111', name: 'Elementierung Außenwände', bereich: 'produktion', budgetHours: 80, plannedHours: 80, actualHours: 24, sortOrder: 1, asanaGid: 'asana_task_001a' },
  { id: 'phase-1b', projectId: 'proj-11111111-1111-1111-1111-111111111111', name: 'Elementierung Innenwände', bereich: 'produktion', budgetHours: 48, plannedHours: 40, actualHours: 0, sortOrder: 2, asanaGid: 'asana_task_001b' },
  { id: 'phase-1c', projectId: 'proj-11111111-1111-1111-1111-111111111111', name: 'Montage Rohbau', bereich: 'montage', budgetHours: 64, plannedHours: 0, actualHours: 0, sortOrder: 3, asanaGid: 'asana_task_001c' },
  
  // Projekt 2: Garage Schmitt
  { id: 'phase-2a', projectId: 'proj-22222222-2222-2222-2222-222222222222', name: 'Abbund Carport', bereich: 'produktion', budgetHours: 16, plannedHours: 16, actualHours: 16, sortOrder: 1, asanaGid: 'asana_task_002a' },
  { id: 'phase-2b', projectId: 'proj-22222222-2222-2222-2222-222222222222', name: 'Montage Carport', bereich: 'montage', budgetHours: 16, plannedHours: 16, actualHours: 4, sortOrder: 2, asanaGid: 'asana_task_002b' },
  
  // Projekt 3: DHH (geplant)
  { id: 'phase-3a', projectId: 'proj-33333333-3333-3333-3333-333333333333', name: 'Elementierung EG', bereich: 'produktion', budgetHours: 120, plannedHours: 0, actualHours: 0, sortOrder: 1, asanaGid: 'asana_task_003a' },
  { id: 'phase-3b', projectId: 'proj-33333333-3333-3333-3333-333333333333', name: 'Montage EG', bereich: 'montage', budgetHours: 80, plannedHours: 0, actualHours: 0, sortOrder: 2, asanaGid: 'asana_task_003b' },
  
  // Projekt 4: Kindergarten
  { id: 'phase-4a', projectId: 'proj-44444444-4444-4444-4444-444444444444', name: 'Dachstuhl Vorbereitung', bereich: 'produktion', budgetHours: 160, plannedHours: 80, actualHours: 40, sortOrder: 1, asanaGid: 'asana_task_004a' },
  { id: 'phase-4b', projectId: 'proj-44444444-4444-4444-4444-444444444444', name: 'Dachstuhl Montage', bereich: 'montage', budgetHours: 120, plannedHours: 0, actualHours: 0, sortOrder: 2, asanaGid: 'asana_task_004b' },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getMonday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function seed() {
  console.log('🌱 Starting seed process...\n');

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Cleanup existing data
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🧹 Cleaning up existing data...');
    
    // Delete in reverse order of dependencies
    await supabase.from('sync_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('time_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('absences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('project_phases').delete().neq('id', '');
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('resources').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('resource_types').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('integration_credentials').delete().neq('tenant_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    for (const authUser of authUsers?.users || []) {
      if (authUser.email?.endsWith('@zimmerei-mueller.de')) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    }
    
    console.log('   ✅ Cleanup complete\n');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Create Tenant
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🏢 Creating tenant...');
    
    const { error: tenantError } = await supabase.from('tenants').insert({
      id: TENANT.id,
      name: TENANT.name,
      slug: TENANT.slug,
      settings: TENANT.settings,
    });
    
    if (tenantError) throw new Error(`Tenant creation failed: ${tenantError.message}`);
    console.log(`   ✅ Created: ${TENANT.name}\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Create Integration Credentials (empty)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🔑 Creating integration credentials...');
    
    await supabase.from('integration_credentials').insert({
      tenant_id: TENANT.id,
    });
    
    console.log('   ✅ Created empty credentials\n');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Create Auth Users AND App Users (CRITICAL!)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('👥 Creating users with auth linking...');
    
    for (const user of USERS) {
      // 4a. Create Supabase Auth User
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
        },
      });
      
      if (authError) {
        console.error(`   ❌ Auth creation failed for ${user.email}: ${authError.message}`);
        continue;
      }
      
      const authId = authData.user.id;
      
      // 4b. Create App User with auth_id linked
      const { error: userError } = await supabase.from('users').insert({
        id: user.id,
        tenant_id: TENANT.id,
        auth_id: authId,  // ← CRITICAL: Link to auth user!
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        weekly_hours: user.weeklyHours,
        is_active: true,
        timetac_id: user.timetacId,
      });
      
      if (userError) {
        console.error(`   ❌ User creation failed for ${user.email}: ${userError.message}`);
        // Rollback auth user
        await supabase.auth.admin.deleteUser(authId);
        continue;
      }
      
      console.log(`   ✅ ${user.fullName} (${user.role}) - auth_id: ${authId.substring(0, 8)}...`);
    }
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Create Resource Types
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📦 Creating resource types...');
    
    for (const type of RESOURCE_TYPES) {
      await supabase.from('resource_types').insert({
        id: type.id,
        tenant_id: TENANT.id,
        name: type.name,
        icon: type.icon,
        color: type.color,
      });
      console.log(`   ✅ ${type.name}`);
    }
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Create Resources
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🚗 Creating resources...');
    
    for (const resource of RESOURCES) {
      await supabase.from('resources').insert({
        id: resource.id,
        tenant_id: TENANT.id,
        resource_type_id: resource.typeId,
        name: resource.name,
        license_plate: resource.licensePlate,
        is_active: true,
      });
      console.log(`   ✅ ${resource.name}`);
    }
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Create Projects
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🏗️ Creating projects...');
    
    for (const project of PROJECTS) {
      await supabase.from('projects').insert({
        id: project.id,
        tenant_id: TENANT.id,
        name: project.name,
        client_name: project.clientName,
        address: project.address,
        status: project.status,
        asana_gid: project.asanaGid,
        synced_at: new Date().toISOString(),
      });
      console.log(`   ✅ ${project.name}`);
    }
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Create Project Phases
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📋 Creating project phases...');
    
    const monday = getMonday();
    const phaseStart = formatDate(monday);
    const phaseEnd = formatDate(addDays(monday, 14)); // 2 Wochen
    
    for (const phase of PROJECT_PHASES) {
      await supabase.from('project_phases').insert({
        id: phase.id,
        project_id: phase.projectId,
        name: phase.name,
        bereich: phase.bereich,
        start_date: phaseStart,
        end_date: phaseEnd,
        budget_hours: phase.budgetHours,
        planned_hours: phase.plannedHours,
        actual_hours: phase.actualHours,
        sort_order: phase.sortOrder,
        asana_gid: phase.asanaGid,
      });
      console.log(`   ✅ ${phase.name}`);
    }
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9: Create Allocations (current week)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📅 Creating allocations for current week...');

    // ═══════════════════════════════════════════════════════════════════════
    // STABILE ALLOCATION IDs
    // ═══════════════════════════════════════════════════════════════════════
    // Diese IDs ermöglichen reproduzierbare E2E-Tests und deterministisches Verhalten.
    // Format: alloc-{user/res}-{phase}-{weekday}
    //
    // WICHTIG: Bei Tests diese IDs aus fixtures/seed-data.ts importieren!
    // ═══════════════════════════════════════════════════════════════════════

    const allocations = [
      // Montag - Freitag: Max Bauer auf Elementierung Außenwände
      ...['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((day, i) => ({
        id: `alloc-max-1a-${day.toLowerCase()}`,
        userId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        phaseId: 'phase-1a',
        date: formatDate(addDays(monday, i)),
        plannedHours: 8,
      })),
      
      // Montag - Freitag: Lisa Weber auf Elementierung Außenwände (Teilzeit)
      ...['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((day, i) => ({
        id: `alloc-lisa-1a-${day.toLowerCase()}`,
        userId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        phaseId: 'phase-1a',
        date: formatDate(addDays(monday, i)),
        plannedHours: 6.4, // 32h / 5 Tage
      })),

      // Mo-Mi: Anna Fischer auf Elementierung, Do-Fr: auf Kindergarten
      ...['Mo', 'Di', 'Mi'].map((day, i) => ({
        id: `alloc-anna-1a-${day.toLowerCase()}`,
        userId: '11111111-2222-3333-4444-555555555555',
        phaseId: 'phase-1a',
        date: formatDate(addDays(monday, i)),
        plannedHours: 8,
      })),
      ...['Do', 'Fr'].map((day, i) => ({
        id: `alloc-anna-4a-${day.toLowerCase()}`,
        userId: '11111111-2222-3333-4444-555555555555',
        phaseId: 'phase-4a',
        date: formatDate(addDays(monday, i + 3)),
        plannedHours: 8,
      })),

      // Mo-Di: Markus auf Garage, Mi-Fr: auf EFH Weber
      ...['Mo', 'Di'].map((day, i) => ({
        id: `alloc-markus-2b-${day.toLowerCase()}`,
        userId: '22222222-3333-4444-5555-666666666666',
        phaseId: 'phase-2b',
        date: formatDate(addDays(monday, i)),
        plannedHours: 8,
      })),
      ...['Mi', 'Do', 'Fr'].map((day, i) => ({
        id: `alloc-markus-1a-${day.toLowerCase()}`,
        userId: '22222222-3333-4444-5555-666666666666',
        phaseId: 'phase-1a',
        date: formatDate(addDays(monday, i + 2)),
        plannedHours: 8,
      })),

      // Sprinter 1 für Montage Carport (Mo-Di)
      ...['Mo', 'Di'].map((day, i) => ({
        id: `alloc-sprinter1-2b-${day.toLowerCase()}`,
        resourceId: 'res-11111111-1111-1111-1111-111111111111',
        phaseId: 'phase-2b',
        date: formatDate(addDays(monday, i)),
      })),

      // Autokran nur Dienstag für Montage
      {
        id: 'alloc-kran-2b-di',
        resourceId: 'res-44444444-4444-4444-4444-444444444444',
        phaseId: 'phase-2b',
        date: formatDate(addDays(monday, 1)), // Dienstag
      },
    ];
    
    for (const alloc of allocations) {
      const insertData: Record<string, unknown> = {
        id: alloc.id,  // Stabile ID für E2E-Tests!
        tenant_id: TENANT.id,
        project_phase_id: alloc.phaseId,
        date: alloc.date,
      };

      if ('userId' in alloc) {
        insertData.user_id = alloc.userId;
        insertData.planned_hours = alloc.plannedHours;
      } else {
        insertData.resource_id = alloc.resourceId;
      }

      await supabase.from('allocations').insert(insertData);
    }
    
    console.log(`   ✅ Created ${allocations.length} allocations\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10: Create Absences
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🏖️ Creating absences...');
    
    // Tom Schneider hat diese Woche Urlaub
    await supabase.from('absences').insert({
      tenant_id: TENANT.id,
      user_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      type: 'vacation',  // DB-Wert: 'vacation' → UI: 'Urlaub'
      start_date: formatDate(monday),
      end_date: formatDate(addDays(monday, 4)),
      timetac_id: 'timetac_absence_001',
    });
    console.log('   ✅ Tom Schneider: Urlaub (Mo-Fr)\n');

    // ─────────────────────────────────────────────────────────────────────────
    // DONE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ SEED COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Test Login:');
    console.log('  Admin:  hans.mueller@zimmerei-mueller.de / Test1234!');
    console.log('  Planer: peter.schmidt@zimmerei-mueller.de / Test1234!');
    console.log('');

  } catch (error) {
    console.error('\n❌ SEED FAILED:', error);
    process.exit(1);
  }
}

// Run
seed();
```

---

## 2. SQL Seed Script (Alternative - ohne Auth)

Dieses Script erstellt nur die Daten in der `public` Schema. **Auth-Users müssen separat erstellt werden!**

> ⚠️ **WARNUNG:** Dieses Script allein reicht NICHT aus! Die RLS-Policies funktionieren nur mit gesetzter `auth_id`.

Datei: `supabase/seed.sql`

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- planned. - Seed Data für Entwicklung & E2E-Tests
-- Datei: supabase/seed.sql
-- 
-- ⚠️ ACHTUNG: Dieses Script erstellt KEINE Auth-Users!
--    Die auth_id bleibt NULL und RLS-Policies funktionieren NICHT.
--    
--    Für vollständiges Setup verwende: npx tsx supabase/seed.ts
-- 
-- Ausführung:
--   supabase db reset        (führt seed.sql automatisch aus)
-- ═══════════════════════════════════════════════════════════════════════════

-- Cleanup (falls bereits Daten existieren)
TRUNCATE TABLE 
  sync_logs, 
  time_entries, 
  absences, 
  allocations, 
  project_phases, 
  projects, 
  resources, 
  resource_types, 
  integration_credentials, 
  users, 
  tenants 
CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- TENANT
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO tenants (id, name, slug, settings) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Zimmerei Holzbau Müller GmbH',
    'zimmerei-mueller',
    '{"defaultWeeklyHours": 40, "logoUrl": null}'::jsonb
  );

-- Integration Credentials (leer)
INSERT INTO integration_credentials (tenant_id) VALUES
  ('11111111-1111-1111-1111-111111111111');

-- ═══════════════════════════════════════════════════════════════════════════
-- USERS (⚠️ auth_id ist NULL - RLS funktioniert nicht!)
-- ═══════════════════════════════════════════════════════════════════════════

-- Admin
INSERT INTO users (id, tenant_id, auth_id, email, full_name, role, weekly_hours, is_active) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    NULL,  -- ⚠️ MUSS später gesetzt werden!
    'hans.mueller@zimmerei-mueller.de',
    'Hans Müller',
    'admin',
    40,
    true
  );

-- Planer
INSERT INTO users (id, tenant_id, auth_id, email, full_name, role, weekly_hours, is_active) VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'peter.schmidt@zimmerei-mueller.de',
    'Peter Schmidt',
    'planer',
    40,
    true
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'klaus.wagner@zimmerei-mueller.de',
    'Klaus Wagner',
    'planer',
    40,
    true
  );

-- Gewerbliche Mitarbeiter
INSERT INTO users (id, tenant_id, auth_id, email, full_name, role, weekly_hours, is_active, timetac_id) VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'max.bauer@zimmerei-mueller.de',
    'Max Bauer',
    'gewerblich',
    40,
    true,
    '1001'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'lisa.weber@zimmerei-mueller.de',
    'Lisa Weber',
    'gewerblich',
    32,
    true,
    '1002'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'tom.schneider@zimmerei-mueller.de',
    'Tom Schneider',
    'gewerblich',
    40,
    true,
    '1003'
  ),
  (
    '11111111-2222-3333-4444-555555555555',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'anna.fischer@zimmerei-mueller.de',
    'Anna Fischer',
    'gewerblich',
    40,
    true,
    '1004'
  ),
  (
    '22222222-3333-4444-5555-666666666666',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'markus.hoffmann@zimmerei-mueller.de',
    'Markus Hoffmann',
    'gewerblich',
    40,
    true,
    '1005'
  );

-- Weitere Tabellen werden wie im Original eingefügt...
-- (Resource Types, Resources, Projects, Phases, Allocations, Absences)

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ WICHTIG: Nach dem Ausführen dieses Scripts muss auth_id gesetzt werden!
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Option 1: TypeScript Script verwenden (empfohlen)
--   npx tsx supabase/seed.ts
--
-- Option 2: Manuell Auth-Users erstellen und verknüpfen
--   1. In Supabase Dashboard: Auth > Users > Create user
--   2. SQL ausführen:
--      UPDATE users SET auth_id = '<auth_user_uuid>' WHERE email = '<email>';
-- ═══════════════════════════════════════════════════════════════════════════
```

---

## 3. NPM Scripts

Datei: `package.json` (Auszug)

```json
{
  "scripts": {
    "db:reset": "supabase db reset",
    "db:seed": "npx tsx supabase/seed.ts",
    "db:seed:sql": "supabase db reset && echo '⚠️ Auth-Users müssen noch verknüpft werden!'",
    "test:e2e": "playwright test",
    "test:e2e:setup": "npx tsx tests/e2e/setup/global-setup.ts"
  }
}
```

**Empfohlener Workflow:**

```bash
# 1. Supabase lokal starten
supabase start

# 2. Seed mit Auth-Verknüpfung ausführen
npm run db:seed

# 3. App starten
npm run dev

# 4. Login mit Test-Credentials:
#    hans.mueller@zimmerei-mueller.de / Test1234!
```

---

## 4. E2E Test Fixtures

Datei: `tests/e2e/fixtures/seed-data.ts`

```typescript
// tests/e2e/fixtures/seed-data.ts

export const USERS = {
  admin: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'hans.mueller@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Hans Müller',
    role: 'admin' as const,
  },
  planer: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'peter.schmidt@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Peter Schmidt',
    role: 'planer' as const,
  },
  planer2: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'klaus.wagner@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Klaus Wagner',
    role: 'planer' as const,
  },
  gewerblich: {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'max.bauer@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Max Bauer',
    role: 'gewerblich' as const,
  },
  teilzeit: {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    email: 'lisa.weber@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Lisa Weber',
    role: 'gewerblich' as const,
    weeklyHours: 32,
  },
  urlaub: {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    email: 'tom.schneider@zimmerei-mueller.de',
    password: 'Test1234!',
    fullName: 'Tom Schneider',
    role: 'gewerblich' as const,
  },
};

export const TENANT = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Zimmerei Holzbau Müller GmbH',
  slug: 'zimmerei-mueller',
};

export const PROJECTS = {
  efhWeber: {
    id: 'proj-11111111-1111-1111-1111-111111111111',
    name: 'BVH 24-01: EFH Weber',
    status: 'active' as const,
  },
  garageSchmitt: {
    id: 'proj-22222222-2222-2222-2222-222222222222',
    name: 'BVH 24-02: Garage Schmitt',
    status: 'active' as const,
  },
  dhhMeierKoch: {
    id: 'proj-33333333-3333-3333-3333-333333333333',
    name: 'BVH 24-03: DHH Meier/Koch',
    status: 'planned' as const,
  },
  kindergarten: {
    id: 'proj-44444444-4444-4444-4444-444444444444',
    name: 'BVH 24-04: Kindergarten Sonnenschein',
    status: 'active' as const,
  },
};

export const PHASES = {
  efhWeber_aussenwand: {
    id: 'phase-1a',
    projectId: PROJECTS.efhWeber.id,
    name: 'Elementierung Außenwände',
    bereich: 'produktion' as const,
    budgetHours: 80,
  },
  efhWeber_montage: {
    id: 'phase-1c',
    projectId: PROJECTS.efhWeber.id,
    name: 'Montage Rohbau',
    bereich: 'montage' as const,
    budgetHours: 64,
  },
  garage_montage: {
    id: 'phase-2b',
    projectId: PROJECTS.garageSchmitt.id,
    name: 'Montage Carport',
    bereich: 'montage' as const,
    budgetHours: 16,
  },
};

/**
 * Stabile Allocation-IDs für E2E-Tests.
 * Format: alloc-{user/res}-{phase}-{weekday}
 *
 * Verwendung in Tests:
 *   expect(page.locator(`[data-allocation-id="${ALLOCATIONS.maxBauer.monday}"]`)).toBeVisible();
 */
export const ALLOCATIONS = {
  // Max Bauer auf Phase 1a (Elementierung Außenwände)
  maxBauer: {
    monday: 'alloc-max-1a-mo',
    tuesday: 'alloc-max-1a-di',
    wednesday: 'alloc-max-1a-mi',
    thursday: 'alloc-max-1a-do',
    friday: 'alloc-max-1a-fr',
  },
  // Lisa Weber auf Phase 1a (Teilzeit)
  lisaWeber: {
    monday: 'alloc-lisa-1a-mo',
    tuesday: 'alloc-lisa-1a-di',
    wednesday: 'alloc-lisa-1a-mi',
    thursday: 'alloc-lisa-1a-do',
    friday: 'alloc-lisa-1a-fr',
  },
  // Anna Fischer: Mo-Mi auf 1a, Do-Fr auf 4a
  annaFischer: {
    phase1a: {
      monday: 'alloc-anna-1a-mo',
      tuesday: 'alloc-anna-1a-di',
      wednesday: 'alloc-anna-1a-mi',
    },
    phase4a: {
      thursday: 'alloc-anna-4a-do',
      friday: 'alloc-anna-4a-fr',
    },
  },
  // Markus Hoffmann: Mo-Di auf 2b, Mi-Fr auf 1a
  markusHoffmann: {
    phase2b: {
      monday: 'alloc-markus-2b-mo',
      tuesday: 'alloc-markus-2b-di',
    },
    phase1a: {
      wednesday: 'alloc-markus-1a-mi',
      thursday: 'alloc-markus-1a-do',
      friday: 'alloc-markus-1a-fr',
    },
  },
  // Ressourcen
  sprinter1: {
    monday: 'alloc-sprinter1-2b-mo',
    tuesday: 'alloc-sprinter1-2b-di',
  },
  autokran: {
    tuesday: 'alloc-kran-2b-di',
  },
};

// Helper Functions
export function getMonday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
```

---

## 5. Playwright E2E Global Setup

Datei: `tests/e2e/setup/global-setup.ts`

```typescript
// tests/e2e/setup/global-setup.ts

import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { USERS } from '../fixtures/seed-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function globalSetup(config: FullConfig) {
  console.log('\n🔧 Setting up E2E test environment...\n');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Verify Auth-Users exist and are linked
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Verifying auth users...');
  
  for (const [key, user] of Object.entries(USERS)) {
    // Check if app user has auth_id set
    const { data: appUser } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', user.id)
      .single();
    
    if (!appUser?.auth_id) {
      console.error(`❌ User ${user.email} has no auth_id! Run 'npm run db:seed' first.`);
      process.exit(1);
    }
    
    console.log(`  ✅ ${user.email} - auth linked`);
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Create authenticated sessions for different roles
  // ─────────────────────────────────────────────────────────────────────────
  const browser = await chromium.launch();
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Admin Session
  console.log('Creating admin session...');
  const adminPage = await browser.newPage();
  await adminPage.goto(`${baseURL}/login`);
  await adminPage.fill('input[name="email"]', USERS.admin.email);
  await adminPage.fill('input[name="password"]', USERS.admin.password);
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL('**/dashboard');
  await adminPage.context().storageState({ path: 'tests/e2e/.auth/admin.json' });
  console.log('  ✅ Admin session saved\n');
  
  // Planer Session
  console.log('Creating planer session...');
  const planerPage = await browser.newPage();
  await planerPage.goto(`${baseURL}/login`);
  await planerPage.fill('input[name="email"]', USERS.planer.email);
  await planerPage.fill('input[name="password"]', USERS.planer.password);
  await planerPage.click('button[type="submit"]');
  await planerPage.waitForURL('**/dashboard');
  await planerPage.context().storageState({ path: 'tests/e2e/.auth/planer.json' });
  console.log('  ✅ Planer session saved\n');
  
  // Gewerblich Session
  console.log('Creating gewerblich session...');
  const gewerblichPage = await browser.newPage();
  await gewerblichPage.goto(`${baseURL}/login`);
  await gewerblichPage.fill('input[name="email"]', USERS.gewerblich.email);
  await gewerblichPage.fill('input[name="password"]', USERS.gewerblich.password);
  await gewerblichPage.click('button[type="submit"]');
  await gewerblichPage.waitForURL('**/meine-woche');
  await gewerblichPage.context().storageState({ path: 'tests/e2e/.auth/gewerblich.json' });
  console.log('  ✅ Gewerblich session saved\n');
  
  await browser.close();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ E2E SETUP COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

export default globalSetup;
```

---

## 6. Testszenarien

Die Seed-Daten bilden folgende Testszenarien ab:

### Szenario 1: Normale Arbeitswoche
- 4 Mitarbeiter arbeiten auf Projekt 1 (Elementierung)
- 1 Mitarbeiter (Markus) wechselt Mi von Projekt 2 zu Projekt 1

### Szenario 2: Abwesenheit
- Tom Schneider hat diese Woche Urlaub
- Sollte im Pool als "Abwesend" markiert sein
- Allocation-Versuch sollte Warnung zeigen

### Szenario 3: Teilzeit-Mitarbeiter
- Lisa Weber arbeitet 32h/Woche (80%)
- PlannedHours sollten korrekt berechnet werden (6.4h/Tag)

### Szenario 4: Ressourcen-Buchung
- Sprinter 1 für Montage Carport gebucht
- Autokran nur am Dienstag

### Szenario 5: IST vs SOLL
- Phase "Abbund Carport" ist fertig (16/16h)
- Phase "Montage Carport" läuft (4/16h)
- Phase "Elementierung Außenwände" läuft (24/80h)

### Szenario 6: Projekt-Status
- 3 aktive Projekte
- 1 Projekt in Planung

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial - Vollständiges Seed Script mit realistischem Holzbaubetrieb |
| 1.1 | Januar 2026 | **Auth-User-Verknüpfung behoben:** TypeScript Seed Script erstellt Auth-Users UND verknüpft sie korrekt mit `auth_id`, SQL-Script mit Warnhinweisen versehen, E2E Global Setup validiert Auth-Verknüpfung, Test Login Credentials dokumentiert |
| 1.2 | Januar 2026 | + **Stabile Allocation-IDs** für E2E-Tests, + **ALLOCATIONS Fixture** mit hierarchischer Struktur |

---

*Version: 1.2 für Antigravity*
*Erstellt: 29. Januar 2026*
