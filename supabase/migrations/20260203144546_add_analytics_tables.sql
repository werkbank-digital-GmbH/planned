-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Analytics Tables (Snapshots + Insights)
-- ═══════════════════════════════════════════════════════════════════════════
-- Erstellt Tabellen für das Analytics-System:
-- - phase_snapshots: Tägliche Momentaufnahmen der Phase-Metriken
-- - phase_insights: KI-generierte Insights pro Phase
-- - project_insights: Aggregierte Insights pro Projekt


-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE SNAPSHOTS
-- Tägliche Momentaufnahmen der Phase-Metriken für Burn-Rate-Berechnung
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE phase_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,

  -- Snapshot-Datum (nur Datum, keine Zeit)
  snapshot_date DATE NOT NULL,

  -- Metriken zum Zeitpunkt des Snapshots
  ist_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  plan_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  soll_hours DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Allocations-Info
  allocations_count INTEGER NOT NULL DEFAULT 0,
  allocated_users_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT phase_snapshots_unique_date UNIQUE(phase_id, snapshot_date)
);

COMMENT ON TABLE phase_snapshots IS 'Tägliche Momentaufnahmen der Phase-Metriken für Burn-Rate-Berechnung';
COMMENT ON COLUMN phase_snapshots.ist_hours IS 'IST-Stunden zum Zeitpunkt des Snapshots (aus Asana)';
COMMENT ON COLUMN phase_snapshots.plan_hours IS 'PLAN-Stunden (Summe aller Allocations)';
COMMENT ON COLUMN phase_snapshots.soll_hours IS 'SOLL-Stunden (Budget aus Asana)';

-- Indizes für schnelle Abfragen
CREATE INDEX idx_phase_snapshots_phase_date ON phase_snapshots(phase_id, snapshot_date DESC);
CREATE INDEX idx_phase_snapshots_tenant ON phase_snapshots(tenant_id);
CREATE INDEX idx_phase_snapshots_date ON phase_snapshots(snapshot_date);

-- RLS aktivieren
ALTER TABLE phase_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "phase_snapshots_tenant_isolation" ON phase_snapshots
  FOR ALL USING (tenant_id = get_current_tenant_id());


-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE INSIGHTS
-- KI-generierte Insights und Prognosen pro Phase
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE phase_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,

  -- Insight-Datum
  insight_date DATE NOT NULL,

  -- Berechnete Metriken (IST-basiert)
  burn_rate_ist DECIMAL(10,2),           -- Ø IST-Stunden/Arbeitstag
  burn_rate_ist_trend VARCHAR(10),       -- 'up', 'down', 'stable'
  days_remaining_ist INTEGER,            -- Tage bis fertig bei IST-Rate
  completion_date_ist DATE,              -- Prognostiziertes Enddatum (IST)
  deadline_delta_ist INTEGER,            -- Abweichung zur Deadline in Tagen

  -- Berechnete Metriken (PLAN-basiert)
  burn_rate_plan DECIMAL(10,2),          -- Ø PLAN-Stunden/Arbeitstag
  days_remaining_plan INTEGER,           -- Tage bis fertig bei PLAN-Rate
  completion_date_plan DATE,             -- Prognostiziertes Enddatum (PLAN)
  deadline_delta_plan INTEGER,           -- Abweichung zur Deadline in Tagen

  -- Zusätzliche Metriken
  remaining_hours DECIMAL(10,2),         -- SOLL - IST
  progress_percent INTEGER,              -- (IST / SOLL) * 100
  capacity_gap_hours DECIMAL(10,2),      -- Benötigte Stunden - geplante Stunden
  capacity_gap_days DECIMAL(10,2),       -- Capacity Gap in Personentagen

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  -- 'on_track'    - Im Zeitplan
  -- 'ahead'       - Vor dem Zeitplan
  -- 'at_risk'     - Gefährdet (leichte Verzögerung)
  -- 'behind'      - Hinter dem Zeitplan
  -- 'critical'    - Kritisch (starke Verzögerung)
  -- 'not_started' - Noch nicht gestartet
  -- 'completed'   - Abgeschlossen

  -- KI-generierte Texte (Deutsch)
  summary_text TEXT NOT NULL,            -- Kurzer Satz für Popover (~100 Zeichen)
  detail_text TEXT,                      -- 2-3 Sätze mit mehr Details
  recommendation_text TEXT,              -- Konkrete Handlungsempfehlung

  -- Meta
  data_quality VARCHAR(20),              -- 'good', 'limited', 'insufficient'
  data_points_count INTEGER,             -- Anzahl Snapshots für Berechnung

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT phase_insights_unique_date UNIQUE(phase_id, insight_date)
);

COMMENT ON TABLE phase_insights IS 'KI-generierte Insights und Prognosen pro Phase';
COMMENT ON COLUMN phase_insights.burn_rate_ist IS 'Durchschnittliche IST-Stunden pro Arbeitstag';
COMMENT ON COLUMN phase_insights.burn_rate_ist_trend IS 'Trend: up (steigend), down (fallend), stable';
COMMENT ON COLUMN phase_insights.status IS 'on_track, ahead, at_risk, behind, critical, not_started, completed';
COMMENT ON COLUMN phase_insights.summary_text IS 'Kurzer Satz für Popover (~100 Zeichen)';
COMMENT ON COLUMN phase_insights.data_quality IS 'good (>= 5 Datenpunkte), limited (3-4), insufficient (< 3)';

-- Indizes
CREATE INDEX idx_phase_insights_phase_date ON phase_insights(phase_id, insight_date DESC);
CREATE INDEX idx_phase_insights_tenant ON phase_insights(tenant_id);
CREATE INDEX idx_phase_insights_status ON phase_insights(status);

-- RLS
ALTER TABLE phase_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phase_insights_tenant_isolation" ON phase_insights
  FOR ALL USING (tenant_id = get_current_tenant_id());


-- ═══════════════════════════════════════════════════════════════════════════
-- PROJECT INSIGHTS
-- Aggregierte Insights pro Projekt (aus Phasen berechnet)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE project_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Insight-Datum
  insight_date DATE NOT NULL,

  -- Aggregierte Metriken
  total_soll_hours DECIMAL(10,2),
  total_ist_hours DECIMAL(10,2),
  total_plan_hours DECIMAL(10,2),
  total_remaining_hours DECIMAL(10,2),
  overall_progress_percent INTEGER,

  -- Phase-Statistiken
  phases_count INTEGER,
  phases_on_track INTEGER,
  phases_at_risk INTEGER,
  phases_behind INTEGER,
  phases_completed INTEGER,

  -- Projekt-Prognose
  latest_phase_deadline DATE,            -- Späteste Phase-Deadline
  projected_completion_date DATE,        -- Prognostiziertes Projektende
  project_deadline_delta INTEGER,        -- Abweichung zum Projektende

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'unknown',

  -- KI-generierte Texte
  summary_text TEXT NOT NULL,
  detail_text TEXT,
  recommendation_text TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT project_insights_unique_date UNIQUE(project_id, insight_date)
);

COMMENT ON TABLE project_insights IS 'Aggregierte Insights pro Projekt (aus Phasen berechnet)';
COMMENT ON COLUMN project_insights.latest_phase_deadline IS 'Späteste Deadline aller aktiven Phasen';
COMMENT ON COLUMN project_insights.projected_completion_date IS 'Prognostiziertes Projektende basierend auf Phasen';

-- Indizes
CREATE INDEX idx_project_insights_project_date ON project_insights(project_id, insight_date DESC);
CREATE INDEX idx_project_insights_tenant ON project_insights(tenant_id);

-- RLS
ALTER TABLE project_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_insights_tenant_isolation" ON project_insights
  FOR ALL USING (tenant_id = get_current_tenant_id());


-- ═══════════════════════════════════════════════════════════════════════════
-- CLEANUP FUNCTION
-- Löscht alte Snapshots (10 Jahre nach Projektabschluss)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Lösche Snapshots von Phasen deren Projekt seit > 10 Jahren abgeschlossen ist
  WITH phases_to_cleanup AS (
    SELECT pp.id as phase_id
    FROM project_phases pp
    JOIN projects p ON pp.project_id = p.id
    WHERE p.status = 'completed'
      AND pp.end_date < CURRENT_DATE - INTERVAL '10 years'
  )
  DELETE FROM phase_snapshots
  WHERE phase_id IN (SELECT phase_id FROM phases_to_cleanup);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_snapshots() IS
  'Löscht Snapshots von abgeschlossenen Projekten die seit mehr als 10 Jahren beendet sind.
   Sollte periodisch (z.B. monatlich) aufgerufen werden.';
