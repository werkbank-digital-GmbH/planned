-- ============================================================================
-- Migration: Asana Absences Configuration
-- ============================================================================
-- Fügt Konfigurationsfelder für Abwesenheiten aus Asana hinzu.
-- Abwesenheiten werden aus einem separaten Asana-Projekt synchronisiert.
-- Jeder Task = eine Abwesenheit, Assignee = abwesender Mitarbeiter.

-- Abwesenheiten-Projekt Config
ALTER TABLE integration_credentials
ADD COLUMN IF NOT EXISTS asana_absence_project_id TEXT;

COMMENT ON COLUMN integration_credentials.asana_absence_project_id IS 'GID des Asana Projekts für Abwesenheiten';

-- Asana-GID für Absences (für Sync)
ALTER TABLE absences
ADD COLUMN IF NOT EXISTS asana_gid TEXT;

-- Index für Lookup
CREATE INDEX IF NOT EXISTS idx_absences_asana_gid
ON absences(asana_gid)
WHERE asana_gid IS NOT NULL;

-- Unique Constraint (ein Task = eine Absence)
ALTER TABLE absences
ADD CONSTRAINT unique_asana_gid UNIQUE (asana_gid);

COMMENT ON COLUMN absences.asana_gid IS 'Asana Task GID für Sync';
