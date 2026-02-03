-- Migration: Add description to phases and address_conflict to projects
-- Plan D5-1: Asana-Sync Erweiterung

-- Task-Beschreibung in Phasen
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS description TEXT;

-- Adress-Konflikt Flag für Projekte
-- (TRUE wenn verschiedene Phasen unterschiedliche Adressen haben)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS address_conflict BOOLEAN DEFAULT FALSE;

-- Custom Field ID für Adresse (pro Tenant)
ALTER TABLE integration_credentials
ADD COLUMN IF NOT EXISTS asana_address_field_id TEXT;

-- Index für Suche in Beschreibungen (optional, für spätere Insights)
CREATE INDEX IF NOT EXISTS idx_project_phases_description_trgm
ON project_phases USING gin (description gin_trgm_ops);

-- Kommentar für Dokumentation
COMMENT ON COLUMN project_phases.description IS 'Task-Beschreibung aus Asana, für Kontext in Insights';
COMMENT ON COLUMN projects.address_conflict IS 'TRUE wenn Phasen unterschiedliche Adressen haben';
COMMENT ON COLUMN integration_credentials.asana_address_field_id IS 'GID des Asana Custom Fields für Projektadresse';
