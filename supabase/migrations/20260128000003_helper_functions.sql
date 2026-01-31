-- ===========================================================================
-- planned. - Helper Functions
-- Migration: 20260128000003_helper_functions.sql
-- Beschreibung: Utility-Funktionen für User-Management und Onboarding
-- ===========================================================================

-- ===============================================================
-- CREATE USER FOR AUTH
-- Wird beim Onboarding aufgerufen, um einen User-Eintrag zu erstellen
-- ===============================================================

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

-- ===============================================================
-- CREATE TENANT WITH ADMIN
-- Erstellt einen neuen Tenant und den ersten Admin-User
-- ===============================================================

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

-- ===============================================================
-- GET USER WITH TENANT INFO
-- Lädt den aktuellen User mit allen relevanten Tenant-Daten
-- ===============================================================

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

-- ===============================================================
-- CHECK ALLOCATION CONFLICTS
-- Prüft ob ein User an einem Tag bereits Abwesenheit hat
-- ===============================================================

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

-- ===============================================================
-- GET ALLOCATIONS FOR WEEK
-- Optimierte Abfrage für das Planning Grid
-- ===============================================================

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
