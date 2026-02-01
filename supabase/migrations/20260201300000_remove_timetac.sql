-- ============================================================
-- Migration: Remove TimeTac Integration
-- ============================================================
-- TimeTac is no longer needed. Actual hours and absences
-- will be synced from Asana instead.

-- 1. Drop indexes first
DROP INDEX IF EXISTS idx_users_timetac;
DROP INDEX IF EXISTS idx_time_entries_timetac;

-- 2. Drop unique constraints
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_timetac_tenant_unique;

-- 3. Drop columns from tables
ALTER TABLE users DROP COLUMN IF EXISTS timetac_id;
ALTER TABLE absences DROP COLUMN IF EXISTS timetac_id;
ALTER TABLE integration_credentials DROP COLUMN IF EXISTS timetac_account_id;
ALTER TABLE integration_credentials DROP COLUMN IF EXISTS timetac_api_token;

-- 4. Drop time_entries table (no longer needed)
DROP TABLE IF EXISTS time_entries;

-- 5. Remove 'timetac' from sync_service enum
-- Note: PostgreSQL requires creating a new type
DO $$
BEGIN
  -- Only proceed if timetac exists in the enum
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'timetac'
    AND enumtypid = 'sync_service'::regtype
  ) THEN
    -- Create new enum without timetac
    CREATE TYPE sync_service_new AS ENUM ('asana');

    -- Update existing data
    ALTER TABLE integration_mappings
      ALTER COLUMN service TYPE sync_service_new
      USING service::text::sync_service_new;

    -- Drop old type and rename new
    DROP TYPE sync_service;
    ALTER TYPE sync_service_new RENAME TO sync_service;
  END IF;
END $$;

-- 6. Clean up integration_mappings for timetac (just in case)
DELETE FROM integration_mappings WHERE service::text = 'timetac';
