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
    v_auth_id UUID := '514495d6-ff3f-42ac-8919-29543555185b'; -- Admin Auth User
    v_tenant_id UUID;
    v_admin_id UUID;
    v_planer_id UUID;
    v_gewerblich1_id UUID;
    v_gewerblich2_id UUID;
    v_gewerblich3_id UUID;
    v_gewerblich4_id UUID;
    v_gewerblich5_id UUID;
    v_rt_fahrzeug_id UUID;
    v_rt_maschine_id UUID;
    v_resource1_id UUID;
    v_resource2_id UUID;
    -- Projekte
    v_project1_id UUID;
    v_project2_id UUID;
    v_project3_id UUID;
    -- Phasen
    v_p1_abbund UUID;
    v_p1_zuschnitt UUID;
    v_p1_elementfertigung UUID;
    v_p1_fensterbau UUID;
    v_p1_holzbaumontage UUID;
    v_p1_montageneben UUID;
    v_p1_dachdeckerarbeiten UUID;
    v_p1_elektro UUID;
    v_p1_heizung UUID;
    v_p1_sanitaer UUID;
    v_p1_trockenbau UUID;
    v_p1_estrich UUID;
    v_p1_boden UUID;
    -- Projekt 2 Phasen
    v_p2_abbund UUID;
    v_p2_elementfertigung UUID;
    v_p2_holzbaumontage UUID;
    v_p2_dachdeckerarbeiten UUID;
    -- Projekt 3 Phasen
    v_p3_modulbau UUID;
    v_p3_holzbaumontage UUID;
    v_p3_elektro UUID;
BEGIN
    -- ===============================================================
    -- TENANT
    -- ===============================================================

    INSERT INTO tenants (name, slug, settings)
    VALUES (
        'Zimmerei Holzbau Müller GmbH',
        'zimmerei-mueller',
        '{"defaultWeeklyHours": 40, "defaultDailyHours": 8, "workDays": [1,2,3,4,5], "logoUrl": null}'
    )
    RETURNING id INTO v_tenant_id;

    -- Integration Credentials (leer)
    INSERT INTO integration_credentials (tenant_id)
    VALUES (v_tenant_id);

    RAISE NOTICE 'Tenant erstellt: %', v_tenant_id;

    -- ===============================================================
    -- USERS (ohne auth_id für die meisten - nur Admin hat Auth)
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

    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'stefan.huber@zimmerei-mueller.de', 'Stefan Huber', 'gewerblich', 40)
    RETURNING id INTO v_gewerblich4_id;

    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'andreas.fischer@zimmerei-mueller.de', 'Andreas Fischer', 'gewerblich', 40)
    RETURNING id INTO v_gewerblich5_id;

    RAISE NOTICE 'Users erstellt: Admin=%, Planer=%, Gewerblich=%,%,%,%,%',
        v_admin_id, v_planer_id, v_gewerblich1_id, v_gewerblich2_id, v_gewerblich3_id, v_gewerblich4_id, v_gewerblich5_id;

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
    -- PROJECTS
    -- ===============================================================

    -- Projekt 1: Großes EFH (aktiv, läuft gerade)
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

    -- Projekt 2: Kleines Projekt (aktiv, startet bald)
    INSERT INTO projects (tenant_id, name, client_name, address, status, asana_gid)
    VALUES (
        v_tenant_id,
        'BVH 24-02: Anbau Garage Schmitt',
        'Herr Schmitt',
        'Waldweg 5, 82041 Deisenhofen',
        'active',
        'asana_project_002'
    )
    RETURNING id INTO v_project2_id;

    -- Projekt 3: Modulhaus (in Planung)
    INSERT INTO projects (tenant_id, name, client_name, address, status, asana_gid)
    VALUES (
        v_tenant_id,
        'BVH 24-03: Modulhaus Meier',
        'Familie Meier',
        'Bergstraße 8, 82131 Gauting',
        'planning',
        'asana_project_003'
    )
    RETURNING id INTO v_project3_id;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 1 (Neubau EFH Weber)
    -- Vollständiges Projekt mit allen Phasen
    -- ===============================================================

    -- PRODUKTION: Abbund (ABU) - Startet heute, 1 Woche
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ABU: Abbund', 'produktion', CURRENT_DATE, CURRENT_DATE + 4, 40, 1, 'asana_phase_p1_01')
    RETURNING id INTO v_p1_abbund;

    -- PRODUKTION: Zuschnitt (ZUS) - Parallel zu Abbund
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ZUS: Zuschnitt', 'produktion', CURRENT_DATE, CURRENT_DATE + 3, 24, 2, 'asana_phase_p1_02')
    RETURNING id INTO v_p1_zuschnitt;

    -- PRODUKTION: Elementfertigung (ELMT) - Nach Abbund
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ELMT: Elementfertigung', 'produktion', CURRENT_DATE + 5, CURRENT_DATE + 12, 64, 3, 'asana_phase_p1_03')
    RETURNING id INTO v_p1_elementfertigung;

    -- PRODUKTION: Fensterbau (FEB) - Parallel zu Elementfertigung
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'FEB: Fensterbau', 'produktion', CURRENT_DATE + 7, CURRENT_DATE + 11, 32, 4, 'asana_phase_p1_04')
    RETURNING id INTO v_p1_fensterbau;

    -- MONTAGE: Holzbaumontage (HOBM) - Nach Elementfertigung
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'HOBM: Holzbaumontage', 'montage', CURRENT_DATE + 13, CURRENT_DATE + 17, 80, 5, 'asana_phase_p1_05')
    RETURNING id INTO v_p1_holzbaumontage;

    -- MONTAGE: Montagenebenarbeiten (MNA) - Während Holzbaumontage
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'MNA: Montagenebenarbeiten', 'montage', CURRENT_DATE + 15, CURRENT_DATE + 19, 24, 6, 'asana_phase_p1_06')
    RETURNING id INTO v_p1_montageneben;

    -- MONTAGE: Dachdeckerarbeiten (DADE)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'DADE: Dachdeckerarbeiten', 'montage', CURRENT_DATE + 18, CURRENT_DATE + 22, 40, 7, 'asana_phase_p1_07')
    RETURNING id INTO v_p1_dachdeckerarbeiten;

    -- EXTERNES GEWERK: Elektroinstallationen (ELT)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ELT: Elektroinstallationen', 'externes_gewerk', CURRENT_DATE + 20, CURRENT_DATE + 27, 48, 8, 'asana_phase_p1_08')
    RETURNING id INTO v_p1_elektro;

    -- EXTERNES GEWERK: Heizungsinstallationen (HEIZ)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'HEIZ: Heizungsinstallationen', 'externes_gewerk', CURRENT_DATE + 20, CURRENT_DATE + 25, 40, 9, 'asana_phase_p1_09')
    RETURNING id INTO v_p1_heizung;

    -- EXTERNES GEWERK: Sanitärinstallationen (SAN)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'SAN: Sanitärinstallationen', 'externes_gewerk', CURRENT_DATE + 22, CURRENT_DATE + 27, 32, 10, 'asana_phase_p1_10')
    RETURNING id INTO v_p1_sanitaer;

    -- EXTERNES GEWERK: Trockenbauarbeiten (TRO)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'TRO: Trockenbauarbeiten', 'externes_gewerk', CURRENT_DATE + 28, CURRENT_DATE + 35, 56, 11, 'asana_phase_p1_11')
    RETURNING id INTO v_p1_trockenbau;

    -- EXTERNES GEWERK: Estricharbeiten (EST)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'EST: Estricharbeiten', 'externes_gewerk', CURRENT_DATE + 36, CURRENT_DATE + 38, 16, 12, 'asana_phase_p1_12')
    RETURNING id INTO v_p1_estrich;

    -- EXTERNES GEWERK: Bodenbelagsarbeiten (BOD)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'BOD: Bodenbelagsarbeiten', 'externes_gewerk', CURRENT_DATE + 42, CURRENT_DATE + 45, 24, 13, 'asana_phase_p1_13')
    RETURNING id INTO v_p1_boden;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 2 (Anbau Garage)
    -- Kleineres Projekt, weniger Phasen
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'ABU: Abbund', 'produktion', CURRENT_DATE + 14, CURRENT_DATE + 16, 16, 1, 'asana_phase_p2_01')
    RETURNING id INTO v_p2_abbund;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'ELMT: Elementfertigung', 'produktion', CURRENT_DATE + 17, CURRENT_DATE + 20, 24, 2, 'asana_phase_p2_02')
    RETURNING id INTO v_p2_elementfertigung;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'HOBM: Holzbaumontage', 'montage', CURRENT_DATE + 21, CURRENT_DATE + 23, 32, 3, 'asana_phase_p2_03')
    RETURNING id INTO v_p2_holzbaumontage;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'DADE: Dachdeckerarbeiten', 'montage', CURRENT_DATE + 24, CURRENT_DATE + 25, 16, 4, 'asana_phase_p2_04')
    RETURNING id INTO v_p2_dachdeckerarbeiten;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 3 (Modulhaus - in Planung)
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project3_id, 'MOD: Modulbau', 'produktion', CURRENT_DATE + 30, CURRENT_DATE + 45, 120, 1, 'asana_phase_p3_01')
    RETURNING id INTO v_p3_modulbau;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project3_id, 'HOBM: Holzbaumontage', 'montage', CURRENT_DATE + 46, CURRENT_DATE + 50, 40, 2, 'asana_phase_p3_02')
    RETURNING id INTO v_p3_holzbaumontage;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project3_id, 'ELT: Elektroinstallationen', 'externes_gewerk', CURRENT_DATE + 51, CURRENT_DATE + 55, 32, 3, 'asana_phase_p3_03')
    RETURNING id INTO v_p3_elektro;

    -- ===============================================================
    -- ALLOCATIONS - Aktuelle und nächste Woche
    -- ===============================================================

    -- Max Bauer: Mo-Fr auf Abbund (aktuelles Projekt)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE + 1),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE + 2),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE + 3),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE + 4);

    -- Lisa Weber: Mo-Mi auf Zuschnitt
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, CURRENT_DATE),
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, CURRENT_DATE + 1),
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, CURRENT_DATE + 2);

    -- Stefan Huber: Nächste Woche auf Elementfertigung
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, CURRENT_DATE + 7),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, CURRENT_DATE + 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, CURRENT_DATE + 9),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, CURRENT_DATE + 10),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, CURRENT_DATE + 11);

    -- Andreas Fischer: Nächste Woche auf Fensterbau
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich5_id, v_p1_fensterbau, CURRENT_DATE + 7),
        (v_tenant_id, v_gewerblich5_id, v_p1_fensterbau, CURRENT_DATE + 8),
        (v_tenant_id, v_gewerblich5_id, v_p1_fensterbau, CURRENT_DATE + 9);

    -- Sprinter 1: Diese Woche für Abbund
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_resource1_id, v_p1_abbund, CURRENT_DATE),
        (v_tenant_id, v_resource1_id, v_p1_abbund, CURRENT_DATE + 1),
        (v_tenant_id, v_resource1_id, v_p1_abbund, CURRENT_DATE + 2),
        (v_tenant_id, v_resource1_id, v_p1_abbund, CURRENT_DATE + 3),
        (v_tenant_id, v_resource1_id, v_p1_abbund, CURRENT_DATE + 4);

    -- ===============================================================
    -- ABSENCES
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
    -- TIME ENTRIES (Vergangene IST-Stunden)
    -- ===============================================================

    -- Simuliere IST-Stunden von letzter Woche
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE - 7, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE - 6, 7.5),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, CURRENT_DATE - 5, 8),
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, CURRENT_DATE - 7, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, CURRENT_DATE - 6, 6.4);

    RAISE NOTICE 'Seed Data erfolgreich erstellt!';
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE 'Admin User ID: %', v_admin_id;
    RAISE NOTICE 'Projekt 1 (EFH Weber): % mit 13 Phasen', v_project1_id;
    RAISE NOTICE 'Projekt 2 (Garage Schmitt): % mit 4 Phasen', v_project2_id;
    RAISE NOTICE 'Projekt 3 (Modulhaus Meier): % mit 3 Phasen', v_project3_id;

END $$;
