-- ===========================================================================
-- Migration: Add drive_folder_url to projects table
-- Date: 2026-02-01
-- Description: Adds a column for storing Google Drive folder URLs per project
-- ===========================================================================

-- Add drive_folder_url column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN projects.drive_folder_url IS 'Google Drive folder URL for project documents (manually maintained)';
