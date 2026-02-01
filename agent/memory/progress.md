# planned. – Aktueller Fortschritt

> Diese Datei wird bei jedem `/memo` aktualisiert.

---

## Session-Status

**Letzte Aktualisierung:** 2026-02-01
**Projekt-Status:** MVP größtenteils implementiert, Asana Custom Fields Fix

---

## Implementierungsstand (Zusammenfassung)

| Layer | Dateien | Status | Test-Coverage |
|-------|---------|--------|---------------|
| Domain | 16 | ✅ 100% | 95% |
| Application | 35 | ✅ 95% | 85% |
| Infrastructure | 30 | ✅ 98% | 30% |
| Presentation | 150+ | ⚠️ 95% | 8% |
| **Planning Components** | 39 | ✅ | **62 Tests** |
| **UI Components** | 15+ | ✅ | **12 Tests** (SearchableSelect) |

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
| **Asana Integration** | ✅ Backend, Task-basierte Sync, UI mit SearchableSelect, Custom Fields Fix |
| ~~TimeTac Integration~~ | ❌ **ENTFERNT** – Daten kommen aus Asana |

---

## Offene Punkte

### Fehlende UI-Seiten
- ✅ ~~`/einstellungen/integrationen/asana`~~ (IMPLEMENTIERT)
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

**Datum:** 2026-02-01 (Asana Custom Fields Fix & SearchableSelect)

### Erledigte Aufgaben:
- ✅ **SearchableSelect Komponente** – Wiederverwendbare cmdk-basierte Komponente
- ✅ **12 Unit Tests** – Vollständige Test-Coverage für SearchableSelect
- ✅ **Asana UI verbessert** – Select-Dropdowns durch SearchableSelect ersetzt
- ✅ **Custom Fields Fix** – Laden von Projekt statt Workspace
- ✅ **PhaseBereich erweitert** – `nicht_definiert` als neuer Wert hinzugefügt
- ✅ **Bereich-Mapping korrigiert** – Default jetzt `nicht_definiert` statt `produktion`
- ✅ **Supabase Migration** – Enum-Wert in Datenbank hinzugefügt

### Neue Dateien:
| Datei | Beschreibung |
|-------|--------------|
| `src/presentation/components/ui/searchable-select.tsx` | Command Palette Style Selector |
| `src/presentation/components/ui/searchable-select.test.tsx` | 12 Unit Tests |
| `supabase/migrations/20260201200000_add_nicht_definiert_bereich.sql` | Enum Migration |

### Geänderte Dateien:
| Datei | Änderung |
|-------|----------|
| `src/app/.../asana/AsanaSourceConfigCard.tsx` | Select → SearchableSelect |
| `src/app/.../asana/AsanaTaskFieldMappingCard.tsx` | Hinweis wenn kein Quell-Projekt |
| `src/domain/types/PhaseBereich.ts` | `nicht_definiert` hinzugefügt |
| `src/application/ports/services/IAsanaService.ts` | `getProjectCustomFields()` + Typ-Update |
| `src/infrastructure/services/AsanaService.ts` | Custom Fields von Projekt laden, Mapping-Fix |
| `src/presentation/actions/integrations.ts` | `getAsanaCustomFields()` von Projekt laden |
| `src/presentation/components/planning/DraggablePhaseCard.tsx` | Farb-Mapping für `nicht_definiert` |
| `src/presentation/components/project-details/PhaseCard.tsx` | Farb-Mapping für `nicht_definiert` |
| `src/lib/database.types.ts` | Enum-Typ aktualisiert |
| `tests/setup.ts` | scrollIntoView Mock hinzugefügt |

### Technische Details:
**Custom Fields API-Änderung:**
- Vorher: `/workspaces/{gid}/custom_field_settings` (Workspace-Level)
- Nachher: `/projects/{gid}/custom_field_settings` (Projekt-Level)

**PhaseBereich Mapping:**
- Vorher: Default war `produktion` (falsch)
- Nachher: Default ist `nicht_definiert` (korrekt)
- Neue Werte: `Produktion → produktion`, `Montage → montage`, `Externes Gewerk → externes_gewerk`, Rest → `nicht_definiert`

### Commits:
- `cc9b48e feat: Add searchable select for Asana source config`
- `d7759ab fix: Asana custom fields loading and bereich mapping`

### Guard-Ergebnisse:
- ESLint: ⚠️ 7 Warnings (bekannte Server-Logs)
- TypeScript: ✅ **Keine Fehler**
- Vitest: ✅ **689 Tests grün**

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

### 🔜 Asana Integration – Webhook-Signatur
- **Priorität:** Niedrig
- **Grund:** Webhook-Signatur-Validierung fehlt (`api/webhooks/asana/route.ts:271`)
- **Empfehlung:** Asana Webhook-Signatur mit HMAC-SHA256 validieren
- **Betroffene Stellen:**
  - `src/app/api/webhooks/asana/route.ts`

---

<!-- Diese Datei bei jedem /memo aktualisieren -->
