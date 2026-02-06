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
    good: 'bg-green-50 hover:bg-green-100 border-green-200',
    moderate: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    poor: 'bg-red-50 hover:bg-red-100 border-red-200',
  }[rating.rating];

  const date = new Date(forecast.date);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex flex-col items-center p-3 rounded-lg transition-colors cursor-default border',
              bgColor,
              isToday && 'ring-2 ring-primary/30'
            )}
          >
            <p className="text-xs text-muted-foreground font-medium">
              {isToday ? 'Heute' : format(date, 'EE', { locale: de })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {format(date, 'd. MMM', { locale: de })}
            </p>
            <WeatherIcon code={forecast.weatherCode} className="h-7 w-7 my-1.5" />
            <p className="text-sm font-semibold">
              {Math.round(forecast.tempMax)}°
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round(forecast.tempMin)}°
            </p>
            <div className="mt-1.5 pt-1.5 border-t border-current/10 w-full text-center space-y-0.5">
              <p className="text-[10px] text-muted-foreground">
                💧 {forecast.precipitationProbability}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                💨 {Math.round(forecast.windSpeedMax)} km/h
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <div className="space-y-1">
            <p className="font-medium">{forecast.weatherDescription}</p>
            <p className="text-xs">
              {format(date, 'EEEE, d. MMMM', { locale: de })}
            </p>
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            Wettervorhersage (7 Tage)
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-200" />
              <span>Gut</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-yellow-200" />
              <span>Eingeschränkt</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-200" />
              <span>Ungünstig</span>
            </div>
          </div>
        </div>
        {projectAddress && (
          <p className="text-xs text-muted-foreground truncate">{projectAddress}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-2">
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
      </CardContent>
    </Card>
  );
}
