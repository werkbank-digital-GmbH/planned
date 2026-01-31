-- Migration: Add missing columns to resource_types and resources
-- Diese Migration fügt updated_at und sort_order zu resource_types
-- und updated_at zu resources hinzu

-- resource_types: Add updated_at and sort_order
ALTER TABLE resource_types
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- resources: Add updated_at
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update existing rows to have a valid updated_at
UPDATE resource_types SET updated_at = created_at WHERE updated_at = now();
UPDATE resources SET updated_at = created_at WHERE updated_at = now();

-- Add trigger for resource_types updated_at
CREATE OR REPLACE FUNCTION update_resource_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_resource_types_updated_at
  BEFORE UPDATE ON resource_types
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_types_updated_at();

-- Add trigger for resources updated_at
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

-- Comment
COMMENT ON COLUMN resource_types.sort_order IS 'Sortierreihenfolge der ResourceTypes';
COMMENT ON COLUMN resource_types.updated_at IS 'Letzte Aktualisierung';
COMMENT ON COLUMN resources.updated_at IS 'Letzte Aktualisierung';
