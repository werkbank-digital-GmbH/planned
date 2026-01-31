-- Migration: Add updated_at column to projects table
-- Description: Add updated_at for tracking local status changes

-- Add updated_at column to projects
ALTER TABLE projects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set initial updated_at to created_at for existing records
UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after setting default values
ALTER TABLE projects ALTER COLUMN updated_at SET NOT NULL;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMENT ON COLUMN projects.updated_at IS 'Timestamp of last local update';
