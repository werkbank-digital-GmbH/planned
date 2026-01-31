# planned. – Datenmodell

> Entities, Relationships & Supabase Schema

**Version:** 1.2  
**Datum:** 29. Januar 2026

---

## Entity-Übersicht

```
TENANT (1) ─────┬───── (N) USER ←──────────────── AUTH.USERS (1:1)
                │
                ├───── (1) INTEGRATION_CREDENTIALS
                │
                ├───── (N) RESOURCE_TYPE ──── (N) RESOURCE
                │
                ├───── (N) PROJECT ──── (N) PROJECT_PHASE ──┬── (N) ALLOCATION
                │                                           │
                │                                           └── (N) TIME_ENTRY (IST-Stunden)
                │
                ├───── (N) ABSENCE
                │
                └───── (N) SYNC_LOG
```

---

## Entities im Detail

### 1. Tenant (Mandant)

Der Tenant repräsentiert eine Firma (Holzbaubetrieb).

```typescript
interface Tenant {
  id: string;           // UUID, Primary Key
  name: string;         // "Zimmerei Müller GmbH"
  slug: string;         // "zimmerei-mueller" (unique, für URLs)
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantSettings {
  defaultWeeklyHours: number;     // Default: 40
  logoUrl?: string;               // Firmenlogo
}
```

### 2. User (Mitarbeiter)

Mitarbeiter, die im System arbeiten oder geplant werden.

```typescript
interface User {
  id: string;           // UUID, Primary Key
  authId: string;       // FK → auth.users (Supabase Auth) - UNIQUE
  tenantId: string;     // FK → Tenant
  email: string;        // Unique pro Tenant
  fullName: string;     // "Max Müller"
  role: UserRole;       // 'admin' | 'planer' | 'gewerblich'
  weeklyHours: number;  // Individuelle Wochenstunden (default: 40)
  isActive: boolean;    // Soft-Delete Flag
  timetacId?: string;   // Externe ID für TimeTac-Mapping
  avatarUrl?: string;   // Profilbild
  createdAt: Date;
  updatedAt: Date;
}

enum UserRole {
  ADMIN = 'admin',
  PLANER = 'planer',
  GEWERBLICH = 'gewerblich'
}
```

**Wichtig:** Das Feld `authId` verknüpft den User mit dem Supabase Auth-System. Die Funktion `get_current_tenant_id()` nutzt diese Verknüpfung via `auth.uid()`.

### 3. IntegrationCredentials (Integrations-Zugangsdaten)

Speichert OAuth-Tokens und API-Zugangsdaten für externe Integrationen (pro Tenant).

```typescript
interface IntegrationCredentials {
  id: string;                    // UUID, Primary Key
  tenantId: string;              // FK → Tenant (UNIQUE - 1:1 Beziehung)
  
  // Asana OAuth
  asanaAccessToken?: string;     // Encrypted
  asanaRefreshToken?: string;    // Encrypted
  asanaTokenExpiresAt?: Date;
  asanaWorkspaceId?: string;
  asanaWebhookSecret?: string;
  
  // Asana Custom Field Mappings
  asanaProjectStatusFieldId?: string;
  asanaPhaseBereichFieldId?: string;
  asanaPhaseBudgetHoursFieldId?: string;
  
  // TimeTac API
  timetacAccountId?: string;
  timetacApiToken?: string;      // Encrypted
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. ResourceType (Ressourcen-Kategorie)

Konfigurierbare Kategorien für Ressourcen (pro Tenant).

```typescript
interface ResourceType {
  id: string;           // UUID, Primary Key
  tenantId: string;     // FK → Tenant
  name: string;         // "Fahrzeug", "Maschine Produktion"
  icon: string;         // Icon-Name (z.B. "truck", "crane")
  color: string;        // Hex-Farbe für UI
  createdAt: Date;
}
```

**Beispiele für Ressourcen-Typen:**
- Fahrzeug (Transporter, LKW)
- Maschine Produktion (CNC, Abbundanlage)
- Maschine Montage (Kran, Stapler)

### 5. Resource (Fahrzeug/Maschine)

Konkrete Ressourcen, die allokiert werden können.

```typescript
interface Resource {
  id: string;           // UUID, Primary Key
  tenantId: string;     // FK → Tenant
  resourceTypeId: string; // FK → ResourceType
  name: string;         // "Sprinter 1", "Kran Liebherr"
  licensePlate?: string; // Für Fahrzeuge: Kennzeichen
  isActive: boolean;    // Soft-Delete Flag
  createdAt: Date;
}
```

### 6. Project (Bauvorhaben)

Projekte werden aus Asana synchronisiert (nicht manuell angelegt).

```typescript
interface Project {
  id: string;           // UUID, Primary Key
  tenantId: string;     // FK → Tenant
  name: string;         // "BVH 24-01: Neubau Weber"
  clientName?: string;  // "Familie Weber"
  address?: string;     // "Musterstraße 12, 80331 München"
  status: ProjectStatus;
  asanaGid?: string;    // Asana Project GID (UNIQUE pro Tenant)
  syncedAt?: Date;      // Letzter Sync-Zeitpunkt
  createdAt: Date;
}

enum ProjectStatus {
  PLANNING = 'planning',   // In Planung
  ACTIVE = 'active',       // Aktiv/Laufend
  PAUSED = 'paused',       // Pausiert
  COMPLETED = 'completed'  // Abgeschlossen
}
```

### 7. ProjectPhase (Arbeitspaket)

Phasen innerhalb eines Projekts (aus Asana Tasks).

```typescript
interface ProjectPhase {
  id: string;           // UUID, Primary Key
  projectId: string;    // FK → Project
  name: string;         // "Elementierung", "Montage Dachstuhl"
  bereich: PhaseBereich; // 'produktion' | 'montage'
  startDate?: Date;     // Geplanter Start
  endDate?: Date;       // Geplantes Ende
  sortOrder: number;    // Reihenfolge innerhalb des Projekts (Default: 0)
  budgetHours?: number; // SOLL-Stunden (aus Asana Custom Field)
  plannedHours: number; // PLAN-Stunden (Summe Allocations, via Trigger, Default: 0)
  actualHours: number;  // IST-Stunden (aggregiert aus TimeEntries, Default: 0)
  status: PhaseStatus;
  asanaGid?: string;    // Asana Task GID (UNIQUE pro Tenant)
  deletedAt?: Date;     // Soft-Delete Timestamp
  createdAt: Date;
}

enum PhaseBereich {
  PRODUKTION = 'produktion',
  MONTAGE = 'montage'
}

enum PhaseStatus {
  ACTIVE = 'active',
  DELETED = 'deleted'
}
```

#### SOLL / PLAN / IST Stundenkonzept

Die drei Stundenfelder einer Phase bilden das zentrale Controlling-Konzept:

| Feld | DB-Spalte | Quelle | Beschreibung |
|------|-----------|--------|--------------|
| **SOLL** | `budget_hours` | Asana Custom Field | Ziel-Stunden aus Projektplanung. Wird bei Asana-Sync importiert. Kann `NULL` sein wenn nicht definiert. |
| **PLAN** | `planned_hours` | Trigger-Aggregation | Summe aller `allocations.planned_hours` für diese Phase. Automatisch via `trigger_allocation_planned_hours` aktualisiert. |
| **IST** | `actual_hours` | Trigger-Aggregation | Summe aller `time_entries.hours` für diese Phase. Automatisch via `trigger_time_entry_actual_hours` aktualisiert. |

**Berechnungslogik:**
```
Verbleibend = SOLL - IST
Fortschritt = (IST / SOLL) × 100%
Überplanung = PLAN > SOLL (Warnung)
Überziehung = IST > SOLL (kritisch)
```

**Trigger-Kette:**
1. User erstellt/ändert Allocation → `recalculate_user_planned_hours` → `allocations.planned_hours` neu verteilt (8h ÷ Anzahl)
2. User erstellt/ändert Allocation → `trigger_allocation_planned_hours` → `project_phases.planned_hours` aggregiert
3. TimeTac-Sync importiert TimeEntry → `trigger_time_entry_actual_hours` → `project_phases.actual_hours` aggregiert

**UI-Anzeige (F3.14):**
- Format: `"SOLL: 40h | PLAN: 35h | IST: 28h"`
- Farbkodierung: IST < SOLL (grün), IST = SOLL (gelb), IST > SOLL (rot)

### 8. Allocation (Zuweisung)

Die Kern-Entity: Zuweisung einer Person/Ressource auf eine Phase für einen Tag.

```typescript
interface Allocation {
  id: string;           // UUID, Primary Key
  tenantId: string;     // FK → Tenant
  
  // XOR: Entweder User ODER Resource
  userId?: string;      // FK → User (optional)
  resourceId?: string;  // FK → Resource (optional)
  
  projectPhaseId: string; // FK → ProjectPhase
  date: Date;           // Der spezifische Tag
  plannedHours?: number; // Nur für User, automatisch berechnet via Trigger
  notes?: string;       // Optionale Notizen
  createdAt: Date;
  updatedAt: Date;
}
```

**Wichtige Regeln:**
- Genau EINES von `userId` oder `resourceId` muss gesetzt sein
- `plannedHours` nur für User (bei Ressourcen: `null`)
- `plannedHours` wird **automatisch via Trigger** bei Mehrfach-Allocation aufgeteilt
- Unique Constraint: Ein User kann nur EINMAL pro Tag auf dieselbe Phase allokiert werden

### 9. TimeEntry (IST-Stunden)

Tatsächlich geleistete Arbeitsstunden, importiert aus TimeTac.

```typescript
interface TimeEntry {
  id: string;           // UUID, Primary Key
  tenantId: string;     // FK → Tenant
  userId: string;       // FK → User
  projectPhaseId: string; // FK → ProjectPhase
  date: Date;           // Tag der Arbeit
  hours: number;        // Tatsächlich gearbeitete Stunden
  timetacId?: string;   // Externe ID für Sync (UNIQUE)
  createdAt: Date;
}
```

**Hinweis:** Die IST-Stunden werden in `project_phases.actual_hours` aggregiert gespeichert (via Trigger oder scheduled Job).

### 10. Absence (Abwesenheit)

Abwesenheiten aus TimeTac (read-only in planned.).

```typescript
interface Absence {
  id: string;           // UUID, Primary Key
  tenantId: string;     // FK → Tenant
  userId: string;       // FK → User
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  timetacId?: string;   // Externe ID für Sync (UNIQUE)
  createdAt: Date;
}

enum AbsenceType {
  VACATION = 'vacation',   // Urlaub
  SICK = 'sick',           // Krankheit
  HOLIDAY = 'holiday',     // Feiertag
  TRAINING = 'training',   // Fortbildung
  OTHER = 'other'          // Sonstige
}

// UI-Mapping (DB → Anzeige)
const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  holiday: 'Feiertag',
  training: 'Fortbildung',
  other: 'Sonstiges'
};
```

### 11. SyncLog (Synchronisations-Protokoll)

Protokolliert alle Sync-Vorgänge mit externen Systemen.

```typescript
interface SyncLog {
  id: string;           // UUID, Primary Key
  tenantId: string;     // FK → Tenant
  service: SyncService; // 'asana' | 'timetac'
  operation: string;    // 'projects' | 'phases' | 'absences' | 'time_entries'
  status: SyncStatus;   // 'running' | 'success' | 'partial' | 'failed'
  result?: SyncResult;  // JSON mit Details
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

enum SyncService {
  ASANA = 'asana',
  TIMETAC = 'timetac'
}

enum SyncStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  PARTIAL = 'partial',   // Teilweise erfolgreich
  FAILED = 'failed'
}

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
}
```

---

## Supabase SQL Schema

```sql
-- ═══════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('admin', 'planer', 'gewerblich');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed');
CREATE TYPE phase_bereich AS ENUM ('produktion', 'montage');
CREATE TYPE phase_status AS ENUM ('active', 'deleted');
CREATE TYPE absence_type AS ENUM ('vacation', 'sick', 'holiday', 'training', 'other');
CREATE TYPE sync_service AS ENUM ('asana', 'timetac');
CREATE TYPE sync_status AS ENUM ('running', 'success', 'partial', 'failed');

-- ═══════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════

-- Tenants (Mandanten)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{"defaultWeeklyHours": 40}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

    -- end_date muss >= start_date sein
    CONSTRAINT check_dates CHECK (
        start_date IS NULL OR end_date IS NULL OR end_date >= start_date
    )
);

COMMENT ON COLUMN project_phases.sort_order IS 'Reihenfolge innerhalb des Projekts';
COMMENT ON COLUMN project_phases.planned_hours IS 'PLAN-Stunden: Summe aller Allocations (via Trigger aktualisiert)';

-- Unique Index für asana_gid pro Tenant (über Project-Join)
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
    
    -- Ein User kann nur einmal pro Tag auf dieselbe Phase allokiert werden
    UNIQUE(user_id, project_phase_id, date),
    -- Eine Resource kann nur einmal pro Tag auf dieselbe Phase allokiert werden
    UNIQUE(resource_id, project_phase_id, date)
);

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
    
    -- end_date muss >= start_date sein
    CONSTRAINT check_absence_dates CHECK (end_date >= start_date)
);

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

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Users Indexes
CREATE INDEX idx_users_tenant_active ON users(tenant_id) WHERE is_active = true;
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_timetac_id ON users(tenant_id, timetac_id) WHERE timetac_id IS NOT NULL;

-- Allocations Indexes (Performance-kritisch)
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

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS & FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Generic updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ═══════════════════════════════════════════════════════════════
-- PLANNED HOURS AUTO-REDISTRIBUTION
-- Automatische Neuverteilung der Stunden bei Mehrfach-Allocation
-- ═══════════════════════════════════════════════════════════════

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

-- Trigger für INSERT
CREATE TRIGGER trigger_allocation_insert_recalc
    AFTER INSERT ON allocations
    FOR EACH ROW
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION recalculate_user_planned_hours();

-- Trigger für DELETE
CREATE TRIGGER trigger_allocation_delete_recalc
    AFTER DELETE ON allocations
    FOR EACH ROW
    WHEN (OLD.user_id IS NOT NULL)
    EXECUTE FUNCTION recalculate_user_planned_hours();

-- ═══════════════════════════════════════════════════════════════
-- ACTUAL HOURS AGGREGATION
-- Aktualisiert actual_hours in project_phases wenn time_entries ändern
-- ═══════════════════════════════════════════════════════════════

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
    
    -- Bei UPDATE auch alte Phase aktualisieren falls geändert
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

-- ═══════════════════════════════════════════════════════════════
-- ALLOCATION → PHASE PLANNED HOURS AGGREGATION
-- Aktualisiert planned_hours in project_phases bei Allocation-Änderungen
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_phase_planned_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_phase_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_phase_id := OLD.project_phase_id;
    ELSE
        v_phase_id := NEW.project_phase_id;
    END IF;

    UPDATE project_phases
    SET planned_hours = COALESCE((
        SELECT SUM(planned_hours)
        FROM allocations
        WHERE project_phase_id = v_phase_id
    ), 0)
    WHERE id = v_phase_id;

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

-- ═══════════════════════════════════════════════════════════════
-- PROJECT PHASE SOFT DELETE
-- Setzt deleted_at wenn status auf 'deleted' geändert wird
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- AUTH USER HANDLING
-- Erstellt automatisch einen User-Eintrag bei Supabase Auth Signup
-- HINWEIS: Dieser Trigger muss ggf. an den Onboarding-Flow angepasst werden
-- ═══════════════════════════════════════════════════════════════

-- Diese Funktion wird typischerweise via Edge Function aufgerufen,
-- da bei Multi-Tenant der Tenant erst gewählt werden muss.
-- Hier als Referenz für manuelles User-Anlegen:

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

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

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

-- Helper Function: Get Current User's Tenant
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id FROM users 
        WHERE auth_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper Function: Get Current User's Role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM users 
        WHERE auth_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper Function: Check if Current User is Admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Tenants: User sieht nur eigenen Tenant
CREATE POLICY tenant_isolation_tenants ON tenants
    FOR ALL
    USING (id = get_current_tenant_id());

-- Users: Alle im gleichen Tenant sichtbar
CREATE POLICY tenant_isolation_users ON users
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Users: Nur Admin kann erstellen/ändern/löschen
CREATE POLICY admin_manage_users ON users
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- Integration Credentials: Nur Admin
CREATE POLICY admin_only_integration_credentials ON integration_credentials
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- Resource Types: Tenant Isolation
CREATE POLICY tenant_isolation_resource_types ON resource_types
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY admin_manage_resource_types ON resource_types
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- Resources: Tenant Isolation
CREATE POLICY tenant_isolation_resources ON resources
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY admin_planer_manage_resources ON resources
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND get_current_user_role() IN ('admin', 'planer'))
    WITH CHECK (tenant_id = get_current_tenant_id() AND get_current_user_role() IN ('admin', 'planer'));

-- Projects: Tenant Isolation
CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Project Phases: Via Project Tenant Isolation
CREATE POLICY tenant_isolation_project_phases ON project_phases
    FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE tenant_id = get_current_tenant_id()
    ));

-- Allocations: Tenant Isolation + Role-based Access
CREATE POLICY tenant_isolation_allocations ON allocations
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Allocations: Admin/Planer können alle ändern
CREATE POLICY admin_planer_manage_allocations ON allocations
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND get_current_user_role() IN ('admin', 'planer'))
    WITH CHECK (tenant_id = get_current_tenant_id() AND get_current_user_role() IN ('admin', 'planer'));

-- Gewerbliche sehen nur eigene Allocations
CREATE POLICY own_allocations_gewerblich ON allocations
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id() AND (
            get_current_user_role() IN ('admin', 'planer')
            OR user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Time Entries: Tenant Isolation (read-only für alle, write nur via Service)
CREATE POLICY tenant_isolation_time_entries ON time_entries
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Absences: Tenant Isolation
CREATE POLICY tenant_isolation_absences ON absences
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Sync Logs: Nur Admin sichtbar
CREATE POLICY admin_only_sync_logs ON sync_logs
    FOR SELECT
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin());
```

---

## Abfrage-Beispiele

### Allocations für eine Woche laden

```sql
SELECT 
    a.*,
    u.full_name as user_name,
    u.weekly_hours,
    r.name as resource_name,
    rt.name as resource_type_name,
    rt.icon as resource_type_icon,
    pp.name as phase_name,
    pp.bereich,
    pp.budget_hours,
    pp.actual_hours,
    p.name as project_name,
    p.address as project_address
FROM allocations a
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN resources r ON a.resource_id = r.id
LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
JOIN project_phases pp ON a.project_phase_id = pp.id
JOIN projects p ON pp.project_id = p.id
WHERE a.tenant_id = $1
  AND a.date BETWEEN $2 AND $3
  AND pp.status = 'active'
ORDER BY p.name, pp.name, a.date;
```

### Verfügbare Ressourcen für einen Tag

```sql
-- Alle aktiven User mit Verfügbarkeit
SELECT 
    u.id,
    u.full_name,
    u.weekly_hours,
    COALESCE(SUM(a.planned_hours), 0) as allocated_hours,
    (u.weekly_hours / 5) - COALESCE(SUM(a.planned_hours), 0) as available_hours,
    EXISTS(
        SELECT 1 FROM absences ab 
        WHERE ab.user_id = u.id 
        AND $1 BETWEEN ab.start_date AND ab.end_date
    ) as has_absence
FROM users u
LEFT JOIN allocations a ON u.id = a.user_id AND a.date = $1
WHERE u.tenant_id = $2
  AND u.is_active = true
GROUP BY u.id;
```

### SOLL vs PLAN vs IST pro Phase

```sql
SELECT 
    pp.id,
    pp.name,
    pp.budget_hours as soll_hours,
    COALESCE(SUM(a.planned_hours), 0) as planned_hours,
    pp.actual_hours as ist_hours,
    pp.budget_hours - pp.actual_hours as remaining_hours,
    CASE 
        WHEN pp.budget_hours > 0 
        THEN ROUND((pp.actual_hours / pp.budget_hours) * 100, 1)
        ELSE 0 
    END as progress_percent
FROM project_phases pp
LEFT JOIN allocations a ON pp.id = a.project_phase_id
WHERE pp.project_id = $1
  AND pp.status = 'active'
GROUP BY pp.id;
```

### Allocations pro Kalenderwoche aggregiert (für Wochenplanung)

```sql
SELECT 
    a.user_id,
    a.resource_id,
    a.project_phase_id,
    DATE_TRUNC('week', a.date) as week_start,
    COUNT(*) as days_allocated,
    SUM(a.planned_hours) as total_planned_hours,
    ARRAY_AGG(a.date ORDER BY a.date) as dates
FROM allocations a
WHERE a.tenant_id = $1
  AND a.date BETWEEN $2 AND $3
GROUP BY a.user_id, a.resource_id, a.project_phase_id, DATE_TRUNC('week', a.date);
```

### Konflikte: Allocations an Abwesenheitstagen

```sql
SELECT 
    a.id as allocation_id,
    a.date,
    u.full_name as user_name,
    ab.type as absence_type,
    p.name as project_name,
    pp.name as phase_name
FROM allocations a
JOIN users u ON a.user_id = u.id
JOIN project_phases pp ON a.project_phase_id = pp.id
JOIN projects p ON pp.project_id = p.id
JOIN absences ab ON a.user_id = ab.user_id 
    AND a.date BETWEEN ab.start_date AND ab.end_date
WHERE a.tenant_id = $1
  AND a.date >= CURRENT_DATE
ORDER BY a.date, u.full_name;
```

---

## TypeScript Types (generiert aus Schema)

```typescript
// Generiert mit Supabase CLI: supabase gen types typescript

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Insert>;
      };
      users: {
        Row: {
          id: string;
          auth_id: string;
          tenant_id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'planer' | 'gewerblich';
          weekly_hours: number;
          is_active: boolean;
          timetac_id: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Insert>;
      };
      integration_credentials: {
        Row: {
          id: string;
          tenant_id: string;
          asana_access_token: string | null;
          asana_refresh_token: string | null;
          asana_token_expires_at: string | null;
          asana_workspace_id: string | null;
          asana_webhook_secret: string | null;
          asana_project_status_field_id: string | null;
          asana_phase_bereich_field_id: string | null;
          asana_phase_budget_hours_field_id: string | null;
          timetac_account_id: string | null;
          timetac_api_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Insert>;
      };
      resource_types: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          icon: string;
          color: string;
          created_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at'>;
        Update: Partial<Insert>;
      };
      resources: {
        Row: {
          id: string;
          tenant_id: string;
          resource_type_id: string;
          name: string;
          license_plate: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at'>;
        Update: Partial<Insert>;
      };
      projects: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          client_name: string | null;
          address: string | null;
          status: 'planning' | 'active' | 'paused' | 'completed';
          asana_gid: string | null;
          synced_at: string | null;
          created_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at'>;
        Update: Partial<Insert>;
      };
      project_phases: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          bereich: 'produktion' | 'montage';
          start_date: string | null;
          end_date: string | null;
          sort_order: number;
          budget_hours: number | null;
          planned_hours: number;
          actual_hours: number;
          status: 'active' | 'deleted';
          asana_gid: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at' | 'actual_hours' | 'planned_hours'>;
        Update: Partial<Insert>;
      };
      allocations: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          resource_id: string | null;
          project_phase_id: string;
          date: string;
          planned_hours: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at' | 'planned_hours'>;
        Update: Partial<Omit<Insert, 'planned_hours'>>;
      };
      time_entries: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          project_phase_id: string;
          date: string;
          hours: number;
          timetac_id: string | null;
          created_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at'>;
        Update: Partial<Insert>;
      };
      absences: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          type: 'vacation' | 'sick' | 'holiday' | 'training' | 'other';
          start_date: string;
          end_date: string;
          timetac_id: string | null;
          created_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at'>;
        Update: Partial<Insert>;
      };
      sync_logs: {
        Row: {
          id: string;
          tenant_id: string;
          service: 'asana' | 'timetac';
          operation: string;
          status: 'running' | 'success' | 'partial' | 'failed';
          result: Json | null;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Row, 'id' | 'started_at'>;
        Update: Partial<Insert>;
      };
    };
    Enums: {
      user_role: 'admin' | 'planer' | 'gewerblich';
      project_status: 'planning' | 'active' | 'paused' | 'completed';
      phase_bereich: 'produktion' | 'montage';
      phase_status: 'active' | 'deleted';
      absence_type: 'vacation' | 'sick' | 'holiday' | 'training' | 'other';
      sync_service: 'asana' | 'timetac';
      sync_status: 'running' | 'success' | 'partial' | 'failed';
    };
    Functions: {
      get_current_tenant_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_current_user_role: {
        Args: Record<string, never>;
        Returns: 'admin' | 'planer' | 'gewerblich';
      };
      is_current_user_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      create_user_for_auth: {
        Args: {
          p_auth_id: string;
          p_tenant_id: string;
          p_email: string;
          p_full_name: string;
          p_role?: 'admin' | 'planer' | 'gewerblich';
        };
        Returns: string;
      };
    };
  };
};
```

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial für Antigravity |
| 1.1 | Januar 2026 | + Auth-User-Mapping (auth_id), + IntegrationCredentials, + TimeEntry (IST-Stunden), + SyncLog, + PlannedHours Auto-Redistribution Trigger, + ActualHours Aggregation Trigger, + Erweiterte RLS Policies, + Unique Constraints, + CHECK Constraints, + Helper Functions |
| 1.2 | Januar 2026 | **Rebranding: "bänk" → "planned."**, UTF-8 Encoding korrigiert |

---

*Version: 1.2 für Antigravity*  
*Erstellt: 29. Januar 2026*
