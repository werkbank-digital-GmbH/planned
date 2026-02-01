-- ===============================================================
-- FIX: sync_logs RLS Policies
-- ===============================================================
--
-- Problem: Es fehlt die INSERT Policy für sync_logs.
-- Server Actions können keine Sync-Logs erstellen.
--
-- Lösung: INSERT und UPDATE Policies für authenticated users hinzufügen,
-- beschränkt auf den eigenen Tenant.

-- INSERT Policy für Sync-Log Erstellung
CREATE POLICY "sync_logs_insert_tenant" ON sync_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = get_current_tenant_id());

-- UPDATE Policy für Sync-Log Updates (status, result, completedAt)
CREATE POLICY "sync_logs_update_tenant" ON sync_logs
    FOR UPDATE
    TO authenticated
    USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());
