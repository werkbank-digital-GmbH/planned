# planned. - Prompt Index

**Version:** 2.0 (Korrigiert)
**Stand:** Januar 2026

---

## Übersicht

Diese Prompt-Sequenz implementiert "planned." – eine Kapazitäts- und Einsatzplanungs-App für Holzbauunternehmen. Die Prompts wurden auf Basis einer umfassenden Review gegen die Projektdokumentation erstellt und beheben alle identifizierten kritischen Probleme.

---

## Behobene Kritische Probleme

| # | Problem | Lösung | Prompt |
|---|---------|--------|--------|
| 1 | Range-Select fehlte | Neuer Prompt 19a für Multi-Cell-Selection | 19a |
| 2 | Undo/Redo fehlte | Prompt 19 mit vollständigem Undo-System | 19 |
| 3 | "VOR ORT" vs "MONTAGE" Inkonsistenz | Korrigiert zu "produktion"/"montage" | 08, 09 |
| 4 | TimeEntry Entity fehlte | Neuer Prompt 11a für TimeEntry | 11a |
| 5 | Realtime Subscriptions fehlten | Neuer Prompt 14a für Supabase Realtime | 14a |

---

## Phase 1: Projekt-Setup & Infrastruktur

| Prompt | Titel | Komplexität | Zeit |
|--------|-------|-------------|------|
| [01](./01-nextjs-projekt-initialisierung.md) | Next.js Projekt-Initialisierung | M | 2-3h |
| [02](./02-supabase-integration.md) | Supabase Integration | L | 3-4h |
| [03](./03-clean-architecture-grundstruktur.md) | Clean Architecture Grundstruktur | M | 2-3h |

**Meilenstein:** Projekt-Basis mit TypeScript, Supabase und Clean Architecture

---

## Phase 2: Authentifizierung & Multi-Tenancy

| Prompt | Titel | Komplexität | Zeit |
|--------|-------|-------------|------|
| [04](./04-supabase-auth-integration.md) | Supabase Auth Integration | L | 4-5h |
| [05](./05-multi-tenancy-rls.md) | Multi-Tenancy & RLS | M | 2-3h |
| [06](./06-user-management.md) | User Management | M | 3-4h |

**Meilenstein:** Vollständige Authentifizierung mit Multi-Tenant-Isolation

---

## Phase 3: Kern-Domain & Use Cases

| Prompt | Titel | Komplexität | Zeit |
|--------|-------|-------------|------|
| [07](./07-project-entity.md) | Project Entity & Repository | M | 2-3h |
| [08](./08-projectphase-entity.md) | ProjectPhase Entity | M | 2-3h |
| [09](./09-allocation-entity.md) | Allocation Entity & Validation | L | 4-5h |
| [10](./10-resource-entities.md) | Resource & ResourceType Entities | M | 2-3h |
| [11](./11-absence-entity.md) | Absence Entity & Conflict Check | M | 2-3h |
| [11a](./11a-timeentry-entity.md) | **TimeEntry Entity** ⭐ | S | 1-2h |
| [12](./12-create-allocation-usecase.md) | CreateAllocation Use Case | L | 4-5h |
| [13](./13-move-delete-allocation.md) | MoveAllocation & DeleteAllocation | M | 2-3h |
| [14](./14-get-allocations-query.md) | GetAllocationsForWeek Query | M | 2-3h |
| [14a](./14a-realtime-subscriptions.md) | **Supabase Realtime Subscriptions** ⭐ | M | 2-3h |

**Meilenstein:** Vollständige Domain-Logik mit Realtime-Support

⭐ = Neue Prompts zur Behebung kritischer Probleme

---

## Phase 4: UI & Drag-and-Drop

| Prompt | Titel | Komplexität | Zeit |
|--------|-------|-------------|------|
| [15](./15-planungsansicht-ui.md) | Planungsansicht UI | L | 5-6h |
| [16](./16-drag-and-drop-basic.md) | Drag & Drop Basic | L | 5-6h |
| [17](./17-copy-paste-shortcuts.md) | Copy/Paste & Keyboard Shortcuts | M | 3-4h |
| [18](./18-quick-add-dialog.md) | Quick-Add Dialog | M | 2-3h |
| [19](./19-undo-redo-system.md) | **Undo/Redo System** ⭐ | L | 4-5h |
| [19a](./19a-range-select.md) | **Range-Select Multi-Allocation** ⭐ | M | 3-4h |

**Meilenstein:** Vollständige Planungs-UI mit DnD, Shortcuts und Range-Select

⭐ = Neue Prompts zur Behebung kritischer Probleme

---

## Phase 5: Integrationen

| Prompt | Titel | Komplexität | Zeit |
|--------|-------|-------------|------|
| [20](./20-asana-integration.md) | Asana Integration | L | 5-6h |
| [21](./21-timetac-integration.md) | TimeTac Integration | L | 5-6h |
| [22](./22-absence-sync-details.md) | Absence Sync Details | S | 2h |
| [23](./23-project-sync-details.md) | Project Sync Details | S | 2h |
| [24](./24-time-entry-sync-details.md) | Time Entry Sync Details | S | 2h |

**Meilenstein:** Vollständige Integration mit Asana und TimeTac

---

## Phase 6: Dashboard, Mobile & Finishing

| Prompt | Titel | Komplexität | Zeit |
|--------|-------|-------------|------|
| [25](./25-dashboard-kpis.md) | Dashboard & KPIs | M | 3-4h |
| [26](./26-mobile-meine-woche.md) | Mobile "Meine Woche" View | M | 3-4h |
| [27](./27-settings-profile.md) | Settings & Profile | M | 3-4h |
| [28](./28-testing-polish.md) | Testing & Polish | L | 5-6h |

**Meilenstein:** Produktionsreife Anwendung

---

## Prompt-Statistik

| Metrik | Wert |
|--------|------|
| Gesamtanzahl Prompts | 31 |
| Neue Fix-Prompts | 3 (11a, 14a, 19a) |
| Neu dokumentiert | 1 (19 - Undo/Redo) |
| Geschätzte Gesamtzeit | ~95-120h |
| Komplexität S | 4 |
| Komplexität M | 17 |
| Komplexität L | 10 |

---

## Referenz-Dokumentation

Diese Prompts basieren auf folgenden Dokumenten:

- `FEATURES.md` – Alle Features mit Akzeptanzkriterien
- `DATA_MODEL.md` – Datenbank-Schema
- `API_SPEC.md` – API-Spezifikation und Error Codes
- `DEPENDENCIES.md` – Technologie-Stack
- `FOLDER_STRUCTURE.md` – Projektstruktur
- `Rules.md` – Entwicklungsregeln
- `UI_COMPONENTS.md` – UI-Komponenten-Spezifikation
- `stitch_planned./` – UI-Screenshots

---

## Abhängigkeitsdiagramm

```
Phase 1: Setup
    01 ─┬─► 02 ─► 03
        │
Phase 2: Auth
        └─► 04 ─► 05 ─► 06
                        │
Phase 3: Domain         │
        ┌───────────────┘
        │
        ▼
    07 ─► 08 ─► 09 ─► 10 ─► 11 ─► 11a
                │
                ▼
            12 ─► 13 ─► 14 ─► 14a
                            │
Phase 4: UI                 │
        ┌───────────────────┘
        │
        ▼
    15 ─► 16 ─► 17 ─► 18 ─► 19 ─► 19a
                                    │
Phase 5: Integrationen             │
        ┌──────────────────────────┘
        │
        ▼
    20 ─► 21 ─► 22 ─► 23 ─► 24
                            │
Phase 6: Finishing          │
        ┌───────────────────┘
        │
        ▼
    25 ─► 26 ─► 27 ─► 28 ─► 🎉
```

---

## Wichtige Konventionen

### Terminologie
- **Bereich:** `produktion` oder `montage` (NICHT "vor ort")
- **User Roles:** `admin`, `planer`, `gewerblich`
- **Allocation:** Immer entweder `userId` ODER `resourceId` (XOR)

### TDD-Zyklus
Jeder Prompt folgt dem Red-Green-Refactor Zyklus:
1. 🔴 RED: Test schreiben (der fehlschlägt)
2. 🟢 GREEN: Minimale Implementierung
3. 🔵 REFACTOR: Code verbessern

### Error Handling
- Domain Errors für Geschäftslogik
- ActionResult Pattern für Server Actions
- Toast-Nachrichten für User-Feedback

---

## Nutzungshinweise

1. **Sequentiell arbeiten:** Prompts bauen aufeinander auf
2. **Tests zuerst:** TDD-Zyklus einhalten
3. **UI-Screens beachten:** Screenshots in `stitch_planned./`
4. **Dokumentation aktuell halten:** Bei Änderungen anpassen
5. **Validierung am Ende jedes Prompts:** Checkliste abarbeiten

---

*Erstellt nach Review von ANTIGRAVITY_PROMPT_SEQUENCE.md gegen Projektdokumentation*
