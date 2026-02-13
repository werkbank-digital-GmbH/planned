-- Migration: Add 'vertrieb' to phase_bereich enum
-- Description: Adds a new enum value for sales/Vertrieb phases

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'vertrieb'
    AND enumtypid = 'phase_bereich'::regtype
  ) THEN
    ALTER TYPE phase_bereich ADD VALUE 'vertrieb';
  END IF;
END $$;
