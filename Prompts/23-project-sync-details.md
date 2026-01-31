# Prompt 23: Project Sync Details

**Phase:** 5 – Integrationen
**Komplexität:** S (Small)
**Geschätzte Zeit:** 2 Stunden

---

## Kontext

Asana Integration ist implementiert. Jetzt verfeinern wir den Projekt-Sync mit manueller Zuordnung und Status-Handling.

**Bereits vorhanden:**
- SyncAsanaProjectsUseCase
- Project Entity
- ProjectPhase Entity

---

## Ziel

Implementiere manuelle Projekt-Auswahl, Custom Field Mapping UI und Projekt-Status-Handling.

---

## Referenz-Dokumentation

- `FEATURES.md` – F7.2 (Projekt-Import), F7.3 (Custom Fields)
- **UI-Screens:**
  - `stitch_planned./settings_-_integration_settings/settings_-_integration_settings.png`

---

## Akzeptanzkriterien

```gherkin
Feature: Project Sync Details

Scenario: Projekte zur Synchronisation auswählen
  Given Asana ist verbunden
  When ich die Projekt-Liste lade
  Then sehe ich alle Asana-Projekte
  And kann per Checkbox auswählen welche synchronisiert werden
  And nur ausgewählte Projekte erscheinen in der App

Scenario: Custom Field Mapping konfigurieren
  Given Asana ist verbunden
  When ich zu Einstellungen > Integrationen gehe
  Then kann ich zuordnen:
    | Asana Custom Field | Planned Feld    |
    | [Dropdown]         | Projektnummer   |
    | [Dropdown]         | SOLL Produktion |
    | [Dropdown]         | SOLL Montage    |

Scenario: Projekt-Status ändern
  Given ein Projekt ist synchronisiert
  When es in Asana archiviert wird
  Then wird es in Planned als "archiviert" markiert
  But Allocations bleiben erhalten

Scenario: Projekt manuell de-synchronisieren
  Given ein Projekt ist synchronisiert
  When ich auf "Nicht mehr synchronisieren" klicke
  Then wird die Asana-Verknüpfung entfernt
  And das Projekt bleibt in Planned (ohne Sync)

Scenario: Neue Sections werden Phasen
  Given ein Projekt ist synchronisiert
  When in Asana eine neue Section erstellt wird
  Then wird sie beim nächsten Sync als Phase importiert
  And erhält automatisch den Bereich basierend auf dem Namen
```

---

## Implementierungsschritte

### 🟢 GREEN: Projekt-Auswahl UI

```typescript
// src/presentation/components/settings/AsanaProjectSelector.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/presentation/components/ui/checkbox';
import { Button } from '@/presentation/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  getAsanaProjects,
  setProjectSyncStatus,
  syncSelectedProjects,
} from '@/presentation/actions/integrations';
import { toast } from 'sonner';

export function AsanaProjectSelector() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['asana', 'projects'],
    queryFn: getAsanaProjects,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncSelectedProjects(Array.from(selectedIds)),
    onSuccess: (result) => {
      toast.success(`${result.data?.created} Projekte importiert`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const toggleProject = (projectId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(projects?.data?.map((p) => p.gid) || []));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Projekte synchronisieren</h3>
          <p className="text-sm text-gray-500">
            Wählen Sie die Projekte aus, die in Planned erscheinen sollen.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      <div className="flex gap-2 text-xs">
        <button onClick={selectAll} className="text-accent hover:underline">
          Alle auswählen
        </button>
        <span className="text-gray-300">|</span>
        <button onClick={selectNone} className="text-gray-500 hover:underline">
          Keine auswählen
        </button>
      </div>

      <div className="border rounded-md divide-y max-h-80 overflow-auto">
        {projects?.data?.map((project) => (
          <label
            key={project.gid}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
          >
            <Checkbox
              checked={selectedIds.has(project.gid)}
              onCheckedChange={() => toggleProject(project.gid)}
            />
            <div>
              <div className="font-medium text-sm">{project.name}</div>
              {project.archived && (
                <span className="text-xs text-gray-500">(archiviert)</span>
              )}
            </div>
          </label>
        ))}
      </div>

      <Button
        onClick={() => syncMutation.mutate()}
        disabled={selectedIds.size === 0 || syncMutation.isPending}
      >
        {syncMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Synchronisiere...
          </>
        ) : (
          `${selectedIds.size} Projekte synchronisieren`
        )}
      </Button>
    </div>
  );
}
```

### 🟢 GREEN: Custom Field Mapping UI

```typescript
// src/presentation/components/settings/AsanaFieldMapping.tsx
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { Label } from '@/presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';
import {
  getAsanaCustomFields,
  getFieldMapping,
  saveFieldMapping,
} from '@/presentation/actions/integrations';
import { toast } from 'sonner';

const MAPPING_FIELDS = [
  { key: 'projectNumberFieldId', label: 'Projektnummer' },
  { key: 'sollProduktionFieldId', label: 'SOLL Produktion (Stunden)' },
  { key: 'sollMontageFieldId', label: 'SOLL Montage (Stunden)' },
];

export function AsanaFieldMapping() {
  const { data: customFields, isLoading } = useQuery({
    queryKey: ['asana', 'customFields'],
    queryFn: getAsanaCustomFields,
  });

  const { data: currentMapping } = useQuery({
    queryKey: ['asana', 'fieldMapping'],
    queryFn: getFieldMapping,
  });

  const saveMutation = useMutation({
    mutationFn: saveFieldMapping,
    onSuccess: () => toast.success('Zuordnung gespeichert'),
  });

  const handleChange = (key: string, value: string) => {
    saveMutation.mutate({
      ...currentMapping?.data,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Custom Field Zuordnung</h3>
        <p className="text-sm text-gray-500">
          Ordnen Sie Asana Custom Fields den Planned-Feldern zu.
        </p>
      </div>

      <div className="space-y-4">
        {MAPPING_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
            <Label>{field.label}</Label>
            <Select
              value={currentMapping?.data?.[field.key] || ''}
              onValueChange={(value) => handleChange(field.key, value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Feld auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nicht zugeordnet</SelectItem>
                {customFields?.data?.map((cf) => (
                  <SelectItem key={cf.gid} value={cf.gid}>
                    {cf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 🟢 GREEN: Projekt De-Synchronisieren

```typescript
// src/application/use-cases/integrations/UnlinkProjectUseCase.ts
export class UnlinkProjectUseCase {
  constructor(private projectRepository: IProjectRepository) {}

  async execute(projectId: string): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Asana-Verknüpfung entfernen, Projekt bleibt
    await this.projectRepository.update(projectId, {
      asanaId: null,
    });
  }
}
```

---

## Erwartete Dateien

```
src/
├── application/
│   └── use-cases/
│       └── integrations/
│           ├── SelectProjectsToSyncUseCase.ts
│           └── UnlinkProjectUseCase.ts
└── presentation/
    ├── actions/
    │   └── integrations.ts  # Erweitert
    └── components/
        └── settings/
            ├── AsanaProjectSelector.tsx
            └── AsanaFieldMapping.tsx
```

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Projekt-Auswahl funktioniert
- [ ] Custom Field Mapping ist konfigurierbar
- [ ] Archivierte Projekte werden markiert
- [ ] De-Synchronisieren entfernt nur Verknüpfung
- [ ] Neue Sections werden als Phasen importiert

---

*Vorheriger Prompt: 22 – Absence Sync Details*
*Nächster Prompt: 24 – Time Entry Sync Details*
