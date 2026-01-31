# Prompt 17: Copy/Paste & Keyboard Shortcuts

**Phase:** 4 – UI & Drag-and-Drop
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 3-4 Stunden

---

## Kontext

Drag & Drop funktioniert. Jetzt implementieren wir Keyboard Shortcuts für Power-User.

**Bereits vorhanden:**
- Drag & Drop für Allocations
- CreateAllocationUseCase
- DeleteAllocationUseCase
- MoveAllocationUseCase

---

## Ziel

Implementiere Copy/Paste für Allocations und globale Keyboard Shortcuts.

---

## Referenz-Dokumentation

- `FEATURES.md` – F3.10 (Keyboard Shortcuts)
- `Rules.md` – Shortcut-Konventionen

---

## Akzeptanzkriterien

```gherkin
Feature: F3.10 - Keyboard Shortcuts

Scenario: Allocation kopieren (Cmd/Ctrl+C)
  Given ich habe eine Allocation selektiert
  When ich Cmd/Ctrl+C drücke
  Then wird die Allocation in die Zwischenablage kopiert
  And ich sehe eine Bestätigung "Allocation kopiert"

Scenario: Allocation einfügen (Cmd/Ctrl+V)
  Given ich habe eine Allocation kopiert
  And ich hovere über eine leere Zelle
  When ich Cmd/Ctrl+V drücke
  Then wird eine neue Allocation erstellt
  And sie hat dieselbe Phase und Stunden wie das Original

Scenario: Allocation einfügen bei einem anderen User
  Given ich habe Allocation von Max kopiert
  When ich bei Anna Cmd/Ctrl+V drücke
  Then wird die Allocation für Anna erstellt
  And die Stunden werden redistributed

Scenario: Allocation löschen (Delete/Backspace)
  Given ich habe eine Allocation selektiert
  When ich Delete oder Backspace drücke
  Then öffnet sich ein Bestätigungs-Dialog
  After Bestätigung: Allocation wird gelöscht

Scenario: Allocation duplizieren (Cmd/Ctrl+D)
  Given ich habe eine Allocation selektiert
  When ich Cmd/Ctrl+D drücke
  Then wird eine Kopie am nächsten freien Tag erstellt
  And der Dialog für Details öffnet sich

Scenario: Zur nächsten Woche navigieren
  Given ich bin in der Planungsansicht
  When ich Alt+→ drücke
  Then navigiere ich zur nächsten Woche

Scenario: Zur vorherigen Woche navigieren
  Given ich bin in der Planungsansicht
  When ich Alt+← drücke
  Then navigiere ich zur vorherigen Woche

Scenario: Quick-Add Dialog öffnen (N)
  Given ich bin in der Planungsansicht
  And keine Textfelder sind fokussiert
  When ich "N" drücke
  Then öffnet sich der Quick-Add Dialog

Scenario: Hilfe anzeigen (?)
  Given ich bin in der Planungsansicht
  When ich "?" drücke
  Then öffnet sich eine Übersicht aller Shortcuts

Scenario: Auswahl aufheben (Escape)
  Given ich habe eine Allocation selektiert
  When ich Escape drücke
  Then wird die Auswahl aufgehoben
```

---

## Technische Anforderungen

### Clipboard Data Format

```typescript
interface ClipboardAllocation {
  projectPhaseId: string;
  projectId: string;
  plannedHours: number;
  notes?: string;
  sourceDate: Date;
  sourceUserId?: string;
  sourceResourceId?: string;
}

// In localStorage speichern (Clipboard API unterstützt keine komplexen Objekte)
const CLIPBOARD_KEY = 'planned_allocation_clipboard';
```

### Shortcut-Map

```typescript
const SHORTCUTS = {
  // Allocation Actions
  COPY: { key: 'c', meta: true },           // Cmd/Ctrl+C
  PASTE: { key: 'v', meta: true },          // Cmd/Ctrl+V
  DELETE: { key: ['Delete', 'Backspace'] }, // Delete oder Backspace
  DUPLICATE: { key: 'd', meta: true },      // Cmd/Ctrl+D

  // Navigation
  NEXT_WEEK: { key: 'ArrowRight', alt: true },   // Alt+→
  PREV_WEEK: { key: 'ArrowLeft', alt: true },    // Alt+←
  TODAY: { key: 't', alt: true },                // Alt+T

  // Dialogs
  QUICK_ADD: { key: 'n' },                   // N
  HELP: { key: '?' },                        // ?

  // Selection
  ESCAPE: { key: 'Escape' },                 // ESC
  SELECT_ALL: { key: 'a', meta: true },      // Cmd/Ctrl+A (in Range-Select)
} as const;
```

---

## Implementierungsschritte

### 🔴 RED: Test für Keyboard Shortcuts Hook

```typescript
// src/presentation/hooks/__tests__/useKeyboardShortcuts.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('should call handler on matching shortcut', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'c', meta: true, handler },
      ])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalled();
  });

  it('should not trigger when input is focused', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'n', handler },
      ])
    );

    // Simuliere fokussiertes Input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'n' });
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
```

### 🟢 GREEN: useKeyboardShortcuts Hook

```typescript
// src/presentation/hooks/useKeyboardShortcuts.ts
'use client';

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string | string[];
  meta?: boolean;   // Cmd (Mac) / Ctrl (Windows)
  alt?: boolean;
  shift?: boolean;
  handler: (e: KeyboardEvent) => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Nicht triggern wenn ein Eingabefeld fokussiert ist
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;

        const keys = Array.isArray(shortcut.key) ? shortcut.key : [shortcut.key];
        const keyMatches = keys.includes(e.key);

        const metaMatches = shortcut.meta
          ? (e.metaKey || e.ctrlKey)  // Mac: Cmd, Windows: Ctrl
          : (!e.metaKey && !e.ctrlKey);

        const altMatches = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (keyMatches && metaMatches && altMatches && shiftMatches) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

### 🟢 GREEN: Clipboard Hook

```typescript
// src/presentation/hooks/useAllocationClipboard.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const CLIPBOARD_KEY = 'planned_allocation_clipboard';

interface ClipboardAllocation {
  projectPhaseId: string;
  projectId: string;
  plannedHours: number;
  notes?: string;
  sourceDate: string;
  sourceUserId?: string;
  sourceResourceId?: string;
  copiedAt: string;
}

export function useAllocationClipboard() {
  const [clipboard, setClipboard] = useState<ClipboardAllocation | null>(null);

  // Initialisieren aus localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CLIPBOARD_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ClipboardAllocation;
        // Nur wenn weniger als 1 Stunde alt
        const copiedAt = new Date(parsed.copiedAt);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (copiedAt > hourAgo) {
          setClipboard(parsed);
        } else {
          localStorage.removeItem(CLIPBOARD_KEY);
        }
      } catch {
        localStorage.removeItem(CLIPBOARD_KEY);
      }
    }
  }, []);

  const copy = useCallback((allocation: AllocationWithDetails) => {
    const data: ClipboardAllocation = {
      projectPhaseId: allocation.projectPhase.id,
      projectId: allocation.project.id,
      plannedHours: allocation.plannedHours,
      notes: allocation.notes,
      sourceDate: allocation.date.toISOString(),
      sourceUserId: allocation.user?.id,
      sourceResourceId: allocation.resource?.id,
      copiedAt: new Date().toISOString(),
    };

    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data));
    setClipboard(data);
    toast.success('Allocation kopiert');
  }, []);

  const paste = useCallback(async (
    targetUserId: string | undefined,
    targetResourceId: string | undefined,
    targetDate: Date,
    createAllocation: (data: CreateAllocationInput) => Promise<void>
  ) => {
    if (!clipboard) {
      toast.error('Keine Allocation in der Zwischenablage');
      return;
    }

    await createAllocation({
      projectPhaseId: clipboard.projectPhaseId,
      userId: targetUserId,
      resourceId: targetResourceId,
      date: targetDate,
      notes: clipboard.notes,
    });

    toast.success('Allocation eingefügt');
  }, [clipboard]);

  const clear = useCallback(() => {
    localStorage.removeItem(CLIPBOARD_KEY);
    setClipboard(null);
  }, []);

  return {
    clipboard,
    hasClipboard: clipboard !== null,
    copy,
    paste,
    clear,
  };
}
```

### 🟢 GREEN: Planning Keyboard Handler

```typescript
// src/presentation/components/planning/PlanningKeyboardHandler.tsx
'use client';

import { useCallback } from 'react';
import { useKeyboardShortcuts } from '@/presentation/hooks/useKeyboardShortcuts';
import { useAllocationClipboard } from '@/presentation/hooks/useAllocationClipboard';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useSelection } from '@/presentation/contexts/SelectionContext';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';

export function PlanningKeyboardHandler() {
  const {
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
    deleteAllocation,
    createAllocation,
  } = usePlanning();

  const {
    selectedAllocation,
    hoveredCell,
    clearSelection,
    setShowQuickAdd,
    setShowHelp,
    showDeleteConfirm,
    setShowDeleteConfirm,
  } = useSelection();

  const { copy, paste, hasClipboard } = useAllocationClipboard();

  // Copy
  const handleCopy = useCallback(() => {
    if (selectedAllocation) {
      copy(selectedAllocation);
    }
  }, [selectedAllocation, copy]);

  // Paste
  const handlePaste = useCallback(async () => {
    if (!hasClipboard || !hoveredCell) return;

    await paste(
      hoveredCell.userId,
      hoveredCell.resourceId,
      hoveredCell.date,
      createAllocation
    );
  }, [hasClipboard, hoveredCell, paste, createAllocation]);

  // Delete
  const handleDelete = useCallback(() => {
    if (selectedAllocation) {
      if (selectedAllocation.notes) {
        // Bestätigung erforderlich bei Notes
        setShowDeleteConfirm(true);
      } else {
        deleteAllocation(selectedAllocation.id);
      }
    }
  }, [selectedAllocation, deleteAllocation, setShowDeleteConfirm]);

  // Duplicate
  const handleDuplicate = useCallback(() => {
    if (selectedAllocation) {
      // Nächster freier Tag finden
      const nextDay = new Date(selectedAllocation.date);
      nextDay.setDate(nextDay.getDate() + 1);

      // Skip Wochenende
      while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
        nextDay.setDate(nextDay.getDate() + 1);
      }

      // Dialog mit vorausgefüllten Daten öffnen
      setShowQuickAdd(true, {
        projectPhaseId: selectedAllocation.projectPhase.id,
        userId: selectedAllocation.user?.id,
        resourceId: selectedAllocation.resource?.id,
        date: nextDay,
      });
    }
  }, [selectedAllocation, setShowQuickAdd]);

  useKeyboardShortcuts([
    // Allocation Actions
    { key: 'c', meta: true, handler: handleCopy, disabled: !selectedAllocation },
    { key: 'v', meta: true, handler: handlePaste, disabled: !hasClipboard },
    { key: ['Delete', 'Backspace'], handler: handleDelete, disabled: !selectedAllocation },
    { key: 'd', meta: true, handler: handleDuplicate, disabled: !selectedAllocation },

    // Navigation
    { key: 'ArrowRight', alt: true, handler: goToNextWeek },
    { key: 'ArrowLeft', alt: true, handler: goToPreviousWeek },
    { key: 't', alt: true, handler: goToToday },

    // Dialogs
    { key: 'n', handler: () => setShowQuickAdd(true) },
    { key: '?', handler: () => setShowHelp(true) },

    // Selection
    { key: 'Escape', handler: clearSelection },
  ]);

  return (
    <>
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        allocation={selectedAllocation}
        onConfirm={() => {
          if (selectedAllocation) {
            deleteAllocation(selectedAllocation.id, true);
          }
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ShortcutHelpDialog />
    </>
  );
}
```

### 🟢 GREEN: Shortcut Help Dialog

```typescript
// src/presentation/components/planning/ShortcutHelpDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog';
import { useSelection } from '@/presentation/contexts/SelectionContext';
import { Keyboard } from 'lucide-react';

const SHORTCUT_GROUPS = [
  {
    title: 'Allocation Aktionen',
    shortcuts: [
      { keys: ['⌘', 'C'], description: 'Kopieren' },
      { keys: ['⌘', 'V'], description: 'Einfügen' },
      { keys: ['⌘', 'D'], description: 'Duplizieren' },
      { keys: ['⌫'], description: 'Löschen' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌥', '→'], description: 'Nächste Woche' },
      { keys: ['⌥', '←'], description: 'Vorherige Woche' },
      { keys: ['⌥', 'T'], description: 'Heute' },
    ],
  },
  {
    title: 'Allgemein',
    shortcuts: [
      { keys: ['N'], description: 'Neue Allocation' },
      { keys: ['?'], description: 'Hilfe anzeigen' },
      { keys: ['Esc'], description: 'Auswahl aufheben' },
    ],
  },
];

export function ShortcutHelpDialog() {
  const { showHelp, setShowHelp } = useSelection();

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Tastaturkürzel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, i) => (
                        <kbd
                          key={i}
                          className="px-2 py-1 text-xs bg-gray-100 border rounded"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          Tipp: Auf Windows/Linux verwenden Sie Strg statt ⌘
        </p>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Erwartete Dateien

```
src/
├── presentation/
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useAllocationClipboard.ts
│   │   └── __tests__/
│   │       └── useKeyboardShortcuts.test.ts
│   ├── contexts/
│   │   └── SelectionContext.tsx
│   └── components/
│       └── planning/
│           ├── PlanningKeyboardHandler.tsx
│           ├── ShortcutHelpDialog.tsx
│           └── DeleteConfirmDialog.tsx
```

---

## Hinweise

- Cmd auf Mac = Ctrl auf Windows (meta: true)
- Shortcuts nur wenn kein Input fokussiert
- Clipboard in localStorage (Browser-Clipboard unterstützt keine komplexen Objekte)
- Clipboard läuft nach 1 Stunde ab
- Toast-Feedback für Copy/Paste/Delete
- "?" zeigt Shortcut-Hilfe
- Allocation muss selektiert sein für Copy/Delete

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Cmd/Ctrl+C kopiert Allocation
- [ ] Cmd/Ctrl+V fügt Allocation ein
- [ ] Delete/Backspace löscht Allocation
- [ ] Cmd/Ctrl+D dupliziert Allocation
- [ ] Alt+Pfeile navigieren Wochen
- [ ] N öffnet Quick-Add Dialog
- [ ] ? zeigt Shortcut-Hilfe
- [ ] ESC hebt Auswahl auf

---

*Vorheriger Prompt: 16 – Drag & Drop Basic*
*Nächster Prompt: 18 – Quick-Add Dialog*
