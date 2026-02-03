'use client';

import { AlertTriangle } from 'lucide-react';

import type { AllocationWithDetails } from '@/application/queries';

import { Button } from '@/presentation/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog';

import { formatHoursWithUnit } from '@/lib/format';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DeleteConfirmDialogProps {
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Die zu löschende Allocation */
  allocation: AllocationWithDetails | null;
  /** Callback für Bestätigung */
  onConfirm: () => void;
  /** Callback für Abbruch */
  onCancel: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bestätigungsdialog zum Löschen einer Allocation.
 *
 * Zeigt Details zur Allocation und warnt vor unwiderruflicher Löschung.
 */
export function DeleteConfirmDialog({
  isOpen,
  allocation,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!allocation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Allocation löschen?
          </DialogTitle>
          <DialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
          <div className="font-medium">{allocation.project.name}</div>
          <div className="text-sm text-muted-foreground">
            {allocation.projectPhase.name}
          </div>
          <div className="text-sm">
            {formatHoursWithUnit(allocation.plannedHours ?? 0)} geplant
            {allocation.user && ` · ${allocation.user.fullName}`}
          </div>
          {allocation.notes && (
            <div className="border-t pt-2 text-sm text-muted-foreground">
              <span className="font-medium">Notiz:</span> {allocation.notes}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
