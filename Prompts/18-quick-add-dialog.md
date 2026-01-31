# Prompt 18: Quick-Add Dialog

**Phase:** 4 – UI & Drag-and-Drop
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

Keyboard Shortcuts sind implementiert. Jetzt bauen wir den Quick-Add Dialog für schnelles Erstellen von Allocations.

**Bereits vorhanden:**
- CreateAllocationUseCase
- Keyboard Shortcut "N" zum Öffnen
- Selection Context

---

## Ziel

Implementiere einen Dialog zum schnellen Erstellen von Allocations mit Projekt-Suche und Datum-Auswahl.

---

## Referenz-Dokumentation

- `FEATURES.md` – F3.9 (Quick-Add)
- **UI-Screens:**
  - `stitch_planned./allocation_-_edit_dialog/allocation_-_edit_dialog.png`
  - `stitch_planned./dialog_-_quick_add_resource/dialog_-_quick_add_resource.png`

---

## Akzeptanzkriterien

```gherkin
Feature: Quick-Add Dialog

Scenario: Dialog per Keyboard öffnen
  Given ich bin in der Planungsansicht
  When ich "N" drücke
  Then öffnet sich der Quick-Add Dialog
  And der Fokus liegt auf dem Projekt-Suchfeld

Scenario: Dialog per Klick öffnen
  Given ich sehe eine leere Zelle
  When ich auf das "+" Icon klicke
  Then öffnet sich der Quick-Add Dialog
  And User/Ressource und Datum sind vorausgefüllt

Scenario: Projekt suchen
  Given der Dialog ist offen
  When ich "Schul" tippe
  Then sehe ich Projekte die "Schul" enthalten
  And die Suche ist fuzzy (findet auch "Schulhaus")

Scenario: Phase auswählen
  Given ich habe ein Projekt ausgewählt
  Then sehe ich alle Phasen des Projekts
  And sie sind nach Bereich gruppiert (Produktion/Montage)

Scenario: Allocation erstellen
  Given ich habe alle Felder ausgefüllt
  When ich auf "Erstellen" klicke
  Then wird die Allocation erstellt
  And der Dialog schließt sich
  And die neue Allocation erscheint im Grid

Scenario: Mehrere Tage auf einmal
  Given ich fülle den Dialog aus
  When ich mehrere Tage auswähle (Checkbox)
  Then werden Allocations für alle gewählten Tage erstellt

Scenario: Notiz hinzufügen
  Given ich erstelle eine Allocation
  When ich eine Notiz eingebe
  Then wird die Notiz gespeichert
  And ist auf der Allocation-Card sichtbar

Scenario: Formular-Validierung
  Given ich versuche ohne Projekt zu erstellen
  Then sehe ich "Bitte wählen Sie ein Projekt"
  And der Button bleibt deaktiviert

Scenario: Dialog mit Enter bestätigen
  Given alle Pflichtfelder sind ausgefüllt
  When ich Enter drücke
  Then wird die Allocation erstellt
```

---

## Technische Anforderungen

### Dialog Props

```typescript
interface QuickAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: {
    userId?: string;
    resourceId?: string;
    date?: Date;
    projectPhaseId?: string;
  };
}
```

### Form Schema

```typescript
const quickAddSchema = z.object({
  projectId: z.string().uuid('Bitte wählen Sie ein Projekt'),
  projectPhaseId: z.string().uuid('Bitte wählen Sie eine Phase'),
  userId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  dates: z.array(z.date()).min(1, 'Mindestens ein Datum auswählen'),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.userId || data.resourceId,
  'Mitarbeiter oder Ressource erforderlich'
);
```

---

## Implementierungsschritte

### 🔴 RED: Test für Quick-Add Dialog

```typescript
// src/presentation/components/planning/__tests__/QuickAddDialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAddDialog } from '../QuickAddDialog';

describe('QuickAddDialog', () => {
  it('should focus project search on open', async () => {
    render(<QuickAddDialog isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Projekt suchen...')).toHaveFocus();
    });
  });

  it('should show validation error without project', async () => {
    const user = userEvent.setup();
    render(<QuickAddDialog isOpen={true} onClose={vi.fn()} />);

    await user.click(screen.getByText('Erstellen'));

    expect(screen.getByText('Bitte wählen Sie ein Projekt')).toBeVisible();
  });

  it('should create allocation with valid data', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<QuickAddDialog isOpen={true} onClose={onClose} />);

    // Projekt suchen und auswählen
    await user.type(screen.getByPlaceholderText('Projekt suchen...'), 'Schulhaus');
    await user.click(await screen.findByText('Schulhaus Muster'));

    // Phase auswählen
    await user.click(screen.getByText('Elementierung'));

    // Erstellen
    await user.click(screen.getByText('Erstellen'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
```

### 🟢 GREEN: QuickAddDialog Component

```typescript
// src/presentation/components/planning/QuickAddDialog.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Textarea } from '@/presentation/components/ui/textarea';
import { Label } from '@/presentation/components/ui/label';
import { ProjectSearch } from './ProjectSearch';
import { PhaseSelector } from './PhaseSelector';
import { DateMultiSelect } from './DateMultiSelect';
import { UserResourceSelector } from './UserResourceSelector';
import { createAllocation } from '@/presentation/actions/allocations';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { toast } from 'sonner';

const quickAddSchema = z.object({
  projectId: z.string().min(1, 'Bitte wählen Sie ein Projekt'),
  projectPhaseId: z.string().min(1, 'Bitte wählen Sie eine Phase'),
  userId: z.string().optional(),
  resourceId: z.string().optional(),
  dates: z.array(z.date()).min(1, 'Mindestens ein Datum auswählen'),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.userId || data.resourceId,
  {
    message: 'Mitarbeiter oder Ressource erforderlich',
    path: ['userId'],
  }
);

type QuickAddFormData = z.infer<typeof quickAddSchema>;

interface QuickAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Partial<QuickAddFormData>;
}

export function QuickAddDialog({ isOpen, onClose, defaultValues }: QuickAddDialogProps) {
  const { refreshWeekData, weekStart } = usePlanning();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      dates: defaultValues?.dates || [new Date()],
      userId: defaultValues?.userId,
      resourceId: defaultValues?.resourceId,
      projectPhaseId: defaultValues?.projectPhaseId,
      ...defaultValues,
    },
  });

  const selectedProjectId = watch('projectId');
  const selectedUserId = watch('userId');
  const selectedResourceId = watch('resourceId');

  // Fokus auf Suchfeld wenn Dialog öffnet
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset wenn Dialog schließt
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: QuickAddFormData) => {
    setIsSubmitting(true);

    try {
      // Für jeden ausgewählten Tag eine Allocation erstellen
      const results = await Promise.all(
        data.dates.map((date) =>
          createAllocation({
            projectPhaseId: data.projectPhaseId,
            userId: data.userId,
            resourceId: data.resourceId,
            date,
            notes: data.notes,
          })
        )
      );

      const failedCount = results.filter((r) => !r.success).length;

      if (failedCount > 0) {
        toast.error(`${failedCount} von ${data.dates.length} Allocations konnten nicht erstellt werden`);
      } else {
        toast.success(
          data.dates.length > 1
            ? `${data.dates.length} Allocations erstellt`
            : 'Allocation erstellt'
        );
      }

      await refreshWeekData();
      onClose();
    } catch (error) {
      toast.error('Fehler beim Erstellen der Allocation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Allocation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Projekt Suche */}
          <div className="space-y-2">
            <Label>Projekt *</Label>
            <ProjectSearch
              ref={searchInputRef}
              onSelect={(project) => {
                setValue('projectId', project.id);
                setValue('projectPhaseId', ''); // Reset Phase
              }}
              error={errors.projectId?.message}
            />
          </div>

          {/* Phase Auswahl */}
          {selectedProjectId && (
            <div className="space-y-2">
              <Label>Phase *</Label>
              <PhaseSelector
                projectId={selectedProjectId}
                value={watch('projectPhaseId')}
                onChange={(phaseId) => setValue('projectPhaseId', phaseId)}
                error={errors.projectPhaseId?.message}
              />
            </div>
          )}

          {/* User/Ressource Auswahl */}
          <div className="space-y-2">
            <Label>Mitarbeiter/Ressource *</Label>
            <UserResourceSelector
              userId={selectedUserId}
              resourceId={selectedResourceId}
              onUserSelect={(id) => {
                setValue('userId', id);
                setValue('resourceId', undefined);
              }}
              onResourceSelect={(id) => {
                setValue('resourceId', id);
                setValue('userId', undefined);
              }}
              error={errors.userId?.message}
            />
          </div>

          {/* Datum Auswahl */}
          <div className="space-y-2">
            <Label>Datum *</Label>
            <DateMultiSelect
              weekStart={weekStart}
              value={watch('dates')}
              onChange={(dates) => setValue('dates', dates)}
              error={errors.dates?.message}
            />
          </div>

          {/* Notiz */}
          <div className="space-y-2">
            <Label>Notiz (optional)</Label>
            <Textarea
              {...register('notes')}
              placeholder="Optionale Notiz..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Wird erstellt...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 🟢 GREEN: ProjectSearch Component

```typescript
// src/presentation/components/planning/ProjectSearch.tsx
'use client';

import { useState, forwardRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Check } from 'lucide-react';
import { Input } from '@/presentation/components/ui/input';
import { getProjects } from '@/presentation/actions/projects';
import { cn } from '@/lib/utils';

interface ProjectSearchProps {
  onSelect: (project: ProjectSummary) => void;
  error?: string;
}

export const ProjectSearch = forwardRef<HTMLInputElement, ProjectSearchProps>(
  ({ onSelect, error }, ref) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);

    const { data: projects, isLoading } = useQuery({
      queryKey: ['projects', 'search', query],
      queryFn: () => getProjects({ search: query }),
      enabled: query.length >= 2,
    });

    const handleSelect = (project: ProjectSummary) => {
      setSelectedProject(project);
      setQuery(project.name);
      setIsOpen(false);
      onSelect(project);
    };

    return (
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={ref}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedProject(null);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Projekt suchen..."
            className={cn(
              'pl-10',
              error && 'border-error',
              selectedProject && 'border-success'
            )}
          />
          {selectedProject && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
          )}
        </div>

        {error && <p className="text-sm text-error mt-1">{error}</p>}

        {/* Dropdown */}
        {isOpen && query.length >= 2 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-3 text-sm text-gray-500">Suche...</div>
            ) : projects?.data?.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Keine Projekte gefunden</div>
            ) : (
              projects?.data?.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className="font-mono text-xs text-gray-500">
                    {project.projectNumber}
                  </span>
                  <span className="text-sm">{project.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }
);

ProjectSearch.displayName = 'ProjectSearch';
```

### 🟢 GREEN: PhaseSelector Component

```typescript
// src/presentation/components/planning/PhaseSelector.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { getProjectPhases } from '@/presentation/actions/projects';
import { cn } from '@/lib/utils';

interface PhaseSelectorProps {
  projectId: string;
  value?: string;
  onChange: (phaseId: string) => void;
  error?: string;
}

const BEREICH_LABELS = {
  produktion: 'Produktion',
  montage: 'Montage',
};

const BEREICH_COLORS = {
  produktion: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
  montage: 'border-green-300 bg-green-50 hover:bg-green-100',
};

export function PhaseSelector({ projectId, value, onChange, error }: PhaseSelectorProps) {
  const { data: phases, isLoading } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: () => getProjectPhases(projectId),
    enabled: !!projectId,
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Lade Phasen...</div>;
  }

  // Gruppieren nach Bereich
  const grouped = {
    produktion: phases?.data?.filter((p) => p.bereich === 'produktion') || [],
    montage: phases?.data?.filter((p) => p.bereich === 'montage') || [],
  };

  return (
    <div className="space-y-3">
      {(['produktion', 'montage'] as const).map((bereich) => (
        <div key={bereich}>
          <div className="text-xs font-medium text-gray-500 mb-1">
            {BEREICH_LABELS[bereich]}
          </div>
          <div className="flex flex-wrap gap-2">
            {grouped[bereich].map((phase) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => onChange(phase.id)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md border transition-colors',
                  BEREICH_COLORS[bereich],
                  value === phase.id && 'ring-2 ring-accent'
                )}
              >
                {phase.name}
              </button>
            ))}
            {grouped[bereich].length === 0 && (
              <span className="text-xs text-gray-400">Keine Phasen</span>
            )}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
```

### 🟢 GREEN: DateMultiSelect Component

```typescript
// src/presentation/components/planning/DateMultiSelect.tsx
'use client';

import { format, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateMultiSelectProps {
  weekStart: Date;
  value: Date[];
  onChange: (dates: Date[]) => void;
  error?: string;
}

export function DateMultiSelect({ weekStart, value, onChange, error }: DateMultiSelectProps) {
  // 5 Werktage der aktuellen Woche
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const toggleDate = (date: Date) => {
    const isSelected = value.some((d) => isSameDay(d, date));

    if (isSelected) {
      onChange(value.filter((d) => !isSameDay(d, date)));
    } else {
      onChange([...value, date]);
    }
  };

  const selectAll = () => {
    onChange(weekDays);
  };

  const selectNone = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {weekDays.map((date) => {
          const isSelected = value.some((d) => isSameDay(d, date));

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => toggleDate(date)}
              className={cn(
                'flex-1 py-2 px-3 rounded-md border text-center transition-colors',
                isSelected
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              )}
            >
              <div className="text-xs font-medium">
                {format(date, 'EEE', { locale: de })}
              </div>
              <div className="text-sm">
                {format(date, 'dd.MM.')}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={selectAll}
          className="text-accent hover:underline"
        >
          Alle auswählen
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={selectNone}
          className="text-gray-500 hover:underline"
        >
          Keine auswählen
        </button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── presentation/
│   └── components/
│       └── planning/
│           ├── QuickAddDialog.tsx
│           ├── ProjectSearch.tsx
│           ├── PhaseSelector.tsx
│           ├── DateMultiSelect.tsx
│           ├── UserResourceSelector.tsx
│           └── __tests__/
│               └── QuickAddDialog.test.tsx
```

---

## Hinweise

- Dialog öffnet sich mit "N" oder Klick auf "+" in leerer Zelle
- Fokus automatisch auf Projekt-Suche
- Fuzzy Search für Projekte
- Phasen gruppiert nach Bereich (Produktion/Montage)
- Mehrere Tage auf einmal auswählbar
- Enter zum Bestätigen
- ESC zum Schließen
- UI exakt nach PNG-Screenshot

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Dialog öffnet sich per Shortcut
- [ ] Projekt-Suche funktioniert
- [ ] Phasen werden korrekt angezeigt
- [ ] Mehrfachauswahl für Tage funktioniert
- [ ] Validierung zeigt Fehler
- [ ] Allocation wird erstellt
- [ ] Keyboard Navigation funktioniert

---

*Vorheriger Prompt: 17 – Copy/Paste & Keyboard Shortcuts*
*Nächster Prompt: 19 – Undo/Redo System*
