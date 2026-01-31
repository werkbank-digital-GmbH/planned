-- Migration: Add updated_at column to project_phases table
-- Description: Add updated_at for tracking local changes

-- Add updated_at column to project_phases
ALTER TABLE project_phases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set initial updated_at to created_at for existing records
UPDATE project_phases SET updated_at = created_at WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after setting default values
ALTER TABLE project_phases ALTER COLUMN updated_at SET NOT NULL;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_project_phases_updated_at
    BEFORE UPDATE ON project_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMENT ON COLUMN project_phases.updated_at IS 'Timestamp of last local update';
