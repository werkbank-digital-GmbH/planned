'use client';

import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Snowflake,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface WeatherIconProps {
  code: number;
  className?: string;
}

/**
 * Wetter-Icon basierend auf WMO Weather Code.
 *
 * @see https://open-meteo.com/en/docs (Weather Interpretation Codes)
 */
export function WeatherIcon({ code, className }: WeatherIconProps) {
  const iconClass = cn('h-5 w-5', className);

  // Clear sky
  if (code === 0 || code === 1) {
    return <Sun className={cn(iconClass, 'text-yellow-500')} />;
  }

  // Partly cloudy
  if (code === 2 || code === 3) {
    return <Cloud className={cn(iconClass, 'text-gray-400')} />;
  }

  // Fog
  if (code === 45 || code === 48) {
    return <CloudFog className={cn(iconClass, 'text-gray-400')} />;
  }

  // Drizzle
  if (code >= 51 && code <= 57) {
    return <CloudDrizzle className={cn(iconClass, 'text-blue-400')} />;
  }

  // Rain
  if (code >= 61 && code <= 67) {
    return <CloudRain className={cn(iconClass, 'text-blue-500')} />;
  }

  // Snow
  if (code >= 71 && code <= 77) {
    return <Snowflake className={cn(iconClass, 'text-blue-200')} />;
  }

  // Rain showers
  if (code >= 80 && code <= 82) {
    return <CloudRain className={cn(iconClass, 'text-blue-500')} />;
  }

  // Snow showers
  if (code >= 85 && code <= 86) {
    return <CloudSnow className={cn(iconClass, 'text-blue-300')} />;
  }

  // Thunderstorm
  if (code >= 95 && code <= 99) {
    return <CloudLightning className={cn(iconClass, 'text-purple-500')} />;
  }

  // Default
  return <Cloud className={cn(iconClass, 'text-gray-400')} />;
}
