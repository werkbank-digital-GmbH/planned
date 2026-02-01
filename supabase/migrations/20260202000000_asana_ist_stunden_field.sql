-- ============================================================================
-- Migration: Asana Ist-Stunden Custom Field
-- ============================================================================
-- Fügt Konfigurationsfeld für das Asana Custom Field hinzu, das die
-- Ist-Stunden (actual hours) pro Task/Phase enthält.

ALTER TABLE integration_credentials
ADD COLUMN IF NOT EXISTS asana_ist_stunden_field_id TEXT;

COMMENT ON COLUMN integration_credentials.asana_ist_stunden_field_id IS 'GID des Asana Custom Fields für Ist-Stunden (Number)';
