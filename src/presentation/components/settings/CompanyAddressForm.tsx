'use client';

import { CheckCircle, Loader2, MapPin, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateCompanyAddressAction } from '@/presentation/actions/tenant';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CompanyAddressFormProps {
  currentAddress: string | null;
  currentLat: number | null;
  currentLng: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formular für die Firmenadresse mit Geocoding.
 *
 * Features:
 * - Adress-Eingabe
 * - "Adresse prüfen" Button für Geocoding
 * - Anzeige der gefundenen Koordinaten
 * - Erfolgs-Feedback
 */
export function CompanyAddressForm({
  currentAddress,
  currentLat,
  currentLng,
}: CompanyAddressFormProps) {
  const [address, setAddress] = useState(currentAddress ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [savedAddress, setSavedAddress] = useState<{
    address: string;
    lat: number;
    lng: number;
    displayName: string;
  } | null>(
    currentAddress && currentLat && currentLng
      ? { address: currentAddress, lat: currentLat, lng: currentLng, displayName: '' }
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      toast.error('Bitte geben Sie eine Adresse ein');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateCompanyAddressAction(address.trim());

      if (result.success) {
        setSavedAddress(result.data!);
        toast.success('Firmenadresse aktualisiert');
      } else {
        toast.error(result.error.message);
      }
    } catch {
      toast.error('Fehler beim Speichern der Adresse');
    } finally {
      setIsLoading(false);
    }
  };

  const hasLocation = savedAddress?.lat && savedAddress?.lng;
  const isAddressChanged = address.trim() !== (savedAddress?.address ?? '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Firmenstandort</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Der Firmenstandort wird als Fallback verwendet, wenn ein Projekt keine eigene Adresse hat.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-address">Adresse</Label>
          <div className="flex gap-2">
            <Input
              id="company-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Musterstraße 1, 12345 Musterstadt"
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !address.trim()}
              variant={isAddressChanged ? 'default' : 'outline'}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Prüfen & Speichern</span>
            </Button>
          </div>
        </div>

        {/* Geocoding Result */}
        {hasLocation && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              isAddressChanged ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'
            )}
          >
            <CheckCircle
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                isAddressChanged ? 'text-yellow-600' : 'text-green-600'
              )}
            />
            <div className="space-y-1 text-sm">
              {isAddressChanged ? (
                <p className="font-medium text-yellow-700">
                  Adresse wurde geändert - klicken Sie auf &quot;Prüfen & Speichern&quot;
                </p>
              ) : (
                <p className="font-medium text-green-700">Adresse erfolgreich verifiziert</p>
              )}
              {savedAddress?.displayName && (
                <p className="text-muted-foreground">{savedAddress.displayName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Koordinaten: {savedAddress?.lat.toFixed(5)}, {savedAddress?.lng.toFixed(5)}
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
