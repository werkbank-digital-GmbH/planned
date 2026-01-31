-- ===========================================================================
-- planned. - Seed Data NUR für Projekte und Phasen
-- Datei: supabase/seed-projects-only.sql
--
-- Dieses Script löscht bestehende Projekte/Phasen und erstellt neue Testdaten.
-- Tenant und Users bleiben erhalten!
-- ===========================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    -- Projekte
    v_project1_id UUID;
    v_project2_id UUID;
    v_project3_id UUID;
    v_project4_id UUID;
    v_project5_id UUID;
BEGIN
    -- ===============================================================
    -- TENANT FINDEN
    -- ===============================================================

    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'zimmerei-mueller';

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant zimmerei-mueller nicht gefunden! Bitte zuerst seed.sql ausführen.';
    END IF;

    RAISE NOTICE 'Tenant gefunden: %', v_tenant_id;

    -- ===============================================================
    -- ALTE DATEN LÖSCHEN
    -- ===============================================================

    -- Time Entries löschen (haben tenant_id)
    DELETE FROM time_entries WHERE tenant_id = v_tenant_id;

    -- Allocations löschen (haben tenant_id)
    DELETE FROM allocations WHERE tenant_id = v_tenant_id;

    -- Absences löschen (haben tenant_id)
    DELETE FROM absences WHERE tenant_id = v_tenant_id;

    -- Phasen löschen (über projects verknüpft, keine eigene tenant_id)
    DELETE FROM project_phases
    WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = v_tenant_id);

    -- Projekte löschen
    DELETE FROM projects WHERE tenant_id = v_tenant_id;

    RAISE NOTICE 'Alte Projekt-Daten gelöscht';

    -- ===============================================================
    -- PROJECTS (5 Projekte mit je 5 Phasen)
    -- Zeitraum: Dezember 2025 - März 2026
    -- ===============================================================

    -- Projekt 1: Großes EFH (aktiv, gestartet Dezember 2025)
    INSERT INTO projects (tenant_id, name, client_name, address, status)
    VALUES (
        v_tenant_id,
        'BVH 24-01: Neubau Fam. Weber',
        'Familie Weber',
        'Münchener Str. 12, 86150 Augsburg',
        'active'
    )
    RETURNING id INTO v_project1_id;

    -- Projekt 2: Anbau Garage (aktiv, startet Januar 2026)
    INSERT INTO projects (tenant_id, name, client_name, address, status)
    VALUES (
        v_tenant_id,
        'BVH 24-02: Anbau Garage Schmitt',
        'Herr Schmitt',
        'Waldweg 5, 82041 Deisenhofen',
        'active'
    )
    RETURNING id INTO v_project2_id;

    -- Projekt 3: Modulhaus (in Planung, startet Februar 2026)
    INSERT INTO projects (tenant_id, name, client_name, address, status)
    VALUES (
        v_tenant_id,
        'BVH 24-03: Modulhaus Meier',
        'Familie Meier',
        'Bergstraße 8, 82131 Gauting',
        'planning'
    )
    RETURNING id INTO v_project3_id;

    -- Projekt 4: Sanierung (aktiv, gestartet Dezember 2025)
    INSERT INTO projects (tenant_id, name, client_name, address, status)
    VALUES (
        v_tenant_id,
        'BVH 23-45: Sanierung Schmidt',
        'Familie Schmidt',
        'Dorfstr. 4, 86368 Gersthofen',
        'active'
    )
    RETURNING id INTO v_project4_id;

    -- Projekt 5: Kita (in Planung, startet Februar 2026)
    INSERT INTO projects (tenant_id, name, client_name, address, status)
    VALUES (
        v_tenant_id,
        'BVH 24-05: Holzrahmenbau Kita',
        'Stadt Friedberg',
        'Parkweg 1, 86316 Friedberg',
        'planning'
    )
    RETURNING id INTO v_project5_id;

    RAISE NOTICE 'Projekte erstellt: %, %, %, %, %',
        v_project1_id, v_project2_id, v_project3_id, v_project4_id, v_project5_id;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 1 (Neubau Fam. Weber)
    -- Zeitraum: 15.12.2025 - 28.02.2026 (5 Phasen)
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order)
    VALUES
        (v_project1_id, 'ABU: Abbund', 'produktion', '2025-12-15', '2025-12-20', 40, 1),
        (v_project1_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-06', '2026-01-17', 64, 2),
        (v_project1_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-20', '2026-01-31', 80, 3),
        (v_project1_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-02-03', '2026-02-14', 48, 4),
        (v_project1_id, 'ELT: Elektroinstallationen', 'externes_gewerk', '2026-02-17', '2026-02-28', 56, 5);

    -- ===============================================================
    -- PROJECT PHASES - Projekt 2 (Anbau Garage Schmitt)
    -- Zeitraum: 05.01.2026 - 20.02.2026 (5 Phasen)
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order)
    VALUES
        (v_project2_id, 'ABU: Abbund', 'produktion', '2026-01-05', '2026-01-10', 24, 1),
        (v_project2_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-13', '2026-01-24', 40, 2),
        (v_project2_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-27', '2026-02-07', 48, 3),
        (v_project2_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-02-10', '2026-02-14', 24, 4),
        (v_project2_id, 'ELT: Garagentor & Elektrik', 'externes_gewerk', '2026-02-17', '2026-02-20', 16, 5);

    -- ===============================================================
    -- PROJECT PHASES - Projekt 3 (Modulhaus Meier - in Planung)
    -- Zeitraum: 02.02.2026 - 27.03.2026 (5 Phasen)
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order)
    VALUES
        (v_project3_id, 'PLAN: Modulplanung', 'produktion', '2026-02-02', '2026-02-06', 24, 1),
        (v_project3_id, 'MOD: Modulbau', 'produktion', '2026-02-09', '2026-02-28', 120, 2),
        (v_project3_id, 'HOBM: Modulmontage', 'montage', '2026-03-02', '2026-03-13', 56, 3),
        (v_project3_id, 'DADE: Dacharbeiten', 'montage', '2026-03-16', '2026-03-20', 32, 4),
        (v_project3_id, 'ELT: Elektroinstallationen', 'externes_gewerk', '2026-03-23', '2026-03-27', 40, 5);

    -- ===============================================================
    -- PROJECT PHASES - Projekt 4 (Sanierung Schmidt)
    -- Zeitraum: 08.12.2025 - 27.02.2026 (5 Phasen)
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order)
    VALUES
        (v_project4_id, 'BEST: Bestandsaufnahme', 'produktion', '2025-12-08', '2025-12-12', 24, 1),
        (v_project4_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-06', '2026-01-17', 48, 2),
        (v_project4_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-20', '2026-02-07', 72, 3),
        (v_project4_id, 'FAS: Fassadenarbeiten', 'montage', '2026-02-10', '2026-02-20', 48, 4),
        (v_project4_id, 'IAB: Innenausbau', 'externes_gewerk', '2026-02-23', '2026-02-27', 40, 5);

    -- ===============================================================
    -- PROJECT PHASES - Projekt 5 (Holzrahmenbau Kita)
    -- Zeitraum: 16.02.2026 - 31.03.2026 (5 Phasen)
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order)
    VALUES
        (v_project5_id, 'PLAN: Planungsphase', 'produktion', '2026-02-16', '2026-02-20', 32, 1),
        (v_project5_id, 'ABU: Abbund', 'produktion', '2026-02-23', '2026-03-06', 56, 2),
        (v_project5_id, 'ELMT: Elementfertigung', 'produktion', '2026-03-09', '2026-03-20', 80, 3),
        (v_project5_id, 'HOBM: Holzbaumontage', 'montage', '2026-03-23', '2026-03-27', 64, 4),
        (v_project5_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-03-30', '2026-03-31', 16, 5);

    RAISE NOTICE '=== FERTIG ===';
    RAISE NOTICE '5 Projekte mit je 5 Phasen erstellt';
    RAISE NOTICE 'Zeitraum: Dezember 2025 - März 2026';
    RAISE NOTICE '';
    RAISE NOTICE 'Projekt 1 (Neubau Weber): 15.12.2025 - 28.02.2026';
    RAISE NOTICE 'Projekt 2 (Garage Schmitt): 05.01.2026 - 20.02.2026';
    RAISE NOTICE 'Projekt 3 (Modulhaus Meier): 02.02.2026 - 27.03.2026';
    RAISE NOTICE 'Projekt 4 (Sanierung Schmidt): 08.12.2025 - 27.02.2026';
    RAISE NOTICE 'Projekt 5 (Kita Friedberg): 16.02.2026 - 31.03.2026';

END $$;
