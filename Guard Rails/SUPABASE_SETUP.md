# planned. – Supabase Setup

> Vollständige Migrations, RLS Policies, Trigger und Setup-Anleitung

**Version:** 1.2
**Datum:** 29. Januar 2026

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Projekt-Setup](#2-projekt-setup)
3. [Migrationen](#3-migrationen)
4. [Seed Data](#4-seed-data)
5. [Realtime Konfiguration](#5-realtime-konfiguration)
6. [Storage Setup](#6-storage-setup)
7. [Edge Functions](#7-edge-functions)
8. [Lokale Entwicklung](#8-lokale-entwicklung)

---

## 1. Voraussetzungen

```bash
# Supabase CLI installieren
npm install -g supabase

# Oder via Homebrew (macOS)
brew install supabase/tap/supabase

# Version prüfen (min. 1.100+)
supabase --version
```

### Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle ein neues Projekt
2. **Region:** Frankfurt (eu-central-1) – DSGVO-konform
3. **Database Password:** Sicheres Passwort generieren und speichern
4. Warte bis das Projekt initialisiert ist (~2 Minuten)

### Zugangsdaten holen

Nach der Initialisierung findest du in den Project Settings:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (NIEMALS im Client!)

### Vollständige Umgebungsvariablen

```bash
# .env.local

# ═══════════════════════════════════════════════════════════════
# SUPABASE (Pflicht)
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# ═══════════════════════════════════════════════════════════════
# ASANA INTEGRATION (Pflicht für Projekt-Sync)
# ═══════════════════════════════════════════════════════════════
ASANA_CLIENT_ID=xxx
ASANA_CLIENT_SECRET=xxx
ASANA_WEBHOOK_SECRET=xxx  # Generiert von Asana für Webhook-Verifizierung

# ═══════════════════════════════════════════════════════════════
# TIMETAC INTEGRATION (Optional)
# ═══════════════════════════════════════════════════════════════
TIMETAC_ACCOUNT=xxx       # TimeTac Account-Name/ID
# Hinweis: API-Token wird pro Tenant verschlüsselt in DB gespeichert

# ═══════════════════════════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════════════════════════
ENCRYPTION_KEY=xxx        # 32 Bytes, Base64-encoded für Token-Verschlüsselung

# ═══════════════════════════════════════════════════════════════
# APP
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ═══════════════════════════════════════════════════════════════
# RATE LIMITING (Upstash Redis)
# ═══════════════════════════════════════════════════════════════
UPSTASH_REDIS_REST_URL=xxx   # Von Upstash Console
UPSTASH_REDIS_REST_TOKEN=xxx # Von Upstash Console

# ═══════════════════════════════════════════════════════════════
# CRON JOBS (Vercel)
# ═══════════════════════════════════════════════════════════════
CRON_SECRET=xxx              # Min. 16 Zeichen, für /api/cron/* Authentifizierung
```

---

## 2. Projekt-Setup

### Lokales Supabase initialisieren

```bash
# Im Projekt-Root
supabase init

# Mit Remote-Projekt verknüpfen
supabase link --project-ref YOUR_PROJECT_REF

# Datenbank-URL für Migrationen (optional)
supabase db remote commit
```

### Projektstruktur

```
supabase/
├── config.toml              # Supabase Konfiguration
├── migrations/
│   ├── 20260128000000_initial_schema.sql
│   ├── 20260128000001_rls_policies.sql
│   ├── 20260128000002_triggers.sql
│   └── 20260128000003_helper_functions.sql
├── seed.sql                 # Testdaten
└── functions/
    └── handle-auth-signup/  # Edge Function für Onboarding
```

---

## 3. Migrationen

### Migration 1: Initial Schema

Datei: `supabase/migrations/20260128000000_initial_schema.sql`

```sql
-- ===========================================================================
-- planned. - Initial Schema
-- Migration: 20260128000000_initial_schema.sql
-- Beschreibung: Erstellt alle Tabellen und Enums für das Datenmodell
-- ===========================================================================

-- ===============================================================
-- ENUMS
-- ===============================================================

CREATE TYPE user_role AS ENUM ('admin', 'planer', 'gewerblich');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed');
CREATE TYPE phase_bereich AS ENUM ('produktion', 'montage');
CREATE TYPE phase_status AS ENUM ('active', 'deleted');
CREATE TYPE absence_type AS ENUM ('vacation', 'sick', 'holiday', 'training', 'other');
CREATE TYPE sync_service AS ENUM ('asana', 'timetac');
CREATE TYPE sync_status AS ENUM ('running', 'success', 'partial', 'failed');

-- ===============================================================
-- TABLES
-- ===============================================================

-- Tenants (Mandanten)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{"defaultWeeklyHours": 40}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Mandanten/Firmen - jeder Holzbaubetrieb ist ein Tenant';
COMMENT ON COLUMN tenants.slug IS 'URL-freundlicher Identifier, z.B. "zimmerei-mueller"';
COMMENT ON COLUMN tenants.settings IS 'JSON mit defaultWeeklyHours, logoUrl, etc.';

-- Users (Mitarbeiter)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'gewerblich',
    weekly_hours DECIMAL(4,1) DEFAULT 40 CHECK (weekly_hours >= 0 AND weekly_hours <= 60),
    is_active BOOLEAN DEFAULT true,
    timetac_id TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, timetac_id)
);

COMMENT ON TABLE users IS 'Mitarbeiter eines Betriebs';
COMMENT ON COLUMN users.auth_id IS 'Referenz zu Supabase Auth - ermöglicht Login';
COMMENT ON COLUMN users.weekly_hours IS 'Individuelle Wochenstunden (0-60)';
COMMENT ON COLUMN users.timetac_id IS 'Externe ID für TimeTac-Mapping';

-- Integration Credentials (Zugangsdaten für externe Systeme)
CREATE TABLE integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    
    -- Asana OAuth
    asana_access_token TEXT,
    asana_refresh_token TEXT,
    asana_token_expires_at TIMESTAMPTZ,
    asana_workspace_id TEXT,
    asana_webhook_secret TEXT,
    
    -- Asana Custom Field Mappings
    asana_project_status_field_id TEXT,
    asana_phase_bereich_field_id TEXT,
    asana_phase_budget_hours_field_id TEXT,
    
    -- TimeTac API
    timetac_account_id TEXT,
    timetac_api_token TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE integration_credentials IS 'OAuth Tokens und API Keys pro Tenant (1:1)';
COMMENT ON COLUMN integration_credentials.asana_webhook_secret IS 'Wird von Asana generiert für Webhook-Verifizierung';

-- Resource Types (Ressourcen-Kategorien)
CREATE TABLE resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'box',
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

COMMENT ON TABLE resource_types IS 'Konfigurierbare Kategorien: Fahrzeug, Maschine Produktion, etc.';

-- Resources (Fahrzeuge, Maschinen)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type_id UUID NOT NULL REFERENCES resource_types(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    license_plate TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

COMMENT ON TABLE resources IS 'Konkrete Ressourcen: Sprinter 1, Kran Liebherr, etc.';
COMMENT ON COLUMN resources.license_plate IS 'Kennzeichen für Fahrzeuge';

-- Projects (Bauvorhaben)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client_name TEXT,
    address TEXT,
    status project_status DEFAULT 'planning',
    asana_gid TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, asana_gid)
);

COMMENT ON TABLE projects IS 'Bauvorhaben - werden aus Asana synchronisiert, nicht manuell erstellt';
COMMENT ON COLUMN projects.asana_gid IS 'Asana Project GID für Sync';

-- Project Phases (Arbeitspakete)
CREATE TABLE project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bereich phase_bereich NOT NULL,
    start_date DATE,
    end_date DATE,
    sort_order INTEGER DEFAULT 0,
    budget_hours DECIMAL(8,2) CHECK (budget_hours IS NULL OR budget_hours >= 0),
    planned_hours DECIMAL(8,2) DEFAULT 0 CHECK (planned_hours >= 0),
    actual_hours DECIMAL(8,2) DEFAULT 0 CHECK (actual_hours >= 0),
    status phase_status DEFAULT 'active',
    asana_gid TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_dates CHECK (
        start_date IS NULL OR end_date IS NULL OR end_date >= start_date
    )
);

COMMENT ON TABLE project_phases IS 'Arbeitspakete eines Projekts - aus Asana Tasks';
COMMENT ON COLUMN project_phases.bereich IS 'produktion (Werk) oder montage (Baustelle)';
COMMENT ON COLUMN project_phases.sort_order IS 'Reihenfolge innerhalb des Projekts';
COMMENT ON COLUMN project_phases.budget_hours IS 'SOLL-Stunden aus Asana Custom Field';
COMMENT ON COLUMN project_phases.planned_hours IS 'PLAN-Stunden: Summe aller Allocations (via Trigger aktualisiert)';
COMMENT ON COLUMN project_phases.actual_hours IS 'IST-Stunden aggregiert aus time_entries';

-- Unique Index für asana_gid (Soft-Unique wegen NULLs)
CREATE UNIQUE INDEX idx_project_phases_asana_gid
    ON project_phases(asana_gid)
    WHERE asana_gid IS NOT NULL;

-- Allocations (Zuweisungen)
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    project_phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    planned_hours DECIMAL(4,2) CHECK (planned_hours IS NULL OR (planned_hours >= 0 AND planned_hours <= 24)),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- XOR Constraint: Entweder User ODER Resource
    CONSTRAINT check_user_xor_resource CHECK (
        (user_id IS NOT NULL AND resource_id IS NULL) OR
        (user_id IS NULL AND resource_id IS NOT NULL)
    ),
    
    -- Unique Constraints verhindern Doppel-Allocations
    UNIQUE(user_id, project_phase_id, date),
    UNIQUE(resource_id, project_phase_id, date)
);

COMMENT ON TABLE allocations IS 'Kern-Entity: Zuweisung Person/Ressource → Phase für einen Tag';
COMMENT ON COLUMN allocations.planned_hours IS 'Wird automatisch via Trigger berechnet bei Usern';

-- Time Entries (IST-Stunden aus TimeTac)
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
    timetac_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE time_entries IS 'IST-Stunden importiert aus TimeTac';

-- Absences (Abwesenheiten)
CREATE TABLE absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type absence_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    timetac_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_absence_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE absences IS 'Abwesenheiten aus TimeTac (read-only)';

-- Sync Logs (Synchronisations-Protokoll)
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service sync_service NOT NULL,
    operation TEXT NOT NULL,
    status sync_status NOT NULL DEFAULT 'running',
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE sync_logs IS 'Protokoll aller Sync-Vorgänge mit Asana/TimeTac';

-- ===============================================================
-- INDEXES
-- ===============================================================

-- Users Indexes
CREATE INDEX idx_users_tenant_active ON users(tenant_id) WHERE is_active = true;
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_timetac_id ON users(tenant_id, timetac_id) WHERE timetac_id IS NOT NULL;

-- Allocations Indexes (Performance-kritisch für Grid)
CREATE INDEX idx_allocations_tenant_date ON allocations(tenant_id, date);
CREATE INDEX idx_allocations_user_date ON allocations(user_id, date) WHERE user_id IS NOT NULL;
CREATE INDEX idx_allocations_resource_date ON allocations(resource_id, date) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_allocations_phase ON allocations(project_phase_id);
CREATE INDEX idx_allocations_date_range ON allocations(date) 
    WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Time Entries Indexes
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX idx_time_entries_phase ON time_entries(project_phase_id);
CREATE INDEX idx_time_entries_tenant_date ON time_entries(tenant_id, date);

-- Absences Indexes
CREATE INDEX idx_absences_user_dates ON absences(user_id, start_date, end_date);
CREATE INDEX idx_absences_tenant_dates ON absences(tenant_id, start_date, end_date);

-- Project Phases Indexes
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_phases_status ON project_phases(status) WHERE status = 'active';

-- Projects Index
CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_asana_gid ON projects(tenant_id, asana_gid) WHERE asana_gid IS NOT NULL;

-- Sync Logs Index
CREATE INDEX idx_sync_logs_tenant_service ON sync_logs(tenant_id, service, started_at DESC);
```

---

### Migration 2: RLS Policies

Datei: `supabase/migrations/20260128000001_rls_policies.sql`

```sql
-- ===========================================================================
-- planned. - Row Level Security Policies
-- Migration: 20260128000001_rls_policies.sql
-- Beschreibung: Aktiviert RLS und definiert Zugriffspolicies pro Rolle
-- ===========================================================================

-- ===============================================================
-- RLS AKTIVIEREN
-- ===============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- ===============================================================
-- HELPER FUNCTIONS
-- ===============================================================

-- Gibt die Tenant-ID des aktuellen Users zurück
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id FROM users 
        WHERE auth_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Gibt die Rolle des aktuellen Users zurück
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM users 
        WHERE auth_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Prüft ob aktueller User Admin ist
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Prüft ob aktueller User Admin oder Planer ist
CREATE OR REPLACE FUNCTION is_current_user_planer_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() IN ('admin', 'planer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===============================================================
-- POLICIES: TENANTS
-- ===============================================================

-- Jeder sieht nur seinen eigenen Tenant
CREATE POLICY "tenant_select_own" ON tenants
    FOR SELECT
    USING (id = get_current_tenant_id());

-- Nur Admin kann Tenant updaten
CREATE POLICY "tenant_update_admin" ON tenants
    FOR UPDATE
    USING (id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (id = get_current_tenant_id() AND is_current_user_admin());

-- ===============================================================
-- POLICIES: USERS
-- ===============================================================

-- Alle im Tenant können alle User sehen
CREATE POLICY "users_select_tenant" ON users
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Nur Admin kann User erstellen
CREATE POLICY "users_insert_admin" ON users
    FOR INSERT
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- Nur Admin kann User ändern
CREATE POLICY "users_update_admin" ON users
    FOR UPDATE
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- Nur Admin kann User löschen
CREATE POLICY "users_delete_admin" ON users
    FOR DELETE
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- ===============================================================
-- POLICIES: INTEGRATION_CREDENTIALS
-- ===============================================================

-- Nur Admin kann Integration-Credentials sehen und verwalten
CREATE POLICY "integration_credentials_admin_only" ON integration_credentials
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- ===============================================================
-- POLICIES: RESOURCE_TYPES
-- ===============================================================

-- Alle im Tenant können Resource Types sehen
CREATE POLICY "resource_types_select_tenant" ON resource_types
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Admin kann Resource Types verwalten
CREATE POLICY "resource_types_manage_admin" ON resource_types
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- ===============================================================
-- POLICIES: RESOURCES
-- ===============================================================

-- Alle im Tenant können Resources sehen
CREATE POLICY "resources_select_tenant" ON resources
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Admin und Planer können Resources verwalten
CREATE POLICY "resources_manage_planer" ON resources
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_planer_or_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_planer_or_admin());

-- ===============================================================
-- POLICIES: PROJECTS
-- ===============================================================

-- Alle im Tenant können Projects sehen
CREATE POLICY "projects_select_tenant" ON projects
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Insert/Update/Delete nur via Service Account (Asana Sync)
-- Daher keine User-Policies für Schreibzugriff
-- Service Role Key bypassed RLS

-- ===============================================================
-- POLICIES: PROJECT_PHASES
-- ===============================================================

-- Alle im Tenant können Phases sehen (via Project-Join)
CREATE POLICY "project_phases_select_tenant" ON project_phases
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = project_phases.project_id 
            AND p.tenant_id = get_current_tenant_id()
        )
    );

-- Insert/Update/Delete nur via Service Account (Asana Sync)

-- ===============================================================
-- POLICIES: ALLOCATIONS
-- ===============================================================

-- Admin und Planer sehen alle Allocations im Tenant
CREATE POLICY "allocations_select_planer" ON allocations
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_current_user_planer_or_admin()
    );

-- Gewerbliche sehen nur eigene Allocations
CREATE POLICY "allocations_select_own" ON allocations
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id() 
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Nur Admin und Planer können Allocations erstellen
CREATE POLICY "allocations_insert_planer" ON allocations
    FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_current_user_planer_or_admin()
    );

-- Nur Admin und Planer können Allocations ändern
CREATE POLICY "allocations_update_planer" ON allocations
    FOR UPDATE
    USING (tenant_id = get_current_tenant_id() AND is_current_user_planer_or_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_planer_or_admin());

-- Nur Admin und Planer können Allocations löschen
CREATE POLICY "allocations_delete_planer" ON allocations
    FOR DELETE
    USING (tenant_id = get_current_tenant_id() AND is_current_user_planer_or_admin());

-- ===============================================================
-- POLICIES: TIME_ENTRIES
-- ===============================================================

-- Alle im Tenant können Time Entries sehen
CREATE POLICY "time_entries_select_tenant" ON time_entries
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Insert/Update/Delete nur via Service Account (TimeTac Sync)

-- ===============================================================
-- POLICIES: ABSENCES
-- ===============================================================

-- Admin und Planer sehen alle Absences im Tenant
CREATE POLICY "absences_select_planer" ON absences
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_current_user_planer_or_admin()
    );

-- Gewerbliche sehen nur eigene Absences
CREATE POLICY "absences_select_own" ON absences
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id() 
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Insert/Update/Delete nur via Service Account (TimeTac Sync)

-- ===============================================================
-- POLICIES: SYNC_LOGS
-- ===============================================================

-- Nur Admin kann Sync Logs sehen
CREATE POLICY "sync_logs_select_admin" ON sync_logs
    FOR SELECT
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- Insert nur via Service Account (Sync Jobs)
```

---

### Migration 3: Triggers

Datei: `supabase/migrations/20260128000002_triggers.sql`

```sql
-- ===========================================================================
-- planned. - Database Triggers
-- Migration: 20260128000002_triggers.sql
-- Beschreibung: Automatische Aktualisierungen und Berechnungen
-- ===========================================================================

-- ===============================================================
-- UPDATED_AT TRIGGER
-- Automatisch updated_at setzen bei Änderungen
-- ===============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auf alle relevanten Tabellen anwenden
CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_integration_credentials_updated_at
    BEFORE UPDATE ON integration_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_allocations_updated_at
    BEFORE UPDATE ON allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ===============================================================
-- PLANNED HOURS AUTO-REDISTRIBUTION
-- Bei Mehrfach-Allocation werden Stunden automatisch aufgeteilt
-- Beispiel: 8h Tageskapazität, 2 Projekte → 4h / 4h
-- ===============================================================

CREATE OR REPLACE FUNCTION recalculate_user_planned_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_hours DECIMAL(4,2);
    v_allocation_count INT;
    v_user_id UUID;
    v_date DATE;
BEGIN
    -- Bestimme User und Datum (bei DELETE aus OLD, sonst aus NEW)
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
        v_date := OLD.date;
    ELSE
        v_user_id := NEW.user_id;
        v_date := NEW.date;
    END IF;
    
    -- Nur für User-Allocations (nicht für Resources)
    IF v_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Hole die Tageskapazität des Users (weekly_hours / 5)
    SELECT weekly_hours / 5.0 INTO v_daily_hours
    FROM users 
    WHERE id = v_user_id;
    
    -- Falls User nicht gefunden, abbrechen
    IF v_daily_hours IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Zähle alle Allocations für diesen User an diesem Tag
    SELECT COUNT(*) INTO v_allocation_count
    FROM allocations 
    WHERE user_id = v_user_id 
      AND date = v_date;
    
    -- Wenn keine Allocations mehr, nichts zu tun
    IF v_allocation_count = 0 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Verteile die Stunden gleichmäßig auf alle Allocations
    UPDATE allocations 
    SET planned_hours = ROUND(v_daily_hours / v_allocation_count, 2)
    WHERE user_id = v_user_id 
      AND date = v_date;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger für INSERT (neue Allocation → Neuberechnung)
CREATE TRIGGER trigger_allocation_insert_recalc
    AFTER INSERT ON allocations
    FOR EACH ROW
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION recalculate_user_planned_hours();

-- Trigger für DELETE (Allocation entfernt → Neuberechnung für restliche)
CREATE TRIGGER trigger_allocation_delete_recalc
    AFTER DELETE ON allocations
    FOR EACH ROW
    WHEN (OLD.user_id IS NOT NULL)
    EXECUTE FUNCTION recalculate_user_planned_hours();

-- ===============================================================
-- ACTUAL HOURS AGGREGATION
-- Aktualisiert actual_hours in project_phases wenn time_entries ändern
-- ===============================================================

CREATE OR REPLACE FUNCTION update_phase_actual_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_phase_id UUID;
BEGIN
    -- Bestimme die betroffene Phase
    IF TG_OP = 'DELETE' THEN
        v_phase_id := OLD.project_phase_id;
    ELSE
        v_phase_id := NEW.project_phase_id;
    END IF;
    
    -- Aktualisiere die aggregierten IST-Stunden
    UPDATE project_phases
    SET actual_hours = COALESCE((
        SELECT SUM(hours) 
        FROM time_entries 
        WHERE project_phase_id = v_phase_id
    ), 0)
    WHERE id = v_phase_id;
    
    -- Bei UPDATE auch alte Phase aktualisieren falls Phase geändert wurde
    IF TG_OP = 'UPDATE' AND OLD.project_phase_id != NEW.project_phase_id THEN
        UPDATE project_phases
        SET actual_hours = COALESCE((
            SELECT SUM(hours) 
            FROM time_entries 
            WHERE project_phase_id = OLD.project_phase_id
        ), 0)
        WHERE id = OLD.project_phase_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_time_entry_actual_hours
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_phase_actual_hours();

-- ===============================================================
-- ALLOCATION → PHASE PLANNED HOURS AGGREGATION
-- Aktualisiert planned_hours in project_phases bei Allocation-Änderungen
-- ===============================================================

CREATE OR REPLACE FUNCTION update_phase_planned_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_phase_id UUID;
BEGIN
    -- Bestimme die relevante Phase-ID
    IF TG_OP = 'DELETE' THEN
        v_phase_id := OLD.project_phase_id;
    ELSE
        v_phase_id := NEW.project_phase_id;
    END IF;

    -- Aktualisiere die aggregierten PLAN-Stunden
    UPDATE project_phases
    SET planned_hours = COALESCE((
        SELECT SUM(planned_hours)
        FROM allocations
        WHERE project_phase_id = v_phase_id
    ), 0)
    WHERE id = v_phase_id;

    -- Bei UPDATE auch alte Phase aktualisieren falls Phase geändert wurde
    IF TG_OP = 'UPDATE' AND OLD.project_phase_id != NEW.project_phase_id THEN
        UPDATE project_phases
        SET planned_hours = COALESCE((
            SELECT SUM(planned_hours)
            FROM allocations
            WHERE project_phase_id = OLD.project_phase_id
        ), 0)
        WHERE id = OLD.project_phase_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_allocation_planned_hours
    AFTER INSERT OR UPDATE OR DELETE ON allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_phase_planned_hours();

-- ===============================================================
-- PROJECT PHASE SOFT DELETE
-- Setzt deleted_at wenn status auf 'deleted' geändert wird
-- ===============================================================

CREATE OR REPLACE FUNCTION handle_phase_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'deleted' AND OLD.status != 'deleted' THEN
        NEW.deleted_at = NOW();
    ELSIF NEW.status = 'active' AND OLD.status = 'deleted' THEN
        NEW.deleted_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_phase_soft_delete
    BEFORE UPDATE ON project_phases
    FOR EACH ROW
    EXECUTE FUNCTION handle_phase_soft_delete();
```

---

### Migration 4: Helper Functions

Datei: `supabase/migrations/20260128000003_helper_functions.sql`

```sql
-- ===========================================================================
-- planned. - Helper Functions
-- Migration: 20260128000003_helper_functions.sql
-- Beschreibung: Utility-Funktionen für User-Management und Onboarding
-- ===========================================================================

-- ===============================================================
-- CREATE USER FOR AUTH
-- Wird beim Onboarding aufgerufen, um einen User-Eintrag zu erstellen
-- ===============================================================

CREATE OR REPLACE FUNCTION create_user_for_auth(
    p_auth_id UUID,
    p_tenant_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role user_role DEFAULT 'gewerblich'
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    INSERT INTO users (auth_id, tenant_id, email, full_name, role)
    VALUES (p_auth_id, p_tenant_id, p_email, p_full_name, p_role)
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_user_for_auth IS 
    'Erstellt einen User-Eintrag für einen neuen Supabase Auth Account';

-- ===============================================================
-- CREATE TENANT WITH ADMIN
-- Erstellt einen neuen Tenant und den ersten Admin-User
-- ===============================================================

CREATE OR REPLACE FUNCTION create_tenant_with_admin(
    p_auth_id UUID,
    p_tenant_name TEXT,
    p_tenant_slug TEXT,
    p_admin_email TEXT,
    p_admin_full_name TEXT
)
RETURNS TABLE(tenant_id UUID, user_id UUID) AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Tenant erstellen
    INSERT INTO tenants (name, slug)
    VALUES (p_tenant_name, p_tenant_slug)
    RETURNING id INTO v_tenant_id;
    
    -- Integration Credentials Eintrag erstellen (leer)
    INSERT INTO integration_credentials (tenant_id)
    VALUES (v_tenant_id);
    
    -- Admin User erstellen
    INSERT INTO users (auth_id, tenant_id, email, full_name, role)
    VALUES (p_auth_id, v_tenant_id, p_admin_email, p_admin_full_name, 'admin')
    RETURNING id INTO v_user_id;
    
    RETURN QUERY SELECT v_tenant_id, v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_tenant_with_admin IS 
    'Erstellt einen neuen Tenant inkl. erstem Admin für das Onboarding';

-- ===============================================================
-- GET USER WITH TENANT INFO
-- Lädt den aktuellen User mit allen relevanten Tenant-Daten
-- ===============================================================

CREATE OR REPLACE FUNCTION get_current_user_with_tenant()
RETURNS TABLE(
    user_id UUID,
    auth_id UUID,
    email TEXT,
    full_name TEXT,
    role user_role,
    weekly_hours DECIMAL,
    avatar_url TEXT,
    tenant_id UUID,
    tenant_name TEXT,
    tenant_slug TEXT,
    tenant_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.auth_id,
        u.email,
        u.full_name,
        u.role,
        u.weekly_hours,
        u.avatar_url,
        t.id as tenant_id,
        t.name as tenant_name,
        t.slug as tenant_slug,
        t.settings as tenant_settings
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.auth_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===============================================================
-- CHECK ALLOCATION CONFLICTS
-- Prüft ob ein User an einem Tag bereits Abwesenheit hat
-- ===============================================================

CREATE OR REPLACE FUNCTION check_user_absence_conflict(
    p_user_id UUID,
    p_date DATE
)
RETURNS TABLE(
    has_conflict BOOLEAN,
    absence_type absence_type,
    absence_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as has_conflict,
        a.type as absence_type,
        a.id as absence_id
    FROM absences a
    WHERE a.user_id = p_user_id
      AND p_date BETWEEN a.start_date AND a.end_date
    LIMIT 1;
    
    -- Falls keine Abwesenheit gefunden
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::absence_type, NULL::UUID;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===============================================================
-- GET ALLOCATIONS FOR WEEK
-- Optimierte Abfrage für das Planning Grid
-- ===============================================================

CREATE OR REPLACE FUNCTION get_allocations_for_week(
    p_tenant_id UUID,
    p_week_start DATE
)
RETURNS TABLE(
    allocation_id UUID,
    date DATE,
    planned_hours DECIMAL,
    notes TEXT,
    user_id UUID,
    user_name TEXT,
    user_weekly_hours DECIMAL,
    user_avatar_url TEXT,
    resource_id UUID,
    resource_name TEXT,
    resource_type_name TEXT,
    resource_type_icon TEXT,
    resource_type_color TEXT,
    phase_id UUID,
    phase_name TEXT,
    phase_bereich phase_bereich,
    phase_budget_hours DECIMAL,
    phase_actual_hours DECIMAL,
    phase_start_date DATE,
    phase_end_date DATE,
    project_id UUID,
    project_name TEXT,
    project_address TEXT,
    project_status project_status,
    has_absence_conflict BOOLEAN,
    absence_type absence_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as allocation_id,
        a.date,
        a.planned_hours,
        a.notes,
        u.id as user_id,
        u.full_name as user_name,
        u.weekly_hours as user_weekly_hours,
        u.avatar_url as user_avatar_url,
        r.id as resource_id,
        r.name as resource_name,
        rt.name as resource_type_name,
        rt.icon as resource_type_icon,
        rt.color as resource_type_color,
        pp.id as phase_id,
        pp.name as phase_name,
        pp.bereich as phase_bereich,
        pp.budget_hours as phase_budget_hours,
        pp.actual_hours as phase_actual_hours,
        pp.start_date as phase_start_date,
        pp.end_date as phase_end_date,
        p.id as project_id,
        p.name as project_name,
        p.address as project_address,
        p.status as project_status,
        -- Absence Conflict Check
        EXISTS(
            SELECT 1 FROM absences ab 
            WHERE ab.user_id = a.user_id 
            AND a.date BETWEEN ab.start_date AND ab.end_date
        ) as has_absence_conflict,
        (
            SELECT ab.type FROM absences ab 
            WHERE ab.user_id = a.user_id 
            AND a.date BETWEEN ab.start_date AND ab.end_date
            LIMIT 1
        ) as absence_type
    FROM allocations a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN resources r ON a.resource_id = r.id
    LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
    JOIN project_phases pp ON a.project_phase_id = pp.id
    JOIN projects p ON pp.project_id = p.id
    WHERE a.tenant_id = p_tenant_id
      AND a.date BETWEEN p_week_start AND p_week_start + INTERVAL '6 days'
      AND pp.status = 'active'
    ORDER BY p.name, pp.name, a.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 4. Seed Data

Datei: `supabase/seed.sql`

```sql
-- ===========================================================================
-- planned. - Seed Data für Entwicklung
-- Datei: supabase/seed.sql
-- ACHTUNG: Nur für Development/Staging, NIEMALS in Production ausführen!
-- ===========================================================================

-- Hinweis: Führe diesen Seed NACH dem manuellen Erstellen eines Auth-Users aus.
-- Der erste Auth-User muss manuell via Supabase Dashboard oder CLI erstellt werden.

-- Variablen für IDs (werden bei Ausführung gesetzt)
-- Diese müssen angepasst werden nach Erstellung des Auth Users!

DO $$
DECLARE
    v_auth_id UUID := 'REPLACE_WITH_YOUR_AUTH_USER_ID'; -- Manuell ersetzen!
    v_tenant_id UUID;
    v_admin_id UUID;
    v_planer_id UUID;
    v_gewerblich1_id UUID;
    v_gewerblich2_id UUID;
    v_gewerblich3_id UUID;
    v_rt_fahrzeug_id UUID;
    v_rt_maschine_id UUID;
    v_resource1_id UUID;
    v_resource2_id UUID;
    v_project1_id UUID;
    v_project2_id UUID;
    v_phase1_id UUID;
    v_phase2_id UUID;
    v_phase3_id UUID;
    v_phase4_id UUID;
BEGIN
    -- ===============================================================
    -- TENANT
    -- ===============================================================
    
    INSERT INTO tenants (name, slug, settings)
    VALUES (
        'Zimmerei Holzbau Müller GmbH',
        'zimmerei-mueller',
        '{"defaultWeeklyHours": 40, "logoUrl": null}'
    )
    RETURNING id INTO v_tenant_id;
    
    -- Integration Credentials (leer)
    INSERT INTO integration_credentials (tenant_id)
    VALUES (v_tenant_id);
    
    RAISE NOTICE 'Tenant erstellt: %', v_tenant_id;
    
    -- ===============================================================
    -- USERS (ohne auth_id für 4 von 5 - nur Admin hat Auth)
    -- ===============================================================
    
    -- Admin (mit Auth-Verknüpfung)
    INSERT INTO users (auth_id, tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_auth_id, v_tenant_id, 'admin@zimmerei-mueller.de', 'Hans Müller', 'admin', 40)
    RETURNING id INTO v_admin_id;
    
    -- Planer (ohne Auth - kann sich später selbst registrieren)
    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'peter.schmidt@zimmerei-mueller.de', 'Peter Schmidt', 'planer', 40)
    RETURNING id INTO v_planer_id;
    
    -- Gewerbliche Mitarbeiter
    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'max.bauer@zimmerei-mueller.de', 'Max Bauer', 'gewerblich', 40)
    RETURNING id INTO v_gewerblich1_id;
    
    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'lisa.weber@zimmerei-mueller.de', 'Lisa Weber', 'gewerblich', 32)
    RETURNING id INTO v_gewerblich2_id;
    
    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'tom.schneider@zimmerei-mueller.de', 'Tom Schneider', 'gewerblich', 40)
    RETURNING id INTO v_gewerblich3_id;
    
    RAISE NOTICE 'Users erstellt: Admin=%, Planer=%, Gewerblich=%,%,%', 
        v_admin_id, v_planer_id, v_gewerblich1_id, v_gewerblich2_id, v_gewerblich3_id;
    
    -- ===============================================================
    -- RESOURCE TYPES
    -- ===============================================================
    
    INSERT INTO resource_types (tenant_id, name, icon, color)
    VALUES (v_tenant_id, 'Fahrzeug', 'truck', '#3B82F6')
    RETURNING id INTO v_rt_fahrzeug_id;
    
    INSERT INTO resource_types (tenant_id, name, icon, color)
    VALUES (v_tenant_id, 'Maschine Montage', 'crane', '#F59E0B')
    RETURNING id INTO v_rt_maschine_id;
    
    -- ===============================================================
    -- RESOURCES
    -- ===============================================================
    
    INSERT INTO resources (tenant_id, resource_type_id, name, license_plate)
    VALUES (v_tenant_id, v_rt_fahrzeug_id, 'Sprinter 1', 'M-ZM 1234')
    RETURNING id INTO v_resource1_id;
    
    INSERT INTO resources (tenant_id, resource_type_id, name)
    VALUES (v_tenant_id, v_rt_maschine_id, 'Autokran Liebherr')
    RETURNING id INTO v_resource2_id;
    
    -- ===============================================================
    -- PROJECTS (normalerweise aus Asana, hier manuell für Tests)
    -- ===============================================================
    
    INSERT INTO projects (tenant_id, name, client_name, address, status, asana_gid)
    VALUES (
        v_tenant_id,
        'BVH 24-01: Neubau EFH Weber',
        'Familie Weber',
        'Musterstraße 12, 80331 München',
        'active',
        'asana_project_001'
    )
    RETURNING id INTO v_project1_id;

    INSERT INTO projects (tenant_id, name, client_name, address, status, asana_gid)
    VALUES (
        v_tenant_id,
        'BVH 24-02: Anbau Garage Schmitt',
        'Herr Schmitt',
        'Waldweg 5, 82041 Deisenhofen',
        'planning',
        'asana_project_002'
    )
    RETURNING id INTO v_project2_id;
    
    -- ===============================================================
    -- PROJECT PHASES
    -- ===============================================================
    
    -- Projekt 1: Aktiv
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, asana_gid)
    VALUES (
        v_project1_id, 
        'Elementierung Wände', 
        'produktion',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '10 days',
        80,
        'asana_task_001'
    )
    RETURNING id INTO v_phase1_id;
    
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, asana_gid)
    VALUES (
        v_project1_id, 
        'Montage Rohbau', 
        'montage',
        CURRENT_DATE + INTERVAL '11 days',
        CURRENT_DATE + INTERVAL '15 days',
        60,
        'asana_task_002'
    )
    RETURNING id INTO v_phase2_id;
    
    -- Projekt 2: In Planung
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, asana_gid)
    VALUES (
        v_project2_id, 
        'Abbund Dachstuhl', 
        'produktion',
        CURRENT_DATE + INTERVAL '20 days',
        CURRENT_DATE + INTERVAL '23 days',
        32,
        'asana_task_003'
    )
    RETURNING id INTO v_phase3_id;
    
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, asana_gid)
    VALUES (
        v_project2_id, 
        'Montage Dachstuhl', 
        'montage',
        CURRENT_DATE + INTERVAL '24 days',
        CURRENT_DATE + INTERVAL '26 days',
        24,
        'asana_task_004'
    )
    RETURNING id INTO v_phase4_id;
    
    -- ===============================================================
    -- ALLOCATIONS (Beispiel: aktuelle Woche)
    -- ===============================================================
    
    -- Max Bauer: Mo-Fr auf Elementierung
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES 
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE),
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE + 1),
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE + 2),
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE + 3),
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE + 4);
    
    -- Lisa Weber: Mo-Mi auf Elementierung
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES 
        (v_tenant_id, v_gewerblich2_id, v_phase1_id, CURRENT_DATE),
        (v_tenant_id, v_gewerblich2_id, v_phase1_id, CURRENT_DATE + 1),
        (v_tenant_id, v_gewerblich2_id, v_phase1_id, CURRENT_DATE + 2);
    
    -- Sprinter 1: Mo-Fr für Elementierung
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES 
        (v_tenant_id, v_resource1_id, v_phase1_id, CURRENT_DATE),
        (v_tenant_id, v_resource1_id, v_phase1_id, CURRENT_DATE + 1),
        (v_tenant_id, v_resource1_id, v_phase1_id, CURRENT_DATE + 2),
        (v_tenant_id, v_resource1_id, v_phase1_id, CURRENT_DATE + 3),
        (v_tenant_id, v_resource1_id, v_phase1_id, CURRENT_DATE + 4);
    
    -- ===============================================================
    -- ABSENCES (Beispiel)
    -- ===============================================================
    
    -- Tom Schneider: Diese Woche Urlaub
    INSERT INTO absences (tenant_id, user_id, type, start_date, end_date)
    VALUES (
        v_tenant_id, 
        v_gewerblich3_id, 
        'vacation',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '4 days'
    );
    
    -- ===============================================================
    -- TIME ENTRIES (Beispiel: Vergangene IST-Stunden)
    -- ===============================================================
    
    -- Simuliere IST-Stunden von letzter Woche
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES 
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE - 7, 8),
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE - 6, 7.5),
        (v_tenant_id, v_gewerblich1_id, v_phase1_id, CURRENT_DATE - 5, 8),
        (v_tenant_id, v_gewerblich2_id, v_phase1_id, CURRENT_DATE - 7, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_phase1_id, CURRENT_DATE - 6, 6.4);
    
    RAISE NOTICE 'Seed Data erfolgreich erstellt!';
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE 'Admin User ID: %', v_admin_id;
    
END $$;
```

---

## 5. Realtime Konfiguration

### Tabellen für Realtime aktivieren

Im Supabase Dashboard unter **Database → Replication**:

1. `allocations` → **Aktivieren** (INSERT, UPDATE, DELETE)
2. `absences` → **Aktivieren** (INSERT, DELETE)
3. `projects` → **Aktivieren** (UPDATE)
4. `project_phases` → **Aktivieren** (UPDATE)

### Oder via SQL:

```sql
-- Realtime aktivieren für relevante Tabellen
ALTER PUBLICATION supabase_realtime ADD TABLE allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE absences;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_phases;
```

---

## 6. Storage Setup

### Bucket für Avatare erstellen

```sql
-- Storage Bucket für User Avatare
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    1048576, -- 1MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

### Bucket für Tenant-Logos erstellen

```sql
-- Storage Bucket für Firmen-Logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    true,
    2097152, -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

### Logos Storage Policies

```sql
-- Jeder kann Logos sehen (public)
CREATE POLICY "Logo images are public" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'logos');

-- Admin kann Logo hochladen (Pfad: tenant_id/logo.ext)
CREATE POLICY "Admins can upload tenant logo" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (
            SELECT tenant_id::text FROM users WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin kann Logo aktualisieren
CREATE POLICY "Admins can update tenant logo" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (
            SELECT tenant_id::text FROM users WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin kann Logo löschen
CREATE POLICY "Admins can delete tenant logo" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (
            SELECT tenant_id::text FROM users WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );
```

### Storage Policies

```sql
-- Jeder kann Avatare sehen (public)
CREATE POLICY "Avatar images are public" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- User kann eigenen Avatar hochladen
CREATE POLICY "Users can upload their avatar" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- User kann eigenen Avatar aktualisieren
CREATE POLICY "Users can update their avatar" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- User kann eigenen Avatar löschen
CREATE POLICY "Users can delete their avatar" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
```

---

## 7. Edge Functions

### Handle Auth Signup

Datei: `supabase/functions/handle-auth-signup/index.ts`

```typescript
// Diese Edge Function wird bei jedem neuen Signup aufgerufen
// und erstellt den User-Eintrag falls ein Tenant-Invite vorliegt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { record } = await req.json()
    
    // record enthält den neuen Auth User
    const authId = record.id
    const email = record.email
    const metadata = record.raw_user_meta_data

    // Prüfe ob ein Tenant-Invite existiert (via metadata)
    if (metadata?.tenant_id && metadata?.role) {
      // User zu bestehendem Tenant hinzufügen
      const { error } = await supabaseAdmin.rpc('create_user_for_auth', {
        p_auth_id: authId,
        p_tenant_id: metadata.tenant_id,
        p_email: email,
        p_full_name: metadata.full_name || email.split('@')[0],
        p_role: metadata.role
      })

      if (error) throw error
    }
    // Sonst: User muss manuell einem Tenant zugeordnet werden (Onboarding Flow)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

### Edge Function deployen

```bash
supabase functions deploy handle-auth-signup
```

### Webhook konfigurieren

Im Supabase Dashboard unter **Database → Webhooks**:

1. Neuen Webhook erstellen
2. Name: `on-auth-signup`
3. Tabelle: `auth.users`
4. Events: `INSERT`
5. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/handle-auth-signup`

---

## 8. Lokale Entwicklung

### Supabase lokal starten

```bash
# Startet lokale Supabase-Instanz
supabase start

# Zeigt lokale Credentials
supabase status
```

### Migrationen ausführen

```bash
# Lokal
supabase db reset  # Setzt DB zurück und führt alle Migrationen aus

# Remote (Production)
supabase db push
```

### Seed Data einfügen

```bash
# Lokal (nach db reset automatisch, wenn seed.sql existiert)
supabase db reset

# Manuell
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

### TypeScript Types generieren

```bash
# Generiert types aus dem Schema
supabase gen types typescript --local > src/lib/database.types.ts

# Oder von Remote
supabase gen types typescript --linked > src/lib/database.types.ts
```

---

## Checkliste für Deployment

```
[ ] Supabase Projekt erstellt (Region: Frankfurt/EU)
[ ] Environment Variables in Vercel gesetzt
[ ] Alle Migrationen ausgeführt (supabase db push)
[ ] Realtime aktiviert für allocations, absences, projects, project_phases
[ ] Storage Bucket "avatars" erstellt
[ ] Edge Function "handle-auth-signup" deployed
[ ] Erster Admin-User manuell erstellt
[ ] TypeScript Types generiert
```

---

## Troubleshooting

### RLS Policy blockiert Zugriff

```sql
-- Prüfe ob RLS aktiviert ist
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Prüfe welche Policies existieren
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Trigger funktioniert nicht

```sql
-- Liste alle Trigger
SELECT * FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Test: Allocation erstellen und planned_hours prüfen
INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
VALUES ('...', '...', '...', CURRENT_DATE);

SELECT * FROM allocations WHERE date = CURRENT_DATE;
```

### Realtime Events kommen nicht an

1. Prüfe ob die Tabelle in der Replication aktiviert ist
2. Prüfe ob der Client mit dem richtigen Channel subscribed
3. Prüfe ob RLS den Zugriff erlaubt (auch für Realtime!)

---

## 9. Cron Jobs (Vercel)

### TimeTac Sync Konfiguration

Für den automatischen Import von Arbeitszeiten und Abwesenheiten aus TimeTac werden Vercel Cron Jobs verwendet.

Datei: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-time-entries",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sync-absences",
      "schedule": "0 6 * * *"
    }
  ]
}
```

| Cron Job | Schedule | Beschreibung |
|----------|----------|--------------|
| `sync-time-entries` | Stündlich (Minute 0) | Importiert Time Entries der letzten 2 Stunden |
| `sync-absences` | Täglich 6:00 UTC | Importiert Abwesenheiten für die nächsten 30 Tage |

### Cron API Routes

Datei: `src/app/api/cron/sync-time-entries/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { syncTimeEntriesUseCase } from '@/application/use-cases/timetac';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify Cron Secret (Vercel setzt diesen Header automatisch)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncTimeEntriesUseCase.execute();
    return NextResponse.json({
      success: true,
      synced: result.syncedCount,
      errors: result.errors
    });
  } catch (error) {
    console.error('TimeTac sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
```

### Umgebungsvariable

```bash
# In Vercel Dashboard → Settings → Environment Variables
CRON_SECRET=xxx  # Wird von Vercel automatisch generiert
```

---

## 10. Test-Datenbank Setup

### Lokale Test-Datenbank

Für Unit- und Integrationstests wird eine separate Test-Datenbank verwendet.

```bash
# Supabase lokal starten (falls nicht bereits laufend)
supabase start

# Test-Datenbank zurücksetzen und neu aufsetzen
supabase db reset

# Alternativ: Nur Seed-Data neu laden
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed.sql
```

### Vitest Setup mit Test-DB

Datei: `vitest.setup.ts`

```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321';
const TEST_SERVICE_ROLE_KEY = process.env.TEST_SERVICE_ROLE_KEY!;

export const testSupabase = createClient(TEST_SUPABASE_URL, TEST_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

beforeAll(async () => {
  // Prüfe Verbindung zur Test-Datenbank
  const { error } = await testSupabase.from('tenants').select('count').single();
  if (error) {
    throw new Error(`Test-DB nicht erreichbar: ${error.message}`);
  }
});

beforeEach(async () => {
  // Optional: Transaktionen für Test-Isolation
  // Wird bei Integration Tests verwendet
});

afterAll(async () => {
  // Cleanup nach allen Tests
});
```

### Test-Umgebungsvariablen

Datei: `.env.test`

```bash
# Test-Datenbank (lokale Supabase-Instanz)
TEST_SUPABASE_URL=http://127.0.0.1:54321
TEST_SERVICE_ROLE_KEY=xxx  # Aus "supabase status"
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx  # Aus "supabase status"

# Mocking für externe Services
ASANA_CLIENT_ID=test_client_id
ASANA_CLIENT_SECRET=test_client_secret
TIMETAC_ACCOUNT=test_account
```

### NPM Scripts für Tests

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:db:reset": "supabase db reset",
    "test:e2e": "playwright test",
    "test:e2e:setup": "npm run test:db:reset && npx tsx supabase/seed.ts"
  }
}
```

### Playwright E2E mit Test-Datenbank

Datei: `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/setup/global-setup.ts',
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    storageState: 'tests/e2e/.auth/user.json',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial - Vollständige Supabase-Setup-Dokumentation für Antigravity |
| 1.1 | Januar 2026 | **Rebranding: "bänk" → "planned."**, UTF-8 Encoding korrigiert |
| 1.2 | Januar 2026 | + **Logos Storage Bucket** mit RLS-Policies, + **Upstash Redis Env Vars**, + **CRON_SECRET** dokumentiert, + **Test-DB-Setup** (Vitest/Playwright), + **Vercel Cron Config** |

---

*Version: 1.2 für Antigravity*
*Erstellt: 29. Januar 2026*
