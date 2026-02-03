-- Migration: Add suggested_action to phase_insights
-- Plan D7-1: AvailabilityAnalyzer + DB-Migration

-- ═══════════════════════════════════════════════════════════════════════════
-- SUGGESTED ACTIONS IN PHASE INSIGHTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Suggested Actions in Phase-Insights speichern
ALTER TABLE phase_insights
ADD COLUMN IF NOT EXISTS suggested_action JSONB;

-- Beispiel-Struktur:
-- {
--   "type": "assign_user",
--   "userId": "uuid",
--   "userName": "Max Müller",
--   "availableDays": ["2026-02-04", "2026-02-05"],
--   "reason": "Verfügbar Mi-Fr, 60% Auslastung"
-- }

COMMENT ON COLUMN phase_insights.suggested_action IS
  'KI-generierte Handlungsempfehlung mit konkreten Daten (User, Termine, etc.)';
