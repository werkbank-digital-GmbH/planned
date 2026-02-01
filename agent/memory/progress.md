# planned. – Aktueller Fortschritt

> Diese Datei wird bei jedem `/memo` aktualisiert.

---

## Session-Status

**Letzte Aktualisierung:** 2026-02-01
**Projekt-Status:** MVP größtenteils implementiert, Planning-Komponenten getestet

---

## Implementierungsstand (Zusammenfassung)

| Layer | Dateien | Status | Test-Coverage |
|-------|---------|--------|---------------|
| Domain | 15 | ✅ 100% | 95% |
| Application | 35 | ✅ 95% | 85% |
| Infrastructure | 30 | ✅ 98% | 30% |
| Presentation | 150+ | ⚠️ 95% | 8% |
| **Planning Components** | 38 | ✅ | **57 Tests** |

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
3. ~~**Planning Component Tests**~~ ✅ ERLEDIGT (57 Tests)
4. **Resize-Feature** – Allocation-Dauer per Drag ändern (Sicherheitsnetz vorhanden)
5. **Repository & Server Action Tests** – Test-Coverage weiter erhöhen
6. **Ressourcen-Verwaltung UI** – `/einstellungen/ressourcen`

---

## Letzte Session

**Datum:** 2026-02-01 (Planning Component Tests)

### Erledigte Aufgaben:
- ✅ **Planning Component Tests** als Sicherheitsnetz für Resize-Feature
- ✅ **57 neue Tests** für kritische DnD-Komponenten
- ✅ Alle Tests grün, TypeScript fehlerfrei

### Neue Test-Dateien:
| Datei | Tests | Beschreibung |
|-------|-------|--------------|
| `__tests__/dnd-types.test.ts` | 23 | Helper Functions & Type Guards |
| `__tests__/SpanningAssignmentCard.test.tsx` | 15 | Multi-Tag Allocation Cards |
| `__tests__/AssignmentCard.test.tsx` | 19 | Single-Tag Allocation Cards |

### Getestete Funktionalität:
**DnD Types:**
- `createDropZoneId()` – Drop-Zone ID Erstellung
- `createPhaseDropZoneId()` – Phase Drop-Zone ID
- `parseDropZoneId()` – ID Parsing (user, resource, phase, pool)
- Type Guards für alle Drag-Data Types

**SpanningAssignmentCard:**
- Span-Labels (Mo-Fr, X Tage)
- User vs Resource Styling
- Drag-Data Korrektheit

**AssignmentCard:**
- Name-Formatierung (M.Bauer)
- Absence-Konflikt Anzeige
- Compact-Mode
- Drag-Data Korrektheit

### Guard-Ergebnisse:
- ESLint: ⚠️ 7 Warnings (bekannte Server-Logs)
- TypeScript: ✅ **Keine Fehler**
- Vitest: ✅ **672 Tests grün** (+57 neue)

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
