# planned. – Aktueller Fortschritt

> Diese Datei wird bei jedem `/memo` aktualisiert.

---

## Session-Status

**Letzte Aktualisierung:** 2026-02-01
**Projekt-Status:** MVP größtenteils implementiert, Integration Use Cases getestet

---

## Implementierungsstand (Zusammenfassung)

| Layer | Dateien | Status | Test-Coverage |
|-------|---------|--------|---------------|
| Domain | 15 | ✅ 100% | 95% |
| Application | 35 | ✅ 95% | 85% |
| Infrastructure | 30 | ✅ 98% | 30% |
| Presentation | 150+ | ⚠️ 95% | 5% |

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
| Resource Pool | ✅ |
| Dashboard KPIs | ✅ |
| Mobile "Meine Woche" | ✅ |
| Settings (Profil, Unternehmen) | ✅ |
| **Asana Integration** | ⚠️ Backend ✅, Token-Refresh ✅, UI ❌ |
| **TimeTac Integration** | ⚠️ Backend ✅, UI ❌ |

---

## Offene Punkte

### Fehlende UI-Seiten
- ❌ `/einstellungen/integrationen/asana`
- ❌ `/einstellungen/integrationen/timetac`
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

1. **Asana Integration UI** – Config-Seite, Projekt-Auswahl
2. **TimeTac Integration UI** – API-Key Eingabe, User/Projekt-Mapping
3. **Test-Coverage** – Repository & Server Action Tests (Integration Use Cases ✅ erledigt)

---

## Letzte Session

**Datum:** 2026-02-01 (Task D: Integration Use Cases Tests)

### Erledigte Aufgaben:
- ✅ **54 neue Tests für Integration Use Cases geschrieben**
- ✅ 6 neue Test-Dateien erstellt
- ✅ ESLint-Fehler in neuen Tests behoben

### Neue Test-Dateien:
| Test-Datei | Tests | Use Case |
|------------|-------|----------|
| `ConnectTimeTacUseCase.test.ts` | 5 | API-Key Validierung, Account-Info |
| `SyncAsanaProjectsUseCase.test.ts` | 13 | Projekt-Sync, Token-Refresh, Archivierung |
| `UpdateAsanaPhaseUseCase.test.ts` | 10 | Phase-Update, Bidirektionaler Sync |
| `SyncTimeTacAbsencesUseCase.test.ts` | 10 | Abwesenheits-Sync, Konflikt-Erkennung |
| `SyncTimeTacTimeEntriesUseCase.test.ts` | 12 | TimeEntry-Sync, Projekt-Mapping |
| `UnlinkProjectUseCase.test.ts` | 4 | Asana-Verknüpfung entfernen |
| **Gesamt** | **54** | |

### Test-Kategorien pro Use Case:
- Happy Path (Erfolgreicher Durchlauf)
- Validation Errors (Ungültige Inputs)
- Auth Errors (Fehlende/abgelaufene Tokens)
- Token Refresh (Automatische Erneuerung + Persistierung)
- External Service Errors (API-Fehler)

### Guard-Ergebnisse:
- ESLint: ⚠️ 7 Warnings (bekannte Server-Logs)
- TypeScript: ✅ **Keine Fehler**
- Vitest: ✅ **615 Tests grün** (vorher 561)

---

## Bekannte Issues

### ESLint Warnings (akzeptiert)
- 7× `no-console` in `api/webhooks/asana/route.ts` – legitime Server-Logs für Monitoring

---

## Technische Schulden / Backlog

### 🔜 Logger einführen (geplant)
- **Priorität:** Mittel
- **Grund:** Die `console.log` Statements in Server-Code (z.B. Webhook-Handler) sollten durch einen strukturierten Logger ersetzt werden
- **Empfehlung:** `pino` oder `winston` für strukturiertes Logging mit Log-Levels, Timestamps und optional JSON-Output
- **Betroffene Stellen:**
  - `src/app/api/webhooks/asana/route.ts` (7 console.log/error Aufrufe)
  - Zukünftige Server Actions und API Routes

---

<!-- Diese Datei bei jedem /memo aktualisieren -->
