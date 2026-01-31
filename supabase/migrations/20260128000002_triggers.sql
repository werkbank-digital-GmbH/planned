-- ===========================================================================
-- planned. - Database Triggers
-- Migration: 20260128000002_triggers.sql
-- Beschreibung: Automatische Aktualisierungen und Berechnungen
-- ===========================================================================

-- ===============================================================
-- UPDATED_AT TRIGGER
-- Automatisch updated_at setzen bei Änderungen
-- ===============================================================

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

-- ===============================================================
-- PLANNED HOURS AUTO-REDISTRIBUTION
-- Bei Mehrfach-Allocation werden Stunden automatisch aufgeteilt
-- Beispiel: 8h Tageskapazität, 2 Projekte → 4h / 4h
-- ===============================================================

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

-- ===============================================================
-- ACTUAL HOURS AGGREGATION
-- Aktualisiert actual_hours in project_phases wenn time_entries ändern
-- ===============================================================

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

-- ===============================================================
-- PROJECT PHASE SOFT DELETE
-- Setzt deleted_at wenn status auf 'deleted' geändert wird
-- ===============================================================

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
