'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Dialog, DialogContent, DialogTitle } from './dialog';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
}

/**
 * A searchable select component using cmdk Command Palette style.
 * Opens a modal dialog with fuzzy search through all options.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Auswählen...',
  searchPlaceholder = 'Suchen...',
  emptyText = 'Keine Ergebnisse',
  disabled = false,
  allowClear = false,
  clearLabel = 'Nicht konfiguriert',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <span className={cn(!selectedOption && 'text-muted-foreground')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{searchPlaceholder}</DialogTitle>
          <Command shouldFilter={true}>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {allowClear && (
                  <CommandItem
                    value={clearLabel}
                    onSelect={handleClear}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === null ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="text-muted-foreground">{clearLabel}</span>
                  </CommandItem>
                )}
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
