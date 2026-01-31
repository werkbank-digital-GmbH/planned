-- ============================================================================
-- Migration: Integration Mappings
-- ============================================================================
-- Tabelle zum Speichern von Mappings zwischen externen Systemen und Planned.
-- Beispiel: TimeTac Projekt-ID -> Planned Project Phase ID

CREATE TABLE IF NOT EXISTS integration_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Welches System (timetac, asana, etc.)
    service TEXT NOT NULL,

    -- Welcher Typ (project, phase, user, etc.)
    mapping_type TEXT NOT NULL,

    -- ID im externen System (z.B. TimeTac Project ID)
    external_id TEXT NOT NULL,

    -- ID in Planned (z.B. Project Phase ID)
    internal_id UUID NOT NULL,

    -- Optional: Name für Anzeige
    external_name TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Eindeutigkeit pro Tenant/Service/Type/External ID
    CONSTRAINT unique_mapping UNIQUE (tenant_id, service, mapping_type, external_id)
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_integration_mappings_lookup
ON integration_mappings(tenant_id, service, mapping_type);

-- RLS Policies
ALTER TABLE integration_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_mappings_tenant_isolation ON integration_mappings
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- Trigger für updated_at
CREATE TRIGGER set_integration_mappings_updated_at
    BEFORE UPDATE ON integration_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Kommentare
COMMENT ON TABLE integration_mappings IS 'Mappings zwischen externen Systemen (TimeTac, Asana) und Planned-Entitäten';
COMMENT ON COLUMN integration_mappings.service IS 'Name des externen Services (timetac, asana)';
COMMENT ON COLUMN integration_mappings.mapping_type IS 'Typ des Mappings (project, phase, user)';
COMMENT ON COLUMN integration_mappings.external_id IS 'ID im externen System';
COMMENT ON COLUMN integration_mappings.internal_id IS 'UUID der Planned-Entität';
