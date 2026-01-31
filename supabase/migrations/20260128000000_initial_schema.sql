-- ===========================================================================
-- planned. - Initial Schema
-- Migration: 20260128000000_initial_schema.sql
-- Beschreibung: Erstellt alle Tabellen und Enums für das Datenmodell
-- ===========================================================================

-- ===============================================================
-- ENUMS
-- ===============================================================

CREATE TYPE user_role AS ENUM ('admin', 'planer', 'gewerblich');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed');
CREATE TYPE phase_bereich AS ENUM ('produktion', 'montage');
CREATE TYPE phase_status AS ENUM ('active', 'deleted');
CREATE TYPE absence_type AS ENUM ('vacation', 'sick', 'holiday', 'training', 'other');
CREATE TYPE sync_service AS ENUM ('asana', 'timetac');
CREATE TYPE sync_status AS ENUM ('running', 'success', 'partial', 'failed');

-- ===============================================================
-- TABLES
-- ===============================================================

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

-- ===============================================================
-- INDEXES
-- ===============================================================

-- Users Indexes
CREATE INDEX idx_users_tenant_active ON users(tenant_id) WHERE is_active = true;
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_timetac_id ON users(tenant_id, timetac_id) WHERE timetac_id IS NOT NULL;

-- Allocations Indexes (Performance-kritisch für Grid)
CREATE INDEX idx_allocations_tenant_date ON allocations(tenant_id, date);
CREATE INDEX idx_allocations_user_date ON allocations(user_id, date) WHERE user_id IS NOT NULL;
CREATE INDEX idx_allocations_resource_date ON allocations(resource_id, date) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_allocations_phase ON allocations(project_phase_id);
-- Note: Partial index with CURRENT_DATE removed (not IMMUTABLE)
-- idx_allocations_tenant_date already covers date-based queries

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
