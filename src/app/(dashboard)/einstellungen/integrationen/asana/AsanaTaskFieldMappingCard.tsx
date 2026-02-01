'use client';

import { AlertCircle, Loader2, Save } from 'lucide-react';
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
  const [noSourceProject, setNoSourceProject] = useState(false);
  const [config, setConfig] = useState<AsanaSourceConfigDTO>({
    sourceProjectId: null,
    teamId: null,
    phaseTypeFieldId: null,
    zuordnungFieldId: null,
    sollStundenFieldId: null,
    istStundenFieldId: null,
  });

  // Daten laden
  useEffect(() => {
    async function loadData() {
      const configResult = await getAsanaSourceConfig();

      if (configResult.success) {
        setConfig(configResult.data);

        // Nur Custom Fields laden wenn Quell-Projekt konfiguriert ist
        if (configResult.data.sourceProjectId) {
          const fieldsResult = await getAsanaCustomFields();
          if (fieldsResult.success) {
            setCustomFields(fieldsResult.data);
          }
          setNoSourceProject(false);
        } else {
          setNoSourceProject(true);
        }
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
        istStundenFieldId: config.istStundenFieldId,
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
        {noSourceProject ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Quell-Projekt nicht konfiguriert</p>
              <p className="mt-1">
                Bitte wählen Sie zuerst ein Quell-Projekt in der Konfiguration oben aus,
                um die Custom Fields zu laden.
              </p>
            </div>
          </div>
        ) : customFields.length === 0 ? (
          <p className="text-sm text-gray-500">
            Keine Custom Fields im Quell-Projekt gefunden.
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
                  <SelectItem value={NONE_VALUE}>Standard: Nicht definiert</SelectItem>
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

            {/* Ist-Stunden (Number) */}
            <div className="space-y-2">
              <Label htmlFor="istStunden">Ist-Stunden</Label>
              <p className="text-xs text-gray-500">
                Number-Feld für die tatsächlich geleisteten Stunden (Actual Hours)
              </p>
              <Select
                value={config.istStundenFieldId ?? NONE_VALUE}
                onValueChange={(v) => handleChange('istStundenFieldId', v)}
              >
                <SelectTrigger id="istStunden">
                  <SelectValue placeholder="Field auswählen..." />
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
