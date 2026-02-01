-- ===============================================================
-- EXTEND: integration_credentials für neue Asana-Logik
-- ===============================================================
--
-- Neue Spalten für die umgebaute Asana-Integration:
-- - asana_source_project_id: GID des Quell-Projekts (z.B. "Jahresplanung")
-- - asana_team_id: GID des Teams für Bauvorhaben (z.B. "600 Projekte")
-- - asana_phase_type_field_id: Custom Field "Projektphase" (Dropdown)
-- - asana_zuordnung_field_id: Custom Field "Zuordnung" (Dropdown für Bereich)
-- - asana_soll_stunden_field_id: Custom Field "Soll-Stunden" (Number)

ALTER TABLE integration_credentials
  ADD COLUMN IF NOT EXISTS asana_source_project_id TEXT,
  ADD COLUMN IF NOT EXISTS asana_team_id TEXT,
  ADD COLUMN IF NOT EXISTS asana_phase_type_field_id TEXT,
  ADD COLUMN IF NOT EXISTS asana_zuordnung_field_id TEXT,
  ADD COLUMN IF NOT EXISTS asana_soll_stunden_field_id TEXT;

-- Kommentare für Dokumentation
COMMENT ON COLUMN integration_credentials.asana_source_project_id IS 'GID des Quell-Projekts aus dem Tasks/Phasen gelesen werden (z.B. Jahresplanung)';
COMMENT ON COLUMN integration_credentials.asana_team_id IS 'GID des Teams dessen Projekte als Bauvorhaben importiert werden';
COMMENT ON COLUMN integration_credentials.asana_phase_type_field_id IS 'Custom Field GID für Projektphase (Dropdown)';
COMMENT ON COLUMN integration_credentials.asana_zuordnung_field_id IS 'Custom Field GID für Zuordnung/Bereich (produktion/montage)';
COMMENT ON COLUMN integration_credentials.asana_soll_stunden_field_id IS 'Custom Field GID für Soll-Stunden (Number)';
