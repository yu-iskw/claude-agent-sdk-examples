import { tool } from 'langchain';
import { z } from 'zod';

export const MAX_WEATHER_LOCATION_LENGTH = 120;

export const weatherForecastInputSchema = z.object({
  location: z.string().trim().min(1).max(MAX_WEATHER_LOCATION_LENGTH),
  days: z.number().int().min(1).max(5).default(3),
  unit: z.enum(['C', 'F']).default('F'),
});

const weatherConditions = [
  'Sunny',
  'Partly cloudy',
  'Overcast',
  'Windy',
  'Light rain',
  'Thunderstorms',
  'Foggy',
] as const;

const weatherSummaries = [
  'Great for outdoor walking plans.',
  'Pack a light jacket for changing conditions.',
  'A flexible indoor backup plan would help.',
  'Expect mixed conditions throughout the day.',
  'Bring an umbrella just in case.',
] as const;

export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildTemperature(unit: 'C' | 'F') {
  if (unit === 'C') {
    const high = randomInt(12, 32);
    return { high, low: high - randomInt(3, 9) };
  }
  const high = randomInt(58, 92);
  return { high, low: high - randomInt(6, 16) };
}

const WEATHER_TOOL_DESCRIPTION =
  'Returns a randomized dummy forecast (not from any real weather service). Use only for UI or trip-planning demos.';

export function createWeatherTool() {
  return tool(
    ({ location, days, unit }) => {
      const today = new Date();
      const unitLabel = unit === 'C' ? '°C' : '°F';
      const forecast = Array.from({ length: days }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() + index);
        const temperature = buildTemperature(unit);
        return {
          date: formatLocalYmd(day),
          condition: weatherConditions[randomInt(0, weatherConditions.length - 1)],
          high: `${temperature.high}${unitLabel}`,
          low: `${temperature.low}${unitLabel}`,
          summary: weatherSummaries[randomInt(0, weatherSummaries.length - 1)],
        };
      });

      return JSON.stringify(
        {
          location,
          source: 'dummy-random-weather-tool',
          synthetic: true,
          dataQuality: 'demo-random',
          generatedAt: new Date().toISOString(),
          forecast,
        },
        null,
        2,
      );
    },
    {
      name: 'get-random-weather-forecast',
      description: WEATHER_TOOL_DESCRIPTION,
      schema: weatherForecastInputSchema,
    },
  );
}
