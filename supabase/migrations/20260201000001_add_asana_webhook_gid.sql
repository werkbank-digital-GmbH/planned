-- Migration: Add Asana Webhook GID
-- Speichert die GID des registrierten Asana Webhooks für spätere Cleanup-Operationen

ALTER TABLE integration_credentials
  ADD COLUMN IF NOT EXISTS asana_webhook_gid TEXT;

COMMENT ON COLUMN integration_credentials.asana_webhook_gid IS 'GID des registrierten Asana Webhooks (für Cleanup bei Disconnect)';
