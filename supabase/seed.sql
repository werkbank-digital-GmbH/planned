-- ===========================================================================
-- planned. - Seed Data für Entwicklung
-- Datei: supabase/seed.sql
-- ACHTUNG: Nur für Development/Staging, NIEMALS in Production ausführen!
-- ===========================================================================

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
    -- ===============================================================
    -- TENANT
    -- ===============================================================

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

    -- ===============================================================
    -- USERS (ohne auth_id für 4 von 5 - nur Admin hat Auth)
    -- ===============================================================

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

    -- ===============================================================
    -- RESOURCE TYPES
    -- ===============================================================

    INSERT INTO resource_types (tenant_id, name, icon, color)
    VALUES (v_tenant_id, 'Fahrzeug', 'truck', '#3B82F6')
    RETURNING id INTO v_rt_fahrzeug_id;

    INSERT INTO resource_types (tenant_id, name, icon, color)
    VALUES (v_tenant_id, 'Maschine Montage', 'crane', '#F59E0B')
    RETURNING id INTO v_rt_maschine_id;

    -- ===============================================================
    -- RESOURCES
    -- ===============================================================

    INSERT INTO resources (tenant_id, resource_type_id, name, license_plate)
    VALUES (v_tenant_id, v_rt_fahrzeug_id, 'Sprinter 1', 'M-ZM 1234')
    RETURNING id INTO v_resource1_id;

    INSERT INTO resources (tenant_id, resource_type_id, name)
    VALUES (v_tenant_id, v_rt_maschine_id, 'Autokran Liebherr')
    RETURNING id INTO v_resource2_id;

    -- ===============================================================
    -- PROJECTS (normalerweise aus Asana, hier manuell für Tests)
    -- ===============================================================

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

    -- ===============================================================
    -- PROJECT PHASES
    -- ===============================================================

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

    -- ===============================================================
    -- ALLOCATIONS (Beispiel: aktuelle Woche)
    -- ===============================================================

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

    -- ===============================================================
    -- ABSENCES (Beispiel)
    -- ===============================================================

    -- Tom Schneider: Diese Woche Urlaub
    INSERT INTO absences (tenant_id, user_id, type, start_date, end_date)
    VALUES (
        v_tenant_id,
        v_gewerblich3_id,
        'vacation',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '4 days'
    );

    -- ===============================================================
    -- TIME ENTRIES (Beispiel: Vergangene IST-Stunden)
    -- ===============================================================

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
