# planned. – Aktueller Fortschritt

> Diese Datei wird bei jedem `/memo` aktualisiert.

---

## Session-Status

**Letzte Aktualisierung:** 2026-02-01
**Projekt-Status:** MVP größtenteils implementiert, Integrationen verbessert

---

## Implementierungsstand (Zusammenfassung)

| Layer | Dateien | Status | Test-Coverage |
|-------|---------|--------|---------------|
| Domain | 15 | ✅ 100% | 95% |
| Application | 35 | ✅ 95% | 75% |
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
3. **Test-Coverage** – Repository & Server Action Tests
4. **Test-Fixes** – Veraltete Mocks in Test-Dateien aktualisieren

---

## Letzte Session

**Datum:** 2026-02-01

### Erledigte Aufgaben:
- ✅ 5 Debug-Logs entfernt aus:
  - `SupabaseProjectPhaseRepository.ts` (2 Stellen)
  - `allocations.ts` (2 Stellen)
  - `api/webhooks/asana/route.ts` (1 Stelle)
- ✅ Token-Refresh Fix in `UpdateAsanaPhaseUseCase.ts`:
  - Interface erweitert mit `update()` Methode
  - Nach `refreshAccessToken()` werden neue Tokens in DB gespeichert
- ✅ Token-Refresh Fix in `integrations.ts` Server Action:
  - `getAsanaAccessToken()` prüft jetzt Token-Ablauf
  - Automatische Erneuerung mit Verschlüsselung
  - Fehlerbehandlung bei abgelaufenen Refresh-Tokens

### Geänderte Dateien:
| Datei | Änderung |
|-------|----------|
| `src/infrastructure/repositories/SupabaseProjectPhaseRepository.ts` | Debug-Logs entfernt |
| `src/presentation/actions/allocations.ts` | Debug-Logs entfernt |
| `src/app/api/webhooks/asana/route.ts` | Debug-Log entfernt |
| `src/application/use-cases/integrations/UpdateAsanaPhaseUseCase.ts` | Token-Refresh persistiert |
| `src/presentation/actions/integrations.ts` | Token-Refresh implementiert |

### Guard-Ergebnisse:
- ESLint: ⚠️ 7 Warnings (legitime Server-Logs in Webhook)
- TypeScript: ⚠️ Pre-existing Fehler in Test-Dateien
- Vitest: ✅ 561 Tests grün

---

## Bekannte Pre-existing Issues

### TypeScript-Fehler in Tests (nicht durch diese Session):
- Veraltete Mocks fehlen `findByTenantWithTimetacId`, `updateTimetacId`
- Deutsche Absence-Types (`urlaub`) vs. englische (`vacation`)
- Fehlende Typ-Exports in `database.types`

---

<!-- Diese Datei bei jedem /memo aktualisieren -->
