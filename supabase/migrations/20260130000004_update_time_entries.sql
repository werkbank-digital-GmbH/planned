-- Migration: Update time_entries table
-- - project_phase_id nullable (Zuordnung erfolgt via Matching)
-- - description hinzufügen
-- - updated_at hinzufügen
-- - Unique constraint für timetac_id + tenant_id (Upsert)

-- Make project_phase_id nullable
ALTER TABLE time_entries
ALTER COLUMN project_phase_id DROP NOT NULL;

-- Add description and updated_at columns
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update existing rows
UPDATE time_entries SET updated_at = created_at WHERE updated_at = now();

-- Add unique constraint for upsert via timetac_id + tenant_id
ALTER TABLE time_entries
ADD CONSTRAINT time_entries_timetac_tenant_unique
UNIQUE (timetac_id, tenant_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entries_updated_at();

-- Comments
COMMENT ON COLUMN time_entries.project_phase_id IS 'Optional: Zuordnung zu Phase (erfolgt via Matching)';
COMMENT ON COLUMN time_entries.description IS 'Optionale Beschreibung aus TimeTac';
COMMENT ON COLUMN time_entries.updated_at IS 'Letzte Aktualisierung';
