'use client';

import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/presentation/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/presentation/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/ui/popover';

import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  /** Label für den Filter */
  label: string;
  /** Placeholder wenn nichts ausgewählt */
  placeholder: string;
  /** Verfügbare Optionen */
  options: FilterOption[];
  /** Aktuell ausgewählter Wert */
  value?: string;
  /** Callback wenn sich der Wert ändert */
  onChange: (value: string | undefined) => void;
  /** Ob Laden angezeigt werden soll */
  isLoading?: boolean;
}

/**
 * Dropdown-Filter mit Suchfunktion.
 *
 * Ermöglicht die Auswahl einer Option aus einer Liste
 * mit Suchfunktion und Clear-Button.
 */
export function FilterDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  isLoading = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
              disabled={isLoading}
            >
              {selectedOption ? (
                <span className="truncate">{selectedOption.label}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput placeholder={`${label} suchen...`} />
              <CommandList>
                <CommandEmpty>Keine Ergebnisse</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        onChange(
                          option.value === value ? undefined : option.value
                        );
                        setOpen(false);
                      }}
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
          </PopoverContent>
        </Popover>

        {/* Clear Button */}
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => onChange(undefined)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Filter zurücksetzen</span>
          </Button>
        )}
      </div>
    </div>
  );
}
