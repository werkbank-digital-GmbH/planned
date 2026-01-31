'use client';

import { Keyboard } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog';
import { useSelection } from '@/presentation/contexts/SelectionContext';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dialog mit Übersicht aller Keyboard Shortcuts.
 *
 * Wird über "?" Taste oder Help-Button geöffnet.
 */
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
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
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
                          className="rounded border bg-muted px-2 py-1 text-xs"
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

        <p className="text-xs text-muted-foreground">
          Tipp: Auf Windows/Linux verwenden Sie Strg statt ⌘
        </p>
      </DialogContent>
    </Dialog>
  );
}
