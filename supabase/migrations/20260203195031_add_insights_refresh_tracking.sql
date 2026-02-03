-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add Insights Refresh Tracking
-- ═══════════════════════════════════════════════════════════════════════════
-- Adds tracking for manual insights refresh with rate limiting (max 1/hour per tenant).

-- Add column to track last manual refresh timestamp
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS insights_last_refresh_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.insights_last_refresh_at IS 'Timestamp of last manual insights refresh (rate limited to 1/hour)';

-- Index for efficient lookup (optional, but helps if we query by this frequently)
CREATE INDEX IF NOT EXISTS idx_tenants_insights_refresh
ON tenants(insights_last_refresh_at)
WHERE insights_last_refresh_at IS NOT NULL;
