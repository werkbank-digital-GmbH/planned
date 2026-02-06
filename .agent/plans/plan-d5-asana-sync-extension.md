# Plan D5: Asana-Sync Erweiterung

## Ziel
Task-Beschreibungen und Projektadressen aus Asana syncen, um besseren Kontext für Insights zu haben.

## Kontext (aktueller Code-Stand)
- `AsanaService.ts`: `getTasksFromProject()` holt bereits Tasks mit `opt_fields`
- `SyncAsanaTaskPhasesUseCase.ts`: Verarbeitet Tasks und erstellt Phasen
- `AsanaFieldMapping.tsx`: UI für Custom Field Mapping existiert
- `integration_credentials`: Speichert Field-IDs für Mapping

---

## Prompt D5-1: DB-Migration + Repository-Anpassungen

```
Erweitere die Datenbank und Repositories um Task-Beschreibung und Projektadresse.

### 1. Migration erstellen: `supabase/migrations/[timestamp]_add_description_and_address.sql`

```sql
-- Task-Beschreibung in Phasen
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS description TEXT;

-- Projektadresse
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_conflict BOOLEAN DEFAULT FALSE;

-- Custom Field ID für Adresse (pro Tenant)
ALTER TABLE integration_credentials
ADD COLUMN IF NOT EXISTS asana_address_field_id TEXT;
```

### 2. Entity `ProjectPhase` erweitern

In `src/domain/entities/ProjectPhase.ts`:
- Füge `description?: string` Property hinzu
- Aktualisiere `create()` Factory-Methode

### 3. Entity `Project` erweitern

In `src/domain/entities/Project.ts`:
- Füge `address?: string` Property hinzu
- Füge `addressConflict?: boolean` Property hinzu
- Aktualisiere `create()` Factory-Methode

### 4. Repository-Mapper aktualisieren

In `SupabaseProjectPhaseRepository.ts`:
- `mapToEntity`: description aus DB mappen
- `mapToDatabase`: description in DB speichern

In `SupabaseProjectRepository.ts`:
- `mapToEntity`: address, address_conflict mappen
- `mapToDatabase`: address, address_conflict speichern

### 5. IntegrationCredentials erweitern

In `src/infrastructure/repositories/SupabaseIntegrationCredentialsRepository.ts`:
- `asanaAddressFieldId` zum Interface und Mapping hinzufügen

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Prompt D5-2: AsanaService + SyncUseCase Erweiterung

```
Erweitere den Asana-Sync um Task-Beschreibungen und Projekt-Adressen.

### 1. AsanaService erweitern

In `src/infrastructure/services/AsanaService.ts`:

1. `getTasksFromProject()` um `notes` und `html_notes` erweitern:
```typescript
const params = new URLSearchParams({
  opt_fields: [
    // ... existierende Felder
    'notes',        // NEU: Plain-Text Beschreibung
    'html_notes',   // NEU: Rich-Text Beschreibung (HTML)
  ].join(','),
});
```

2. `AsanaTask` Interface erweitern (in `IAsanaService.ts`):
```typescript
export interface AsanaTask {
  // ... existierende Felder
  notes?: string;
  html_notes?: string;
}
```

3. `MappedTaskPhaseData` erweitern:
```typescript
export interface MappedTaskPhaseData {
  // ... existierende Felder
  description?: string;  // NEU
  projectAddress?: string;  // NEU (aus Custom Field)
}
```

4. `mapTaskToPhase()` erweitern:
- `description`: aus `task.html_notes` oder `task.notes` (Fallback)
- `projectAddress`: aus Custom Field extrahieren (wenn `asanaAddressFieldId` konfiguriert)

5. `AsanaTaskSyncConfig` erweitern (in `IAsanaService.ts`):
```typescript
export interface AsanaTaskSyncConfig {
  // ... existierende Felder
  addressFieldId?: string;  // NEU
}
```

### 2. SyncAsanaTaskPhasesUseCase erweitern

In `src/application/use-cases/integrations/SyncAsanaTaskPhasesUseCase.ts`:

1. `getSyncConfig()` erweitern:
```typescript
return {
  // ... existierende Felder
  addressFieldId: credentials.asanaAddressFieldId ?? undefined,
};
```

2. Phase-Data erweitern im Map-Eintrag:
```typescript
projectPhaseMap.get(mappedPhase.projectAsanaGid)!.phases.push({
  // ... existierende Felder
  description: mappedPhase.description,
  projectAddress: mappedPhase.projectAddress,
});
```

3. Projekt-Adress-Validierung:
- Sammle alle Adressen der Phasen eines Projekts
- Wenn alle gleich → `project.address = address`
- Wenn unterschiedlich → `project.addressConflict = true`

4. Phase speichern mit description:
```typescript
const phase = ProjectPhase.create({
  // ... existierende Felder
  description: phaseData.description,
});
```

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Prompt D5-3: UI für Custom Field Mapping + Adress-Anzeige

```
Erweitere die UI um Adress-Feld-Mapping und zeige Beschreibungen/Adressen an.

### 1. AsanaFieldMapping erweitern

In `src/presentation/components/settings/AsanaFieldMapping.tsx`:

1. Neues Feld in `MAPPING_FIELDS` hinzufügen:
```typescript
const MAPPING_FIELDS = [
  // ... existierende Felder
  {
    key: 'addressFieldId',
    label: 'Projektadresse',
    description: 'Text-Feld mit der Baustellenadresse',
  },
];
```

2. `FieldMappingDTO` erweitern in `integrations.ts`:
```typescript
export interface FieldMappingDTO {
  // ... existierende Felder
  addressFieldId?: string;
}
```

3. `getFieldMapping()` und `saveFieldMapping()` Actions anpassen

### 2. Source-Config erweitern

In `integrations.ts`:
- `AsanaSourceConfigDTO` um `addressFieldId` erweitern
- `getAsanaSourceConfig()` und `saveAsanaSourceConfig()` anpassen

### 3. Beschreibung in Phase-Details anzeigen

In `src/presentation/components/project-details/ProjectInsightsSection.tsx`:

Nach den Phase-Insights, zeige die Beschreibung:
```tsx
{phase.description && (
  <div className="mt-3 p-3 bg-muted rounded-md">
    <p className="text-xs text-muted-foreground mb-1">Asana-Beschreibung</p>
    <div
      className="text-sm prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: phase.description }}
    />
  </div>
)}
```

### 4. Projekt-Adresse anzeigen

Im `ProjectDetailModal.tsx`:

```tsx
{/* Adresse */}
{project.address && !project.addressConflict && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <MapPin className="h-4 w-4" />
    <span>{project.address}</span>
  </div>
)}

{/* Adress-Konflikt Warning */}
{project.addressConflict && (
  <Alert variant="warning" className="mt-2">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Unterschiedliche Adressen</AlertTitle>
    <AlertDescription>
      Die Aufgaben in Asana haben unterschiedliche Adressen.
      Bitte in Asana vereinheitlichen.
    </AlertDescription>
  </Alert>
)}
```

### 5. Server Action für Phase-Details erweitern

In `insights.ts` → `getProjectInsightsAction()`:
- `description` mit laden und zurückgeben

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Abhängigkeiten
- Keine (D5 ist eigenständig)

## Schätzung
~3 Prompts, mittlerer Aufwand

---

*Aktualisiert: 2026-02-03, Session 13*
