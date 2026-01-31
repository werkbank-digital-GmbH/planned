-- ===========================================================================
-- planned. - Add 'externes_gewerk' to phase_bereich enum
-- Migration: 20260131000003_add_externes_gewerk.sql
-- Beschreibung: Fügt dritten Bereich für Fremdleistungen hinzu
-- ===========================================================================

-- Add new enum value to phase_bereich
ALTER TYPE phase_bereich ADD VALUE 'externes_gewerk';

COMMENT ON TYPE phase_bereich IS 'Bereich einer Projektphase: produktion (Werk), montage (Baustelle), externes_gewerk (Fremdleistung)';
