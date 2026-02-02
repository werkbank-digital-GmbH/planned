# Active Context

## Aktueller Stand (2024-02-02)

### Abgeschlossene Pläne

1. **Plan 1: TimeTac-Integration entfernen** ✅
   - Alle TimeTac-bezogenen Dateien gelöscht
   - Datenbank-Migrationen erstellt
   - Commit: `5877ff8`

2. **Plan 2: Asana-Integration erweitern** ✅
   - User-Mapping (Email-Prefix-Matching)
   - Ist-Stunden Custom Field
   - Abwesenheiten-Sync
   - Domain-Services und Use Cases
   - Commit: `6fe44bc`

3. **Plan 3: Integrationen-UI umstrukturieren** ✅
   - Funktionsbasierte Struktur statt Tool-basiert
   - 3 Karten: Projekte & Phasen, Mitarbeiter, Abwesenheiten
   - Commits: `39002b8`, `377bb70`

4. **Prompt 1: Cron-Job erweitern** ✅
   - Task-Phasen Sync (ersetzt Legacy SyncAsanaProjectsUseCase)
   - User-Mapping Sync
   - Abwesenheiten Sync (wenn konfiguriert)
   - Commit: `280e9cd`

5. **Prompt 2: Webhook-Signatur + Tests** ✅
   - Signatur-Validierung war bereits implementiert
   - TODO-Kommentare bereinigt
   - 22 neue Use Case Tests (7 + 15)
   - Commit: `8ac0064`

6. **Prompt A + B: Planning UI Verbesserungen** ✅
   - ResourcePool-Spalten aligned mit PlanningGrid (280px + repeat(5,1fr))
   - Redundante Header im Pool entfernt
   - Resizable ResourcePool mit Drag-Handle
   - Höhe im localStorage persistiert
   - Neuer Hook: `useResizable`
   - Commit: `a30208f`

7. **Plan C: Asana Sync-Benachrichtigungen** ✅
   - notificationStore mit Auto-Dismiss-Logik (5s)
   - SyncToast Komponente (aufklappbar, unten links)
   - SyncNotificationListener für Supabase Realtime
   - Broadcast vom Webhook-Handler an alle Tenant-Clients
   - Commit: `c8afc7f`
   - **Hotfix:** Hydration-Guard hinzugefügt
   - Commit: `ced74d6`

### Geplante Features

Keine offenen Aufgaben aus dieser Sprint-Phase.

## Wichtige Entscheidungen

- Asana ist die einzige externe Integration
- User-Matching basiert auf Email-Prefix
- Ist-Stunden kommen aus Asana Custom Field (nicht TimeTac)
- Abwesenheiten werden aus separatem Asana-Projekt synchronisiert
- Cron-Job führt alle 3 Sync-Arten aus (Tasks, Users, Absences)
- ResourcePool-Höhe wird im localStorage unter `planning-resource-pool-height` gespeichert
- Sync-Notifications via Supabase Realtime Broadcast
