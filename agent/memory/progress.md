# planned. – Aktueller Fortschritt

> Diese Datei wird bei jedem `/memo` aktualisiert.

---

## Session-Status

**Letzte Aktualisierung:** 2026-02-01
**Projekt-Status:** MVP größtenteils implementiert, Resize-Feature implementiert

---

## Implementierungsstand (Zusammenfassung)

| Layer | Dateien | Status | Test-Coverage |
|-------|---------|--------|---------------|
| Domain | 15 | ✅ 100% | 95% |
| Application | 35 | ✅ 95% | 85% |
| Infrastructure | 30 | ✅ 98% | 30% |
| Presentation | 150+ | ⚠️ 95% | 8% |
| **Planning Components** | 39 | ✅ | **62 Tests** |

**Detaillierte Analyse:** Siehe `agent/memory/codebaseAnalysis.md`

---

## Feature-Status

| Feature | Status |
|---------|--------|
| Multi-Tenancy & RLS | ✅ |
| User Management | ✅ |
| Allocation CRUD | ✅ |
| Planning Grid (Week/Month) | ✅ |
| Drag & Drop | ✅ |
| Undo/Redo | ✅ |
| Keyboard Shortcuts | ✅ |
| **Allocation Resize** | ✅ |
| Resource Pool | ✅ |
| Dashboard KPIs | ✅ |
| Mobile "Meine Woche" | ✅ |
| Settings (Profil, Unternehmen) | ✅ |
| **Asana Integration** | ✅ Backend, Task-basierte Sync, UI umgebaut |
| **TimeTac Integration** | ✅ Backend, UI |

---

## Offene Punkte

### Fehlende UI-Seiten
- ✅ ~~`/einstellungen/integrationen/asana`~~ (IMPLEMENTIERT)
- ✅ ~~`/einstellungen/integrationen/timetac`~~ (IMPLEMENTIERT)
- ❌ `/einstellungen/ressourcen` (Placeholder)
- ❌ `/profil` Mobile (Placeholder)

### Kritische TODOs (10 verbleibend)
- ✅ ~~Token-Refresh nicht persistiert~~ (GEFIXT)
- ✅ ~~Token-Refresh in Server Action~~ (GEFIXT)
- ⚠️ Webhook-Signatur fehlt (`api/webhooks/asana/route.ts:271`) – niedrige Prio
- Resource Details unvollständig (`GetAllocationsForWeekQuery.ts:422`)

### Debug-Logging
- ✅ ~~`SupabaseProjectPhaseRepository.ts`~~ (ENTFERNT)
- ✅ ~~`allocations.ts`~~ (ENTFERNT)
- ✅ ~~`api/webhooks/asana/route.ts:53`~~ (ENTFERNT)

---

## Nächste Schritte (Empfohlen)

1. ~~**Asana Integration UI**~~ ✅ ERLEDIGT
2. ~~**TimeTac Integration UI**~~ ✅ ERLEDIGT
3. ~~**Planning Component Tests**~~ ✅ ERLEDIGT (57 Tests)
4. ~~**Resize-Feature**~~ ✅ ERLEDIGT – Allocation-Dauer per Drag ändern
5. **Repository & Server Action Tests** – Test-Coverage weiter erhöhen
6. **Ressourcen-Verwaltung UI** – `/einstellungen/ressourcen`
7. **E2E Tests** – Playwright Setup für kritische User Flows

---

## Letzte Session

**Datum:** 2026-02-01 (Asana-Integration Umbau)

### Erledigte Aufgaben:
- ✅ **RLS Fix** – sync_logs INSERT/UPDATE Policy hinzugefügt
- ✅ **DB Schema erweitert** – Neue Spalten für Task-basierte Sync
- ✅ **AsanaService erweitert** – getTeams, getTeamProjects, getTasksFromProject, mapTaskToPhase
- ✅ **IAsanaService erweitert** – AsanaTask, AsanaTeam, AsanaTaskSyncConfig, MappedTaskPhaseData
- ✅ **Neuer Use Case** – SyncAsanaTaskPhasesUseCase für Task-basierte Phasen
- ✅ **Neue Server Actions** – getAsanaTeams, getAsanaTeamProjects, getAsanaSourceConfig, saveAsanaSourceConfig, syncAsanaTaskPhases
- ✅ **Neue UI-Komponenten** – AsanaSourceConfigCard, AsanaTaskFieldMappingCard
- ✅ **Asana Page umgebaut** – Quell-Konfiguration statt direkter Projekt-Sync

### Neue Sync-Logik:
| Aspekt | Alt | Neu |
|--------|-----|-----|
| Projekte | Alle aus Workspace | Aus ausgewähltem Team |
| Phasen | Sections eines Projekts | Tasks aus Quell-Projekt (z.B. "Jahresplanung") |
| Projekt-Zuordnung | Direkt | Via Multi-Project Membership |
| Start/Ende | Nicht implementiert | Task Due Date Range |
| Budget Hours | Nicht implementiert | Custom Field "Soll-Stunden" |

### Neue Dateien:
| Datei | Beschreibung |
|-------|--------------|
| `supabase/migrations/20260201100000_fix_sync_logs_rls.sql` | RLS Policy Fix |
| `supabase/migrations/20260201100001_extend_integration_credentials.sql` | Neue DB-Spalten |
| `src/application/use-cases/integrations/SyncAsanaTaskPhasesUseCase.ts` | Neuer Use Case |
| `src/app/.../asana/AsanaSourceConfigCard.tsx` | Quell-Konfiguration UI |
| `src/app/.../asana/AsanaTaskFieldMappingCard.tsx` | Task Field Mapping UI |

### Guard-Ergebnisse:
- ESLint: ⚠️ 7 Warnings (bekannte Server-Logs)
- TypeScript: ✅ **Keine Fehler**
- Vitest: ✅ **677 Tests grün**

---

## Bekannte Issues

### ESLint Warnings (akzeptiert)
- 7× `no-console` in `api/webhooks/asana/route.ts` – legitime Server-Logs für Monitoring

---

## Technische Schulden / Backlog

### 🔜 Logger einführen
- **Priorität:** Mittel
- **Grund:** Die `console.log` Statements in Server-Code (z.B. Webhook-Handler) sollten durch einen strukturierten Logger ersetzt werden
- **Empfehlung:** `pino` oder `winston` für strukturiertes Logging mit Log-Levels, Timestamps und optional JSON-Output
- **Betroffene Stellen:**
  - `src/app/api/webhooks/asana/route.ts` (7 console.log/error Aufrufe)
  - Zukünftige Server Actions und API Routes

### 🔜 Atomare Server Actions für Batch-Operationen
- **Priorität:** Niedrig
- **Grund:** Resize und andere Batch-Operationen nutzen aktuell mehrere einzelne API-Calls. Bei Netzwerk-Fehlern kann inkonsistenter Zustand entstehen.
- **Empfehlung:** Dedizierte Server Actions wie `resizeAllocationSpanAction({ baseAllocationId, newEndDate })` die serverseitig in einer Transaktion arbeiten
- **Betroffene Stellen:**
  - Resize-Feature (aktuell client-seitig implementiert mit mehreren `createAllocationAction` / `deleteAllocationAction` Calls)
  - Zukünftige Bulk-Operationen
- **Status:** Resize funktioniert, aber könnte für Robustheit optimiert werden

### 🔜 TimeTac Integration – Bugs fixen
- **Priorität:** Mittel
- **Grund:** Kleinere Bugs in der TimeTac-Integration (Abwesenheits-Sync)
- **Status:** Integration läuft parallel, Bugs werden später analysiert
- **Betroffene Stellen:**
  - Abwesenheits-Daten im Planning-Grid
  - Sync-Logik zwischen TimeTac und planned.

### 🔜 Asana Integration – Webhook-Signatur
- **Priorität:** Niedrig
- **Grund:** Webhook-Signatur-Validierung fehlt (`api/webhooks/asana/route.ts:271`)
- **Empfehlung:** Asana Webhook-Signatur mit HMAC-SHA256 validieren
- **Betroffene Stellen:**
  - `src/app/api/webhooks/asana/route.ts`

---

<!-- Diese Datei bei jedem /memo aktualisieren -->
