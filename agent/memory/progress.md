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
| **Asana Integration** | ✅ Backend, Token-Refresh, UI |
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
3. **Test-Coverage** – Repository & Server Action Tests
4. **Ressourcen-Verwaltung UI** – `/einstellungen/ressourcen`
5. **Profil Mobile** – `/profil` Mobile-Ansicht

---

## Letzte Session

**Datum:** 2026-02-01 (Task B: Integration UI)

### Erledigte Aufgaben:
- ✅ **Asana Integration UI** komplett implementiert
- ✅ **TimeTac Integration UI** komplett implementiert
- ✅ Neue Server Actions hinzugefügt

### Neue Dateien:
| Datei | Beschreibung |
|-------|--------------|
| `src/app/(dashboard)/einstellungen/integrationen/asana/page.tsx` | Asana Config-Seite |
| `src/app/(dashboard)/einstellungen/integrationen/asana/AsanaConnectionCard.tsx` | Verbindungs-Status |
| `src/app/(dashboard)/einstellungen/integrationen/asana/AsanaSyncCard.tsx` | Projekt-Sync |
| `src/app/(dashboard)/einstellungen/integrationen/asana/AsanaFieldMappingCard.tsx` | Custom Field Mapping |
| `src/app/(dashboard)/einstellungen/integrationen/timetac/page.tsx` | TimeTac Config-Seite |
| `src/app/(dashboard)/einstellungen/integrationen/timetac/TimeTacConnectionCard.tsx` | API-Key Formular |
| `src/app/(dashboard)/einstellungen/integrationen/timetac/TimeTacMappingCard.tsx` | Projekt-Mapping |

### Neue Server Actions (in `integrations.ts`):
| Action | Funktion |
|--------|----------|
| `connectTimeTac()` | TimeTac mit API-Key verbinden |
| `disconnectTimeTac()` | TimeTac-Verbindung trennen |
| `disconnectAsana()` | Asana-Verbindung trennen |
| `getAsanaConnectionStatus()` | Asana-Verbindungsstatus |
| `getTimeTacConnectionStatus()` | TimeTac-Verbindungsstatus |

### Features der Integration UI:
**Asana:**
- OAuth-Verbindung über Button
- Projekt-Sync mit Erfolgs-/Fehlermeldungen
- Custom Field Mapping (Projektnummer, Soll-Produktion, Soll-Montage)
- Verbindung trennen

**TimeTac:**
- API-Key Eingabe mit Validierung
- Projekt-Mapping (TimeTac Projekt → Planned Phase)
- Verbindung trennen / API-Key ändern

### Guard-Ergebnisse:
- ESLint: ⚠️ 7 Warnings (bekannte Server-Logs)
- TypeScript: ✅ **Keine Fehler**
- Vitest: ✅ **615 Tests grün**

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
