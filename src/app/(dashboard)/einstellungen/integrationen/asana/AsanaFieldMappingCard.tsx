'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  getAsanaCustomFields,
  getFieldMapping,
  saveFieldMapping,
  type CustomFieldDTO,
  type FieldMappingDTO,
} from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Label } from '@/presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

const NONE_VALUE = '__none__';

/**
 * Ermöglicht das Mapping von Asana Custom Fields zu Planned-Feldern.
 */
export function AsanaFieldMappingCard() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [customFields, setCustomFields] = useState<CustomFieldDTO[]>([]);
  const [mapping, setMapping] = useState<FieldMappingDTO>({});

  // Daten laden
  useEffect(() => {
    async function loadData() {
      const [fieldsResult, mappingResult] = await Promise.all([
        getAsanaCustomFields(),
        getFieldMapping(),
      ]);

      if (fieldsResult.success) {
        setCustomFields(fieldsResult.data);
      }

      if (mappingResult.success) {
        setMapping(mappingResult.data);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveFieldMapping(mapping);

      if (result.success) {
        toast.success('Field Mapping gespeichert');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleFieldChange = (field: keyof FieldMappingDTO, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === NONE_VALUE ? undefined : value,
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Field Mapping</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Field Mapping</CardTitle>
        <CardDescription>
          Ordnen Sie Asana Custom Fields den Planned-Feldern zu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {customFields.length === 0 ? (
          <p className="text-sm text-gray-500">
            Keine Custom Fields im Workspace gefunden.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Projektnummer</Label>
              <Select
                value={mapping.projectNumberFieldId ?? NONE_VALUE}
                onValueChange={(v) => handleFieldChange('projectNumberFieldId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Field auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                  {customFields.map((field) => (
                    <SelectItem key={field.gid} value={field.gid}>
                      {field.name} ({field.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SOLL Produktion (Stunden)</Label>
              <Select
                value={mapping.sollProduktionFieldId ?? NONE_VALUE}
                onValueChange={(v) => handleFieldChange('sollProduktionFieldId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Field auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                  {customFields
                    .filter((f) => f.type === 'number')
                    .map((field) => (
                      <SelectItem key={field.gid} value={field.gid}>
                        {field.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SOLL Montage (Stunden)</Label>
              <Select
                value={mapping.sollMontageFieldId ?? NONE_VALUE}
                onValueChange={(v) => handleFieldChange('sollMontageFieldId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Field auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                  {customFields
                    .filter((f) => f.type === 'number')
                    .map((field) => (
                      <SelectItem key={field.gid} value={field.gid}>
                        {field.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? 'Speichern...' : 'Mapping speichern'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
