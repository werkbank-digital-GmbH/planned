-- Migration: Add missing columns to absences
-- Diese Migration fügt notes und updated_at zu absences hinzu

-- absences: Add notes and updated_at
ALTER TABLE absences
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update existing rows to have a valid updated_at
UPDATE absences SET updated_at = created_at WHERE updated_at = now();

-- Add trigger for absences updated_at
CREATE OR REPLACE FUNCTION update_absences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_absences_updated_at
  BEFORE UPDATE ON absences
  FOR EACH ROW
  EXECUTE FUNCTION update_absences_updated_at();

-- Comment
COMMENT ON COLUMN absences.notes IS 'Optionale Notizen zur Abwesenheit';
COMMENT ON COLUMN absences.updated_at IS 'Letzte Aktualisierung';
