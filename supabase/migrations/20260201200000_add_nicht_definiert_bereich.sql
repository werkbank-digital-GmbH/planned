-- Migration: Add 'nicht_definiert' to phase_bereich enum
-- Description: Adds a new enum value for phases without a defined bereich

-- Add new enum value (IF NOT EXISTS is not supported directly, so we check first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'nicht_definiert'
    AND enumtypid = 'phase_bereich'::regtype
  ) THEN
    ALTER TYPE phase_bereich ADD VALUE 'nicht_definiert';
  END IF;
END $$;

-- Note: The new value will be added at the end of the enum list
-- Existing data is not affected as default values are not changed
