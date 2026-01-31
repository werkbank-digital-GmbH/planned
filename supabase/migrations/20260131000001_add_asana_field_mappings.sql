-- ============================================================================
-- Migration: Add Asana Field Mappings
-- ============================================================================
-- Adds columns for SOLL Produktion and SOLL Montage custom field mappings

-- Add missing Asana custom field mapping columns
ALTER TABLE integration_credentials
ADD COLUMN IF NOT EXISTS asana_soll_produktion_field_id TEXT,
ADD COLUMN IF NOT EXISTS asana_soll_montage_field_id TEXT;

-- Comment explaining the fields
COMMENT ON COLUMN integration_credentials.asana_project_status_field_id IS 'Asana Custom Field GID for project number';
COMMENT ON COLUMN integration_credentials.asana_soll_produktion_field_id IS 'Asana Custom Field GID for SOLL Produktion hours';
COMMENT ON COLUMN integration_credentials.asana_soll_montage_field_id IS 'Asana Custom Field GID for SOLL Montage hours';
COMMENT ON COLUMN integration_credentials.asana_phase_bereich_field_id IS 'Asana Custom Field GID for phase area (Produktion/Montage)';
COMMENT ON COLUMN integration_credentials.asana_phase_budget_hours_field_id IS 'Asana Custom Field GID for phase budget hours';
