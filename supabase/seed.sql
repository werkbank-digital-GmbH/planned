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
    -- Phasen Projekt 1 (Neubau Fam. Weber)
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
    -- Phasen Projekt 2 (Anbau Garage)
    v_p2_abbund UUID;
    v_p2_elementfertigung UUID;
    v_p2_holzbaumontage UUID;
    v_p2_dachdeckerarbeiten UUID;
    -- Phasen Projekt 3 (Modulhaus)
    v_p3_modulbau UUID;
    v_p3_holzbaumontage UUID;
    v_p3_elektro UUID;
    -- Phasen Projekt 4 (Sanierung Schmidt)
    v_p4_abbund UUID;
    v_p4_elementfertigung UUID;
    v_p4_holzbaumontage UUID;
    v_p4_fassade UUID;
    v_p4_innenausbau UUID;
    -- Phasen Projekt 5 (Holzrahmenbau Kita)
    v_p5_planung UUID;
    v_p5_abbund UUID;
    v_p5_elementfertigung UUID;
    v_p5_holzbaumontage UUID;
    v_p5_dach UUID;
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
    -- PROJECTS (Feste Datumsangaben: Dezember 2025 - April 2026)
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

    -- Projekt 2: Kleines Projekt (aktiv, startet Januar 2026)
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

    -- Projekt 5: Kita (in Planung, startet März 2026)
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
    -- Zeitraum: 15.12.2025 - 28.02.2026
    -- ===============================================================

    -- PRODUKTION: Abbund (ABU) - 15.12. - 20.12.2025 (abgeschlossen)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ABU: Abbund', 'produktion', '2025-12-15'::DATE, '2025-12-20'::DATE, 40, 1, 'asana_phase_p1_01')
    RETURNING id INTO v_p1_abbund;

    -- PRODUKTION: Zuschnitt (ZUS) - 16.12. - 19.12.2025 (abgeschlossen)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ZUS: Zuschnitt', 'produktion', '2025-12-16'::DATE, '2025-12-19'::DATE, 24, 2, 'asana_phase_p1_02')
    RETURNING id INTO v_p1_zuschnitt;

    -- PRODUKTION: Elementfertigung (ELMT) - 06.01. - 17.01.2026 (abgeschlossen)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-06'::DATE, '2026-01-17'::DATE, 64, 3, 'asana_phase_p1_03')
    RETURNING id INTO v_p1_elementfertigung;

    -- PRODUKTION: Fensterbau (FEB) - 13.01. - 17.01.2026 (abgeschlossen)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'FEB: Fensterbau', 'produktion', '2026-01-13'::DATE, '2026-01-17'::DATE, 32, 4, 'asana_phase_p1_04')
    RETURNING id INTO v_p1_fensterbau;

    -- MONTAGE: Holzbaumontage (HOBM) - 20.01. - 31.01.2026 (AKTIV)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-20'::DATE, '2026-01-31'::DATE, 80, 5, 'asana_phase_p1_05')
    RETURNING id INTO v_p1_holzbaumontage;

    -- MONTAGE: Montagenebenarbeiten (MNA) - 27.01. - 07.02.2026 (AKTIV)
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'MNA: Montagenebenarbeiten', 'montage', '2026-01-27'::DATE, '2026-02-07'::DATE, 24, 6, 'asana_phase_p1_06')
    RETURNING id INTO v_p1_montageneben;

    -- MONTAGE: Dachdeckerarbeiten (DADE) - 03.02. - 10.02.2026
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-02-03'::DATE, '2026-02-10'::DATE, 40, 7, 'asana_phase_p1_07')
    RETURNING id INTO v_p1_dachdeckerarbeiten;

    -- EXTERNES GEWERK: Elektroinstallationen (ELT) - 10.02. - 21.02.2026
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'ELT: Elektroinstallationen', 'externes_gewerk', '2026-02-10'::DATE, '2026-02-21'::DATE, 48, 8, 'asana_phase_p1_08')
    RETURNING id INTO v_p1_elektro;

    -- EXTERNES GEWERK: Heizungsinstallationen (HEIZ) - 10.02. - 17.02.2026
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'HEIZ: Heizungsinstallationen', 'externes_gewerk', '2026-02-10'::DATE, '2026-02-17'::DATE, 40, 9, 'asana_phase_p1_09')
    RETURNING id INTO v_p1_heizung;

    -- EXTERNES GEWERK: Sanitärinstallationen (SAN) - 16.02. - 21.02.2026
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'SAN: Sanitärinstallationen', 'externes_gewerk', '2026-02-16'::DATE, '2026-02-21'::DATE, 32, 10, 'asana_phase_p1_10')
    RETURNING id INTO v_p1_sanitaer;

    -- EXTERNES GEWERK: Trockenbauarbeiten (TRO) - 23.02. - 28.02.2026
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'TRO: Trockenbauarbeiten', 'externes_gewerk', '2026-02-23'::DATE, '2026-02-28'::DATE, 56, 11, 'asana_phase_p1_11')
    RETURNING id INTO v_p1_trockenbau;

    -- EXTERNES GEWERK: Estricharbeiten (EST) - 02.03. - 06.03.2026
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'EST: Estricharbeiten', 'externes_gewerk', '2026-03-02'::DATE, '2026-03-06'::DATE, 16, 12, 'asana_phase_p1_12')
    RETURNING id INTO v_p1_estrich;

    -- EXTERNES GEWERK: Bodenbelagsarbeiten (BOD) - 16.03. - 20.03.2026
    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project1_id, 'BOD: Bodenbelagsarbeiten', 'externes_gewerk', '2026-03-16'::DATE, '2026-03-20'::DATE, 24, 13, 'asana_phase_p1_13')
    RETURNING id INTO v_p1_boden;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 2 (Anbau Garage Schmitt)
    -- Zeitraum: 19.01.2026 - 13.02.2026
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'ABU: Abbund', 'produktion', '2026-01-19'::DATE, '2026-01-23'::DATE, 16, 1, 'asana_phase_p2_01')
    RETURNING id INTO v_p2_abbund;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-26'::DATE, '2026-01-30'::DATE, 24, 2, 'asana_phase_p2_02')
    RETURNING id INTO v_p2_elementfertigung;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'HOBM: Holzbaumontage', 'montage', '2026-02-02'::DATE, '2026-02-06'::DATE, 32, 3, 'asana_phase_p2_03')
    RETURNING id INTO v_p2_holzbaumontage;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project2_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-02-09'::DATE, '2026-02-13'::DATE, 16, 4, 'asana_phase_p2_04')
    RETURNING id INTO v_p2_dachdeckerarbeiten;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 3 (Modulhaus Meier - in Planung)
    -- Zeitraum: 16.02.2026 - 15.04.2026
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project3_id, 'MOD: Modulbau', 'produktion', '2026-02-16'::DATE, '2026-03-13'::DATE, 120, 1, 'asana_phase_p3_01')
    RETURNING id INTO v_p3_modulbau;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project3_id, 'HOBM: Holzbaumontage', 'montage', '2026-03-16'::DATE, '2026-03-27'::DATE, 40, 2, 'asana_phase_p3_02')
    RETURNING id INTO v_p3_holzbaumontage;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project3_id, 'ELT: Elektroinstallationen', 'externes_gewerk', '2026-03-30'::DATE, '2026-04-15'::DATE, 32, 3, 'asana_phase_p3_03')
    RETURNING id INTO v_p3_elektro;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 4 (Sanierung Schmidt)
    -- Zeitraum: 06.01.2026 - 27.02.2026
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project4_id, 'ABU: Abbund', 'produktion', '2026-01-06'::DATE, '2026-01-10'::DATE, 24, 1, 'asana_phase_p4_01')
    RETURNING id INTO v_p4_abbund;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project4_id, 'ELMT: Elementfertigung', 'produktion', '2026-01-13'::DATE, '2026-01-24'::DATE, 48, 2, 'asana_phase_p4_02')
    RETURNING id INTO v_p4_elementfertigung;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project4_id, 'HOBM: Holzbaumontage', 'montage', '2026-01-27'::DATE, '2026-02-06'::DATE, 56, 3, 'asana_phase_p4_03')
    RETURNING id INTO v_p4_holzbaumontage;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project4_id, 'FAS: Fassade', 'montage', '2026-02-09'::DATE, '2026-02-13'::DATE, 32, 4, 'asana_phase_p4_04')
    RETURNING id INTO v_p4_fassade;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project4_id, 'IAB: Innenausbau', 'montage', '2026-02-16'::DATE, '2026-02-27'::DATE, 64, 5, 'asana_phase_p4_05')
    RETURNING id INTO v_p4_innenausbau;

    -- ===============================================================
    -- PROJECT PHASES - Projekt 5 (Holzrahmenbau Kita)
    -- Zeitraum: 02.03.2026 - 30.04.2026
    -- ===============================================================

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project5_id, 'PLAN: Planungsphase', 'produktion', '2026-03-02'::DATE, '2026-03-06'::DATE, 16, 1, 'asana_phase_p5_01')
    RETURNING id INTO v_p5_planung;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project5_id, 'ABU: Abbund', 'produktion', '2026-03-09'::DATE, '2026-03-20'::DATE, 48, 2, 'asana_phase_p5_02')
    RETURNING id INTO v_p5_abbund;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project5_id, 'ELMT: Elementfertigung', 'produktion', '2026-03-23'::DATE, '2026-04-10'::DATE, 96, 3, 'asana_phase_p5_03')
    RETURNING id INTO v_p5_elementfertigung;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project5_id, 'HOBM: Holzbaumontage', 'montage', '2026-04-13'::DATE, '2026-04-24'::DATE, 80, 4, 'asana_phase_p5_04')
    RETURNING id INTO v_p5_holzbaumontage;

    INSERT INTO project_phases (project_id, name, bereich, start_date, end_date, budget_hours, sort_order, asana_gid)
    VALUES (v_project5_id, 'DADE: Dachdeckerarbeiten', 'montage', '2026-04-27'::DATE, '2026-04-30'::DATE, 32, 5, 'asana_phase_p5_05')
    RETURNING id INTO v_p5_dach;

    -- ===============================================================
    -- ALLOCATIONS - Aktuelle Woche (KW 05: 27.01. - 31.01.2026)
    -- und kommende Wochen
    -- ===============================================================

    -- === Projekt 1: Holzbaumontage (20.01. - 31.01.2026) ===

    -- Max Bauer: Ganze Woche auf Holzbaumontage
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-31'::DATE);

    -- Stefan Huber: Mo-Mi auf Holzbaumontage, Do-Fr auf Montagenebenarbeiten
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich4_id, v_p1_holzbaumontage, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_holzbaumontage, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_holzbaumontage, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_montageneben, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p1_montageneben, '2026-01-31'::DATE);

    -- Klaus Wagner: Holzbaumontage Mo-Fr
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-31'::DATE);

    -- === Projekt 2: Elementfertigung (26.01. - 30.01.2026) ===

    -- Lisa Weber: Mo-Fr auf Elementfertigung (Projekt 2)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich2_id, v_p2_elementfertigung, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich2_id, v_p2_elementfertigung, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich2_id, v_p2_elementfertigung, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich2_id, v_p2_elementfertigung, '2026-01-30'::DATE);

    -- Andreas Fischer: Mo-Fr auf Elementfertigung (Projekt 2)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich5_id, v_p2_elementfertigung, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich5_id, v_p2_elementfertigung, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich5_id, v_p2_elementfertigung, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich5_id, v_p2_elementfertigung, '2026-01-30'::DATE);

    -- === Projekt 4: Holzbaumontage (27.01. - 06.02.2026) ===

    -- Michael Braun: Ganze Woche auf Holzbaumontage Sanierung
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich7_id, v_p4_holzbaumontage, '2026-01-27'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_holzbaumontage, '2026-01-28'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_holzbaumontage, '2026-01-29'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_holzbaumontage, '2026-01-30'::DATE),
        (v_tenant_id, v_gewerblich7_id, v_p4_holzbaumontage, '2026-01-31'::DATE);

    -- === Ressourcen-Zuweisungen ===

    -- Sprinter 1: Projekt 1 Holzbaumontage
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_resource1_id, v_p1_holzbaumontage, '2026-01-27'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_holzbaumontage, '2026-01-28'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_holzbaumontage, '2026-01-29'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_holzbaumontage, '2026-01-30'::DATE),
        (v_tenant_id, v_resource1_id, v_p1_holzbaumontage, '2026-01-31'::DATE);

    -- Sprinter 2: Projekt 4 Holzbaumontage
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_resource2_id, v_p4_holzbaumontage, '2026-01-27'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_holzbaumontage, '2026-01-28'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_holzbaumontage, '2026-01-29'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_holzbaumontage, '2026-01-30'::DATE),
        (v_tenant_id, v_resource2_id, v_p4_holzbaumontage, '2026-01-31'::DATE);

    -- Autokran: Projekt 1 Holzbaumontage Mi-Fr
    INSERT INTO allocations (tenant_id, resource_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_resource3_id, v_p1_holzbaumontage, '2026-01-29'::DATE),
        (v_tenant_id, v_resource3_id, v_p1_holzbaumontage, '2026-01-30'::DATE),
        (v_tenant_id, v_resource3_id, v_p1_holzbaumontage, '2026-01-31'::DATE);

    -- ===============================================================
    -- ALLOCATIONS - Kommende Woche (KW 06: 02.02. - 06.02.2026)
    -- ===============================================================

    -- Projekt 1: Dachdeckerarbeiten starten (03.02.)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_dachdeckerarbeiten, '2026-02-03'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_dachdeckerarbeiten, '2026-02-04'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_dachdeckerarbeiten, '2026-02-05'::DATE),
        (v_tenant_id, v_gewerblich1_id, v_p1_dachdeckerarbeiten, '2026-02-06'::DATE);

    -- Projekt 2: Holzbaumontage (02.02. - 06.02.)
    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich4_id, v_p2_holzbaumontage, '2026-02-02'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_holzbaumontage, '2026-02-03'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_holzbaumontage, '2026-02-04'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_holzbaumontage, '2026-02-05'::DATE),
        (v_tenant_id, v_gewerblich4_id, v_p2_holzbaumontage, '2026-02-06'::DATE);

    INSERT INTO allocations (tenant_id, user_id, project_phase_id, date)
    VALUES
        (v_tenant_id, v_gewerblich6_id, v_p2_holzbaumontage, '2026-02-02'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_holzbaumontage, '2026-02-03'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_holzbaumontage, '2026-02-04'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_holzbaumontage, '2026-02-05'::DATE),
        (v_tenant_id, v_gewerblich6_id, v_p2_holzbaumontage, '2026-02-06'::DATE);

    -- ===============================================================
    -- ABSENCES (Dezember 2025 - April 2026)
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

    -- Dezember 2025: Abbund und Zuschnitt
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        -- Abbund 15.-20.12.
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, '2025-12-15'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, '2025-12-16'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, '2025-12-17'::DATE, 7.5),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, '2025-12-18'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_abbund, '2025-12-19'::DATE, 8),
        -- Zuschnitt 16.-19.12.
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, '2025-12-16'::DATE, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, '2025-12-17'::DATE, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, '2025-12-18'::DATE, 6.4),
        (v_tenant_id, v_gewerblich2_id, v_p1_zuschnitt, '2025-12-19'::DATE, 6.4);

    -- Januar 2026: Elementfertigung
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        -- Elementfertigung KW 02 (06.-10.01.)
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-06'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-07'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-08'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-09'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-10'::DATE, 8),
        -- Elementfertigung KW 03 (13.-17.01.)
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-13'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-14'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-15'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-16'::DATE, 8),
        (v_tenant_id, v_gewerblich4_id, v_p1_elementfertigung, '2026-01-17'::DATE, 8);

    -- Januar 2026: Holzbaumontage (erste Woche 20.-24.01.)
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-20'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-21'::DATE, 9),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-22'::DATE, 8.5),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-23'::DATE, 8),
        (v_tenant_id, v_gewerblich1_id, v_p1_holzbaumontage, '2026-01-24'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-20'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-21'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-22'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-23'::DATE, 8),
        (v_tenant_id, v_gewerblich6_id, v_p1_holzbaumontage, '2026-01-24'::DATE, 8);

    -- Projekt 4: Abbund und Elementfertigung
    INSERT INTO time_entries (tenant_id, user_id, project_phase_id, date, hours)
    VALUES
        -- Abbund P4 (06.-10.01.)
        (v_tenant_id, v_gewerblich7_id, v_p4_abbund, '2026-01-06'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_abbund, '2026-01-07'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_abbund, '2026-01-08'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_abbund, '2026-01-09'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_abbund, '2026-01-10'::DATE, 8),
        -- Elementfertigung P4 (13.-24.01.)
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-13'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-14'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-15'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-16'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-17'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-20'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-21'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-22'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-23'::DATE, 8),
        (v_tenant_id, v_gewerblich7_id, v_p4_elementfertigung, '2026-01-24'::DATE, 8);

    RAISE NOTICE 'Seed Data erfolgreich erstellt!';
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE 'Admin User ID: %', v_admin_id;
    RAISE NOTICE '=== PROJEKTE ===';
    RAISE NOTICE 'Projekt 1 (Neubau Fam. Weber): % - 13 Phasen, 15.12.2025-20.03.2026', v_project1_id;
    RAISE NOTICE 'Projekt 2 (Garage Schmitt): % - 4 Phasen, 19.01.-13.02.2026', v_project2_id;
    RAISE NOTICE 'Projekt 3 (Modulhaus Meier): % - 3 Phasen, 16.02.-15.04.2026', v_project3_id;
    RAISE NOTICE 'Projekt 4 (Sanierung Schmidt): % - 5 Phasen, 06.01.-27.02.2026', v_project4_id;
    RAISE NOTICE 'Projekt 5 (Kita Friedberg): % - 5 Phasen, 02.03.-30.04.2026', v_project5_id;

END $$;
