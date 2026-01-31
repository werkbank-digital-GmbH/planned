'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  getAsanaCustomFields,
  getFieldMapping,
  saveFieldMapping,
  type FieldMappingDTO,
} from '@/presentation/actions/integrations';
import { Label } from '@/presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Definition der mapbaren Felder.
 */
const MAPPING_FIELDS: { key: keyof FieldMappingDTO; label: string; description: string }[] = [
  {
    key: 'projectNumberFieldId',
    label: 'Projektnummer',
    description: 'Asana-Feld mit der Projektnummer',
  },
  {
    key: 'sollProduktionFieldId',
    label: 'SOLL Produktion',
    description: 'Asana-Feld mit Produktionsstunden',
  },
  {
    key: 'sollMontageFieldId',
    label: 'SOLL Montage',
    description: 'Asana-Feld mit Montagestunden',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ermöglicht die Zuordnung von Asana Custom Fields zu Planned-Feldern.
 *
 * Features:
 * - Lädt verfügbare Custom Fields aus Asana
 * - Zeigt aktuelles Mapping
 * - Speichert Änderungen automatisch
 */
export function AsanaFieldMapping() {
  // Custom Fields laden
  const {
    data: customFieldsResult,
    isLoading: isLoadingFields,
  } = useQuery({
    queryKey: ['asana', 'customFields'],
    queryFn: async () => {
      const result = await getAsanaCustomFields();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  // Aktuelles Mapping laden
  const { data: mappingResult, isLoading: isLoadingMapping } = useQuery({
    queryKey: ['asana', 'fieldMapping'],
    queryFn: async () => {
      const result = await getFieldMapping();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  // Speichern Mutation
  const saveMutation = useMutation({
    mutationFn: async (newMapping: FieldMappingDTO) => {
      const result = await saveFieldMapping(newMapping);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Zuordnung gespeichert');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const customFields = customFieldsResult ?? [];
  const currentMapping = mappingResult ?? {};

  // Handler für Änderungen
  const handleChange = (key: keyof FieldMappingDTO, value: string) => {
    const newMapping: FieldMappingDTO = {
      ...currentMapping,
      [key]: value === 'none' ? undefined : value,
    };
    saveMutation.mutate(newMapping);
  };

  // Loading State
  if (isLoadingFields || isLoadingMapping) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Lade Konfiguration...</span>
      </div>
    );
  }

  // No custom fields
  if (customFields.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Keine Custom Fields im Workspace gefunden.</p>
        <p className="mt-1 text-xs">
          Erstellen Sie Custom Fields in Asana, um sie hier zuordnen zu können.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Custom Field Zuordnung</h3>
        <p className="text-sm text-gray-500">
          Ordnen Sie Asana Custom Fields den Planned-Feldern zu.
        </p>
      </div>

      {/* Field Mappings */}
      <div className="space-y-4">
        {MAPPING_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-2 items-center gap-4">
            <div>
              <Label className="text-sm font-medium">{field.label}</Label>
              <p className="text-xs text-gray-500">{field.description}</p>
            </div>
            <Select
              value={currentMapping[field.key] ?? 'none'}
              onValueChange={(value) => handleChange(field.key, value)}
              disabled={saveMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Feld auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nicht zugeordnet</SelectItem>
                {customFields.map((cf) => (
                  <SelectItem key={cf.gid} value={cf.gid}>
                    {cf.name}
                    <span className="ml-1 text-xs text-gray-400">({cf.type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
        <strong>Hinweis:</strong> Die Zuordnung wird automatisch beim nächsten Sync verwendet.
        Änderungen werden sofort gespeichert.
      </div>
    </div>
  );
}
