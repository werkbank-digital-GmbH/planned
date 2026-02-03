'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, Cloud } from 'lucide-react';

import type { ConstructionWeatherRating } from '@/domain/weather';

import { Alert, AlertDescription } from '@/presentation/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { WeatherIcon } from './WeatherIcon';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WeatherForecastData {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number;
  windSpeedMax: number;
  constructionRating: ConstructionWeatherRating;
}

interface WeatherForecastProps {
  forecasts: WeatherForecastData[];
  projectAddress?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEATHER DAY
// ═══════════════════════════════════════════════════════════════════════════

interface WeatherDayProps {
  forecast: WeatherForecastData;
  isToday: boolean;
}

function WeatherDay({ forecast, isToday }: WeatherDayProps) {
  const rating = forecast.constructionRating;
  const bgColor = {
    good: 'bg-green-50 hover:bg-green-100',
    moderate: 'bg-yellow-50 hover:bg-yellow-100',
    poor: 'bg-red-50 hover:bg-red-100',
  }[rating.rating];

  const date = new Date(forecast.date);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex flex-col items-center p-2 rounded-lg transition-colors cursor-default min-w-[52px]',
              bgColor
            )}
          >
            <p className="text-xs text-muted-foreground font-medium">
              {isToday ? 'Heute' : format(date, 'EE', { locale: de })}
            </p>
            <WeatherIcon code={forecast.weatherCode} className="h-6 w-6 my-1" />
            <p className="text-xs font-medium">
              {Math.round(forecast.tempMin)}° / {Math.round(forecast.tempMax)}°
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-medium">{forecast.weatherDescription}</p>
            <p className="text-xs">
              {format(date, 'EEEE, d. MMMM', { locale: de })}
            </p>
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t">
              <p>Regen: {forecast.precipitationProbability}%</p>
              <p>Wind: {Math.round(forecast.windSpeedMax)} km/h</p>
            </div>
            {rating.reasons.length > 0 && (
              <div className="pt-1 border-t space-y-0.5">
                {rating.reasons.map((reason, i) => (
                  <p
                    key={i}
                    className={cn(
                      'text-xs',
                      rating.rating === 'poor' ? 'text-red-600' : 'text-yellow-600'
                    )}
                  >
                    {reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt eine 7-Tage-Wettervorhersage für ein Projekt.
 *
 * Features:
 * - Tagesansicht mit Icons und Temperaturen
 * - Farbcodierung nach Baustellentauglichkeit (grün/gelb/rot)
 * - Tooltips mit Details
 * - Warnung bei schlechtem Wetter in den nächsten 3 Tagen
 */
export function WeatherForecastCard({ forecasts, projectAddress }: WeatherForecastProps) {
  if (forecasts.length === 0) {
    return null;
  }

  // Check für schlechtes Wetter in den nächsten 3 Tagen
  const hasPoorWeatherSoon = forecasts
    .slice(0, 3)
    .some((f) => f.constructionRating.rating === 'poor');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cloud className="h-4 w-4 text-muted-foreground" />
          Wetter (7 Tage)
        </CardTitle>
        {projectAddress && (
          <p className="text-xs text-muted-foreground truncate">{projectAddress}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {forecasts.slice(0, 7).map((forecast, i) => (
            <WeatherDay key={forecast.date} forecast={forecast} isToday={i === 0} />
          ))}
        </div>

        {hasPoorWeatherSoon && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Ungünstige Wetterbedingungen in den nächsten 3 Tagen erwartet.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100" />
            <span>Gut</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-100" />
            <span>Eingeschränkt</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100" />
            <span>Ungünstig</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
