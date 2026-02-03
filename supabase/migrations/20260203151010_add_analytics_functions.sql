-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Analytics Functions
-- ═══════════════════════════════════════════════════════════════════════════
-- Datenbank-Funktionen für das Analytics-System:
-- - get_active_phases_with_metrics: Lädt aktive Phasen mit Metriken
-- - get_latest_insights_for_phases: Lädt neueste Insights für Phasen


-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: get_active_phases_with_metrics
-- Lädt alle aktiven Phasen eines Tenants mit berechneten Metriken für Snapshots
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_active_phases_with_metrics(
  p_tenant_id UUID,
  p_today DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  ist_hours DECIMAL(10,2),
  soll_hours DECIMAL(10,2),
  plan_hours DECIMAL(10,2),
  allocations_count INTEGER,
  allocated_users_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pr.tenant_id,
    COALESCE(pp.actual_hours, 0)::DECIMAL(10,2) as ist_hours,
    COALESCE(pp.budget_hours, 0)::DECIMAL(10,2) as soll_hours,
    COALESCE(pp.planned_hours, 0)::DECIMAL(10,2) as plan_hours,
    COALESCE(alloc.allocations_count, 0)::INTEGER as allocations_count,
    COALESCE(alloc.allocated_users_count, 0)::INTEGER as allocated_users_count
  FROM project_phases pp
  JOIN projects pr ON pp.project_id = pr.id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::INTEGER as allocations_count,
      COUNT(DISTINCT a.user_id)::INTEGER as allocated_users_count
    FROM allocations a
    WHERE a.project_phase_id = pp.id
  ) alloc ON true
  WHERE pr.tenant_id = p_tenant_id
    AND pp.status = 'active'
    AND (
      -- Phase ist noch nicht abgeschlossen (End-Datum in Zukunft oder NULL)
      pp.end_date IS NULL
      OR pp.end_date >= p_today
      -- ODER Phase hat noch offene Stunden (SOLL > IST)
      OR COALESCE(pp.budget_hours, 0) > COALESCE(pp.actual_hours, 0)
    )
  ;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_active_phases_with_metrics(UUID, DATE) IS
  'Lädt alle aktiven Phasen eines Tenants mit aggregierten Allocation-Metriken.
   Wird vom Snapshot-Cron-Job verwendet.

   "Aktiv" bedeutet:
   - Phase hat status = active
   - End-Datum ist NULL oder in der Zukunft
   - ODER Phase hat noch offene Stunden (budget_hours > actual_hours)';


-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: get_latest_insights_for_phases
-- Lädt das jeweils neueste Insight für mehrere Phasen
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_latest_insights_for_phases(p_phase_ids UUID[])
RETURNS SETOF phase_insights AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (phase_id) *
  FROM phase_insights
  WHERE phase_id = ANY(p_phase_ids)
  ORDER BY phase_id, insight_date DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_latest_insights_for_phases(UUID[]) IS
  'Lädt das jeweils neueste Insight für eine Liste von Phasen.
   Verwendet DISTINCT ON für effiziente Abfrage.';
