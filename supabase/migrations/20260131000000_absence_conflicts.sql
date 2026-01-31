-- ═══════════════════════════════════════════════════════════════════════════
-- ABSENCE CONFLICTS TABLE
-- Tracks conflicts between allocations and absences
-- ═══════════════════════════════════════════════════════════════════════════

-- Enum for conflict resolution status
CREATE TYPE conflict_resolution AS ENUM ('moved', 'deleted', 'ignored');

-- Absence conflicts table
CREATE TABLE absence_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    allocation_id UUID NOT NULL REFERENCES allocations(id) ON DELETE CASCADE,
    absence_id UUID NOT NULL REFERENCES absences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    absence_type absence_type NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution conflict_resolution,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint: one conflict per allocation-absence pair
    CONSTRAINT unique_allocation_absence UNIQUE (allocation_id, absence_id)
);

-- Indexes for common queries
CREATE INDEX idx_absence_conflicts_tenant_id ON absence_conflicts(tenant_id);
CREATE INDEX idx_absence_conflicts_allocation_id ON absence_conflicts(allocation_id);
CREATE INDEX idx_absence_conflicts_absence_id ON absence_conflicts(absence_id);
CREATE INDEX idx_absence_conflicts_user_id ON absence_conflicts(user_id);
CREATE INDEX idx_absence_conflicts_unresolved ON absence_conflicts(tenant_id, resolved_at)
    WHERE resolved_at IS NULL;
CREATE INDEX idx_absence_conflicts_date ON absence_conflicts(tenant_id, date);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE absence_conflicts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see conflicts from their tenant
CREATE POLICY "absence_conflicts_tenant_isolation" ON absence_conflicts
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Policy: Planer and Admin can insert/update conflicts
CREATE POLICY "absence_conflicts_planer_write" ON absence_conflicts
    FOR ALL
    USING (is_current_user_planer_or_admin())
    WITH CHECK (is_current_user_planer_or_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Automatically delete conflicts when allocation is deleted
-- (handled by ON DELETE CASCADE on the foreign key)

-- Automatically delete conflicts when absence is deleted
-- (handled by ON DELETE CASCADE on the foreign key)

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE absence_conflicts IS 'Tracks scheduling conflicts between allocations and absences';
COMMENT ON COLUMN absence_conflicts.allocation_id IS 'The allocation that conflicts with the absence';
COMMENT ON COLUMN absence_conflicts.absence_id IS 'The absence that caused the conflict';
COMMENT ON COLUMN absence_conflicts.resolution IS 'How the conflict was resolved: moved (allocation moved), deleted (allocation deleted), ignored (kept despite conflict)';
