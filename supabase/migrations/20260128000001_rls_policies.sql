-- ===========================================================================
-- planned. - Row Level Security Policies
-- Migration: 20260128000001_rls_policies.sql
-- Beschreibung: Aktiviert RLS und definiert Zugriffspolicies pro Rolle
-- ===========================================================================

-- ===============================================================
-- RLS AKTIVIEREN
-- ===============================================================

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

-- ===============================================================
-- HELPER FUNCTIONS
-- ===============================================================

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

-- ===============================================================
-- POLICIES: TENANTS
-- ===============================================================

-- Jeder sieht nur seinen eigenen Tenant
CREATE POLICY "tenant_select_own" ON tenants
    FOR SELECT
    USING (id = get_current_tenant_id());

-- Nur Admin kann Tenant updaten
CREATE POLICY "tenant_update_admin" ON tenants
    FOR UPDATE
    USING (id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (id = get_current_tenant_id() AND is_current_user_admin());

-- ===============================================================
-- POLICIES: USERS
-- ===============================================================

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

-- ===============================================================
-- POLICIES: INTEGRATION_CREDENTIALS
-- ===============================================================

-- Nur Admin kann Integration-Credentials sehen und verwalten
CREATE POLICY "integration_credentials_admin_only" ON integration_credentials
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- ===============================================================
-- POLICIES: RESOURCE_TYPES
-- ===============================================================

-- Alle im Tenant können Resource Types sehen
CREATE POLICY "resource_types_select_tenant" ON resource_types
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Admin kann Resource Types verwalten
CREATE POLICY "resource_types_manage_admin" ON resource_types
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- ===============================================================
-- POLICIES: RESOURCES
-- ===============================================================

-- Alle im Tenant können Resources sehen
CREATE POLICY "resources_select_tenant" ON resources
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Admin und Planer können Resources verwalten
CREATE POLICY "resources_manage_planer" ON resources
    FOR ALL
    USING (tenant_id = get_current_tenant_id() AND is_current_user_planer_or_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_planer_or_admin());

-- ===============================================================
-- POLICIES: PROJECTS
-- ===============================================================

-- Alle im Tenant können Projects sehen
CREATE POLICY "projects_select_tenant" ON projects
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Insert/Update/Delete nur via Service Account (Asana Sync)
-- Daher keine User-Policies für Schreibzugriff
-- Service Role Key bypassed RLS

-- ===============================================================
-- POLICIES: PROJECT_PHASES
-- ===============================================================

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

-- ===============================================================
-- POLICIES: ALLOCATIONS
-- ===============================================================

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

-- ===============================================================
-- POLICIES: TIME_ENTRIES
-- ===============================================================

-- Alle im Tenant können Time Entries sehen
CREATE POLICY "time_entries_select_tenant" ON time_entries
    FOR SELECT
    USING (tenant_id = get_current_tenant_id());

-- Insert/Update/Delete nur via Service Account (TimeTac Sync)

-- ===============================================================
-- POLICIES: ABSENCES
-- ===============================================================

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

-- ===============================================================
-- POLICIES: SYNC_LOGS
-- ===============================================================

-- Nur Admin kann Sync Logs sehen
CREATE POLICY "sync_logs_select_admin" ON sync_logs
    FOR SELECT
    USING (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- Insert nur via Service Account (Sync Jobs)
