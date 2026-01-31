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
    v_gewerblich6_id UUID;
    v_gewerblich7_id UUID;
    v_rt_fahrzeug_id UUID;
    v_rt_maschine_id UUID;
    v_rt_geraete_id UUID;
    v_resource1_id UUID;
    v_resource2_id UUID;
    v_resource3_id UUID;
    v_resource4_id UUID;
    -- Projekte
    v_project1_id UUID;
    v_project2_id UUID;
    v_project3_id UUID;
    v_project4_id UUID;
    v_project5_id UUID;
    -- Phasen Projekt 1 (Neubau Fam. Weber) - 5 Phasen
    v_p1_phase1 UUID;
    v_p1_phase2 UUID;
    v_p1_phase3 UUID;
    v_p1_phase4 UUID;
    v_p1_phase5 UUID;
    -- Phasen Projekt 2 (Anbau Garage) - 5 Phasen
    v_p2_phase1 UUID;
    v_p2_phase2 UUID;
    v_p2_phase3 UUID;
    v_p2_phase4 UUID;
    v_p2_phase5 UUID;
    -- Phasen Projekt 3 (Modulhaus) - 5 Phasen
    v_p3_phase1 UUID;
    v_p3_phase2 UUID;
    v_p3_phase3 UUID;
    v_p3_phase4 UUID;
    v_p3_phase5 UUID;
    -- Phasen Projekt 4 (Sanierung Schmidt) - 5 Phasen
    v_p4_phase1 UUID;
    v_p4_phase2 UUID;
    v_p4_phase3 UUID;
    v_p4_phase4 UUID;
    v_p4_phase5 UUID;
    -- Phasen Projekt 5 (Holzrahmenbau Kita) - 5 Phasen
    v_p5_phase1 UUID;
    v_p5_phase2 UUID;
    v_p5_phase3 UUID;
    v_p5_phase4 UUID;
    v_p5_phase5 UUID;
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

    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'klaus.wagner@zimmerei-mueller.de', 'Klaus Wagner', 'gewerblich', 40)
    RETURNING id INTO v_gewerblich6_id;

    INSERT INTO users (tenant_id, email, full_name, role, weekly_hours)
    VALUES (v_tenant_id, 'michael.braun@zimmerei-mueller.de', 'Michael Braun', 'gewerblich', 40)
    RETURNING id INTO v_gewerblich7_id;

    RAISE NOTICE 'Users erstellt: Admin=%, Planer=%, Gewerblich=%,%,%,%,%,%,%',
        v_admin_id, v_planer_id, v_gewerblich1_id, v_gewerblich2_id, v_gewerblich3_id,
        v_gewerblich4_id, v_gewerblich5_id, v_gewerblich6_id, v_gewerblich7_id;

    -- ===============================================================
    -- RESOURCE TYPES
    -- ===============================================================

    INSERT INTO resource_types (tenant_id, name, icon, color)
    VALUES (v_tenant_id, 'Fahrzeug', 'truck', '#3B82F6')
    RETURNING id INTO v_rt_fahrzeug_id;

    INSERT INTO resource_types (tenant_id, name, icon, color)
    VALUES (v_tenant_id, 'Maschine Montage', 'crane', '#F59E0B')
    RETURNING id INTO v_rt_maschine_id;

    INSERT INTO resource_types (tenant_id, name, icon, color)
    VALUES (v_tenant_id, 'Geräte', 'wrench', '#10B981')
    RETURNING id INTO v_rt_geraete_id;

    -- ===============================================================
    -- RESOURCES
    -- ===============================================================

    INSERT INTO resources (tenant_id, resource_type_id, name, license_plate)
    VALUES (v_tenant_id, v_rt_fahrzeug_id, 'Sprinter 1', 'M-ZM 1234')
    RETURNING id INTO v_resource1_id;

    INSERT INTO resources (tenant_id, resource_type_id, name, license_plate)
    VALUES (v_tenant_id, v_rt_fahrzeug_id, 'Sprinter 2', 'M-ZM 5678')
    RETURNING id INTO v_resource2_id;

    INSERT INTO resources (tenant_id, resource_type_id, name)
    VALUES (v_tenant_id, v_rt_maschine_id, 'Autokran Liebherr')
    RETURNING id INTO v_resource3_id;

    INSERT INTO resources (tenant_id, resource_type_id, name)
    VALUES (v_tenant_id, v_rt_geraete_id, 'Kompressor Atlas')
    RETURNING id INTO v_resource4_id;

    -- ===============================================================
    -- PROJECTS (5 Projekte mit je 5 Phasen)
    -- Zeitraum: Dezember 2025 - März 2026
    -- ===============================================================

    -- Projekt 1: Großes EFH (aktiv, gestartet Dezember 2025)
    INSERT INTO projects (tenant_id, name, client_name, address, status, asana_gid)
    VALUES (
        v_tenant_id,
        'BVH 24-01: Neubau Fam. Weber',
        'Familie Weber',
        'Münchener Str. 12, 86150 Augsburg',
        'active',
        'asana_project_001'
    )
    RETURNING id INTO v_project1_id;

    -- Projekt 2: Anbau Garage (aktiv, startet Januar 2026)
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

    -- Projekt 3: Modulhaus (in Planung, startet Februar 2026)
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

    -- Projekt 4: Sanierung (aktiv, gestartet Januar 2026)
    INSERT INTO projects (tenant_id, name, client_name, address, status, asana_gid)
    VALUES (
        v_tenant_id,
        'BVH 23-45: Sanierung Schmidt',
        'Familie Schmidt',
        'Dorfstr. 4, 86368 Gersthofen',
        'active',
        'asana_project_004'
    )
    RETURNING id INTO v_project4_id;

    -- Projekt 5: Kita (in Planung, startet Februar 2026)
    INSERT INTO projects (tenant_id, name, client_name, address, status, asana_gid)
    VALUES (
        v_tenant_id,
        'BVH 24-05: Holzrahmenbau Kita',
        'Stadt Friedberg',
        'Parkweg 1, 86316 Friedberg',
        'planning',
        'asana_project_005'
    )
    RETURNING id INTO v_project5_id;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 1 (Neubau Fam. Weber)
    -- Zeitraum: 15.12.2025 - 28.02.2026 (5 Phasen)
    -- ===============================================================

    -- Phase 1: PRODUKTION - Abbund (15.12. - 20.12.2025)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project1_id, 'ABU: Abbund', 'produktion', '2025-12-15'::DATE, '2025-12-20'::DATE, 40, 1, 'asana_phase_p1_01')
    RETURNING id INTO v_p1_phase1;

    -- Phase 2: PRODUKTION - Elementfertigung (06.01. - 17.01.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project1_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-06'::DATE, '2026-01-17'::DATE, 64, 2, 'asana_phase_p1_02')
    RETURNING id INTO v_p1_phase2;

    -- Phase 3: MONTAGE - Holzbaumontage (20.01. - 31.01.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project1_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-20'::DATE, '2026-01-31'::DATE, 80, 3, 'asana_phase_p1_03')
    RETURNING id INTO v_p1_phase3;

    -- Phase 4: MONTAGE - Dachdeckerarbeiten (03.02. - 14.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project1_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-02-03'::DATE, '2026-02-14'::DATE, 48, 4, 'asana_phase_p1_04')
    RETURNING id INTO v_p1_phase4;

    -- Phase 5: EXTERNES GEWERK - Elektroinstallationen (17.02. - 28.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project1_id, 'ELT: Elektroinstallationen', 'externes_gewerk', '2026-02-17'::DATE, '2026-02-28'::DATE, 56, 5, 'asana_phase_p1_05')
    RETURNING id INTO v_p1_phase5;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 2 (Anbau Garage Schmitt)
    -- Zeitraum: 05.01.2026 - 20.02.2026 (5 Phasen)
    -- ===============================================================

    -- Phase 1: PRODUKTION - Abbund (05.01. - 10.01.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project2_id, 'ABU: Abbund', 'produktion', '2026-01-05'::DATE, '2026-01-10'::DATE, 24, 1, 'asana_phase_p2_01')
    RETURNING id INTO v_p2_phase1;

    -- Phase 2: PRODUKTION - Elementfertigung (13.01. - 24.01.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project2_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-13'::DATE, '2026-01-24'::DATE, 40, 2, 'asana_phase_p2_02')
    RETURNING id INTO v_p2_phase2;

    -- Phase 3: MONTAGE - Holzbaumontage (27.01. - 07.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project2_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-27'::DATE, '2026-02-07'::DATE, 48, 3, 'asana_phase_p2_03')
    RETURNING id INTO v_p2_phase3;

    -- Phase 4: MONTAGE - Dachdeckerarbeiten (10.02. - 14.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project2_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-02-10'::DATE, '2026-02-14'::DATE, 24, 4, 'asana_phase_p2_04')
    RETURNING id INTO v_p2_phase4;

    -- Phase 5: EXTERNES GEWERK - Garagentor & Elektrik (17.02. - 20.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project2_id, 'ELT: Garagentor & Elektrik', 'externes_gewerk', '2026-02-17'::DATE, '2026-02-20'::DATE, 16, 5, 'asana_phase_p2_05')
    RETURNING id INTO v_p2_phase5;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 3 (Modulhaus Meier - in Planung)
    -- Zeitraum: 02.02.2026 - 27.03.2026 (5 Phasen)
    -- ===============================================================

    -- Phase 1: PRODUKTION - Modulplanung (02.02. - 06.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project3_id, 'PLAN: Modulplanung', 'produktion', '2026-02-02'::DATE, '2026-02-06'::DATE, 24, 1, 'asana_phase_p3_01')
    RETURNING id INTO v_p3_phase1;

    -- Phase 2: PRODUKTION - Modulbau (09.02. - 28.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project3_id, 'MOD: Modulbau', 'produktion', '2026-02-09'::DATE, '2026-02-28'::DATE, 120, 2, 'asana_phase_p3_02')
    RETURNING id INTO v_p3_phase2;

    -- Phase 3: MONTAGE - Modulmontage (02.03. - 13.03.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project3_id, 'HOBM: Modulmontage', 'montage', '2026-03-02'::DATE, '2026-03-13'::DATE, 56, 3, 'asana_phase_p3_03')
    RETURNING id INTO v_p3_phase3;

    -- Phase 4: MONTAGE - Dacharbeiten (16.03. - 20.03.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project3_id, 'DADE: Dacharbeiten', 'montage', '2026-03-16'::DATE, '2026-03-20'::DATE, 32, 4, 'asana_phase_p3_04')
    RETURNING id INTO v_p3_phase4;

    -- Phase 5: EXTERNES GEWERK - Elektroinstallationen (23.03. - 27.03.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project3_id, 'ELT: Elektroinstallationen', 'externes_gewerk', '2026-03-23'::DATE, '2026-03-27'::DATE, 40, 5, 'asana_phase_p3_05')
    RETURNING id INTO v_p3_phase5;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 4 (Sanierung Schmidt)
    -- Zeitraum: 08.12.2025 - 27.02.2026 (5 Phasen)
    -- ===============================================================

    -- Phase 1: PRODUKTION - Bestandsaufnahme (08.12. - 12.12.2025)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project4_id, 'BEST: Bestandsaufnahme', 'produktion', '2025-12-08'::DATE, '2025-12-12'::DATE, 24, 1, 'asana_phase_p4_01')
    RETURNING id INTO v_p4_phase1;

    -- Phase 2: PRODUKTION - Elementfertigung (06.01. - 17.01.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project4_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-06'::DATE, '2026-01-17'::DATE, 48, 2, 'asana_phase_p4_02')
    RETURNING id INTO v_p4_phase2;

    -- Phase 3: MONTAGE - Holzbaumontage (20.01. - 07.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project4_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-20'::DATE, '2026-02-07'::DATE, 72, 3, 'asana_phase_p4_03')
    RETURNING id INTO v_p4_phase3;

    -- Phase 4: MONTAGE - Fassadenarbeiten (10.02. - 20.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project4_id, 'FAS: Fassadenarbeiten', 'montage', '2026-02-10'::DATE, '2026-02-20'::DATE, 48, 4, 'asana_phase_p4_04')
    RETURNING id INTO v_p4_phase4;

    -- Phase 5: EXTERNES GEWERK - Innenausbau (23.02. - 27.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project4_id, 'IAB: Innenausbau', 'externes_gewerk', '2026-02-23'::DATE, '2026-02-27'::DATE, 40, 5, 'asana_phase_p4_05')
    RETURNING id INTO v_p4_phase5;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 5 (Holzrahmenbau Kita)
    -- Zeitraum: 16.02.2026 - 31.03.2026 (5 Phasen)
    -- ===============================================================

    -- Phase 1: PRODUKTION - Planungsphase (16.02. - 20.02.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project5_id, 'PLAN: Planungsphase', 'produktion', '2026-02-16'::DATE, '2026-02-20'::DATE, 32, 1, 'asana_phase_p5_01')
    RETURNING id INTO v_p5_phase1;

    -- Phase 2: PRODUKTION - Abbund (23.02. - 06.03.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project5_id, 'ABU: Abbund', 'produktion', '2026-02-23'::DATE, '2026-03-06'::DATE, 56, 2, 'asana_phase_p5_02')
    RETURNING id INTO v_p5_phase2;

    -- Phase 3: PRODUKTION - Elementfertigung (09.03. - 20.03.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project5_id, 'ELMT: Elementfertigung', 'produktion', '2026-03-09'::DATE, '2026-03-20'::DATE, 80, 3, 'asana_phase_p5_03')
    RETURNING id INTO v_p5_phase3;

    -- Phase 4: MONTAGE - Holzbaumontage (23.03. - 27.03.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project5_id, 'HOBM: Holzbaumontage', 'montage', '2026-03-23'::DATE, '2026-03-27'::DATE, 64, 4, 'asana_phase_p5_04')
    RETURNING id INTO v_p5_phase4;

    -- Phase 5: MONTAGE - Dachdeckerarbeiten (30.03. - 31.03.2026)
    INSERT INTO project_phases (tenant_id, project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_tenant_id, v_project5_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-03-30'::DATE, '2026-03-31'::DATE, 16, 5, 'asana_phase_p5_05')
    RETURNING id INTO v_p5_phase5;

    -- ===============================================================
    -- ALLOCATIONS - Aktuelle Woche (KW 05: 27.01. - 31.01.2026)
    -- und kommende Wochen
    -- ===============================================================

    -- === Projekt 1: Holzbaumontage (20.01. - 31.01.2026) ===

    -- Max Bauer: Ganze Woche auf Holzbaumontage
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-31'::DATE);

    -- Stefan Huber: Mo-Fr auf Holzbaumontage
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich4_id, v_p1_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase3, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase3, '2026-01-31'::DATE);

    -- Klaus Wagner: Holzbaumontage Mo-Fr
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-31'::DATE);

    -- === Projekt 2: Holzbaumontage (27.01. - 07.02.2026) ===

    -- Lisa Weber: Mo-Fr auf Holzbaumontage (Projekt 2)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich2_id, v_p2_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich2_id, v_p2_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich2_id, v_p2_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich2_id, v_p2_phase3, '2026-01-30'::DATE);

    -- Andreas Fischer: Mo-Fr auf Holzbaumontage (Projekt 2)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich5_id, v_p2_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich5_id, v_p2_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich5_id, v_p2_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich5_id, v_p2_phase3, '2026-01-30'::DATE);

    -- === Projekt 4: Holzbaumontage (20.01. - 07.02.2026) ===

    -- Michael Braun: Ganze Woche auf Holzbaumontage Sanierung
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich7_id, v_p4_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase3, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase3, '2026-01-31'::DATE);

    -- === Ressourcen-Zuweisungen ===

    -- Sprinter 1: Projekt 1 Holzbaumontage
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_resource1_id, v_p1_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_phase3, '2026-01-30'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_phase3, '2026-01-31'::DATE);

    -- Sprinter 2: Projekt 4 Holzbaumontage
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_resource2_id, v_p4_phase3, '2026-01-27'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_phase3, '2026-01-28'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_phase3, '2026-01-30'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_phase3, '2026-01-31'::DATE);

    -- Autokran: Projekt 1 Holzbaumontage Mi-Fr
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_resource3_id, v_p1_phase3, '2026-01-29'::DATE),
        (v_tenant_id, v_resource3_id, v_p1_phase3, '2026-01-30'::DATE),
        (v_tenant_id, v_resource3_id, v_p1_phase3, '2026-01-31'::DATE);

    -- ===============================================================
    -- ALLOCATIONS - Kommende Woche (KW 06: 02.02. - 06.02.2026)
    -- ===============================================================

    -- Projekt 1: Dachdeckerarbeiten starten (03.02.)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_phase4, '2026-02-03'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase4, '2026-02-04'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase4, '2026-02-05'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase4, '2026-02-06'::DATE);

    -- Projekt 2: Holzbaumontage (02.02. - 06.02.)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich4_id, v_p2_phase3, '2026-02-02'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_phase3, '2026-02-03'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_phase3, '2026-02-04'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_phase3, '2026-02-05'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_phase3, '2026-02-06'::DATE);

    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich6_id, v_p2_phase3, '2026-02-02'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_phase3, '2026-02-03'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_phase3, '2026-02-04'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_phase3, '2026-02-05'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_phase3, '2026-02-06'::DATE);

    -- ===============================================================
    -- ABSENCES (Dezember 2025 - März 2026)
    -- ===============================================================

    -- Tom Schneider: Urlaub 27.01. - 31.01.2026 (aktuelle Woche)
    INSERT INTO absences (tenant_id, user_id, type, start_date, end_date, notes)
    VALUES (
        v_tenant_id,
        v_gewerblich3_id,
        'vacation',
        '2026-01-27'::DATE,
        '2026-01-31'::DATE,
        'Skiurlaub'
    );

    -- Klaus Wagner: Urlaub 09.02. - 13.02.2026
    INSERT INTO absences (tenant_id, user_id, type, start_date, end_date, notes)
    VALUES (
        v_tenant_id,
        v_gewerblich6_id,
        'vacation',
        '2026-02-09'::DATE,
        '2026-02-13'::DATE,
        'Winterurlaub'
    );

    -- Lisa Weber: Krank am 28.01.2026
    INSERT INTO absences (tenant_id, user_id, type, start_date, end_date)
    VALUES (
        v_tenant_id,
        v_gewerblich2_id,
        'sick',
        '2026-01-28'::DATE,
        '2026-01-28'::DATE
    );

    -- Schulung: Michael Braun 16.02. - 17.02.2026
    INSERT INTO absences (tenant_id, user_id, type, start_date, end_date, notes)
    VALUES (
        v_tenant_id,
        v_gewerblich7_id,
        'training',
        '2026-02-16'::DATE,
        '2026-02-17'::DATE,
        'Arbeitssicherheitsschulung'
    );

    -- ===============================================================
    -- TIME ENTRIES (IST-Stunden vergangene Wochen)
    -- ===============================================================

    -- Dezember 2025: Abbund Projekt 1
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        -- Abbund 15.-20.12.
        (v_tenant_id, v_gewerblich1_id, v_p1_phase1, '2025-12-15'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase1, '2025-12-16'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase1, '2025-12-17'::DATE, 7.5),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase1, '2025-12-18'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase1, '2025-12-19'::DATE, 8);

    -- Dezember 2025: Bestandsaufnahme Projekt 4
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        (v_tenant_id, v_gewerblich7_id, v_p4_phase1, '2025-12-08'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase1, '2025-12-09'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase1, '2025-12-10'::DATE, 8);

    -- Januar 2026: Elementfertigung Projekt 1
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        -- Elementfertigung KW 02 (06.-10.01.)
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-06'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-07'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-08'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-09'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-10'::DATE, 8),
        -- Elementfertigung KW 03 (13.-17.01.)
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-13'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-14'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-15'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-16'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_phase2, '2026-01-17'::DATE, 8);

    -- Januar 2026: Holzbaumontage Projekt 1 (erste Woche 20.-24.01.)
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-20'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-21'::DATE, 9),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-22'::DATE, 8.5),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-23'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_phase3, '2026-01-24'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-20'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-21'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-22'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-23'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_phase3, '2026-01-24'::DATE, 8);

    -- Projekt 4: Elementfertigung
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        -- Elementfertigung P4 (06.-17.01.)
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-06'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-07'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-08'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-09'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-10'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-13'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-14'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-15'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-16'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_phase2, '2026-01-17'::DATE, 8);

    -- Projekt 2: Abbund (05.-10.01.)
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        (v_tenant_id, v_gewerblich2_id, v_p2_phase1, '2026-01-06'::DATE, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p2_phase1, '2026-01-07'::DATE, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p2_phase1, '2026-01-08'::DATE, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p2_phase1, '2026-01-09'::DATE, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p2_phase1, '2026-01-10'::DATE, 6.4);

    RAISE NOTICE 'Seed Data erfolgreich erstellt!';
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE 'Admin User ID: %', v_admin_id;
    RAISE NOTICE '=== PROJEKTE (je 5 Phasen) ===';
    RAISE NOTICE 'Projekt 1 (Neubau Fam. Weber): % - 15.12.2025 bis 28.02.2026', v_project1_id;
    RAISE NOTICE 'Projekt 2 (Garage Schmitt): % - 05.01.2026 bis 20.02.2026', v_project2_id;
    RAISE NOTICE 'Projekt 3 (Modulhaus Meier): % - 02.02.2026 bis 27.03.2026', v_project3_id;
    RAISE NOTICE 'Projekt 4 (Sanierung Schmidt): % - 08.12.2025 bis 27.02.2026', v_project4_id;
    RAISE NOTICE 'Projekt 5 (Kita Friedberg): % - 16.02.2026 bis 31.03.2026', v_project5_id;

END $$;
