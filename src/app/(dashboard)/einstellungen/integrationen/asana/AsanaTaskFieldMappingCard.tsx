'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  getAsanaCustomFields,
  getAsanaSourceConfig,
  saveAsanaSourceConfig,
  type AsanaSourceConfigDTO,
  type CustomFieldDTO,
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
 * Custom Field Mapping fur Task-basierte Phasen.
 * - Projektphase: Dropdown fur den Phasen-Namen
 * - Zuordnung: Dropdown fur Bereich (produktion/montage)
 * - Soll-Stunden: Number-Feld fur Budget Hours
 */
export function AsanaTaskFieldMappingCard() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Daten
  const [customFields, setCustomFields] = useState<CustomFieldDTO[]>([]);
  const [config, setConfig] = useState<AsanaSourceConfigDTO>({
    sourceProjectId: null,
    teamId: null,
    phaseTypeFieldId: null,
    zuordnungFieldId: null,
    sollStundenFieldId: null,
  });

  // Daten laden
  useEffect(() => {
    async function loadData() {
      const [fieldsResult, configResult] = await Promise.all([
        getAsanaCustomFields(),
        getAsanaSourceConfig(),
      ]);

      if (fieldsResult.success) {
        setCustomFields(fieldsResult.data);
      }

      if (configResult.success) {
        setConfig(configResult.data);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveAsanaSourceConfig({
        sourceProjectId: config.sourceProjectId,
        teamId: config.teamId,
        phaseTypeFieldId: config.phaseTypeFieldId,
        zuordnungFieldId: config.zuordnungFieldId,
        sollStundenFieldId: config.sollStundenFieldId,
      });

      if (result.success) {
        toast.success('Field Mapping gespeichert');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleChange = (
    field: keyof AsanaSourceConfigDTO,
    value: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value === NONE_VALUE ? null : value,
    }));
  };

  // Filter fur enum/dropdown fields
  const enumFields = customFields.filter(
    (f) => f.type === 'enum' || f.type === 'multi_enum'
  );

  // Filter fur number fields
  const numberFields = customFields.filter((f) => f.type === 'number');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Field Mapping (Phasen)</CardTitle>
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
        <CardTitle>Custom Field Mapping (Phasen)</CardTitle>
        <CardDescription>
          Ordnen Sie Asana Custom Fields den Phasen-Eigenschaften zu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {customFields.length === 0 ? (
          <p className="text-sm text-gray-500">
            Keine Custom Fields im Workspace gefunden.
          </p>
        ) : (
          <>
            {/* Projektphase (Dropdown) */}
            <div className="space-y-2">
              <Label htmlFor="phaseType">Projektphase</Label>
              <p className="text-xs text-gray-500">
                Dropdown-Feld fur den Phasen-Namen (optional, sonst Task-Name)
              </p>
              <Select
                value={config.phaseTypeFieldId ?? NONE_VALUE}
                onValueChange={(v) => handleChange('phaseTypeFieldId', v)}
              >
                <SelectTrigger id="phaseType">
                  <SelectValue placeholder="Field auswahlen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Task-Name verwenden</SelectItem>
                  {enumFields.map((field) => (
                    <SelectItem key={field.gid} value={field.gid}>
                      {field.name} (Dropdown)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zuordnung/Bereich (Dropdown) */}
            <div className="space-y-2">
              <Label htmlFor="zuordnung">Zuordnung (Bereich)</Label>
              <p className="text-xs text-gray-500">
                Dropdown-Feld fur Produktion/Montage
              </p>
              <Select
                value={config.zuordnungFieldId ?? NONE_VALUE}
                onValueChange={(v) => handleChange('zuordnungFieldId', v)}
              >
                <SelectTrigger id="zuordnung">
                  <SelectValue placeholder="Field auswahlen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Standard: Produktion</SelectItem>
                  {enumFields.map((field) => (
                    <SelectItem key={field.gid} value={field.gid}>
                      {field.name} (Dropdown)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Soll-Stunden (Number) */}
            <div className="space-y-2">
              <Label htmlFor="sollStunden">Soll-Stunden</Label>
              <p className="text-xs text-gray-500">
                Number-Feld fur das Stunden-Budget der Phase
              </p>
              <Select
                value={config.sollStundenFieldId ?? NONE_VALUE}
                onValueChange={(v) => handleChange('sollStundenFieldId', v)}
              >
                <SelectTrigger id="sollStunden">
                  <SelectValue placeholder="Field auswahlen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                  {numberFields.map((field) => (
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
