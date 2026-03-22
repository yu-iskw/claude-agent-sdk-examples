import {
  createSdkMcpServer,
  tool,
  type McpSdkServerConfigWithInstance,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

/** Max length for `location` after trim (mitigates context stuffing). */
export const MAX_WEATHER_LOCATION_LENGTH = 120;

export const weatherForecastInputSchema = z.object({
  location: z.string().trim().min(1).max(MAX_WEATHER_LOCATION_LENGTH),
  days: z.number().int().min(1).max(5).default(3),
  unit: z.enum(['C', 'F']).default('F'),
});

const WEATHER_TOOL_DESCRIPTION =
  'Returns a randomized dummy forecast (not from any real weather service). Use only for UI or trip-planning demos in this app. Do not rely on it for safety-critical decisions (severe weather, aviation, marine, or operational use).';

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

/** Local calendar YYYY-MM-DD (avoids UTC skew from `toISOString().slice(0, 10)`). */
export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toUnitLabel(unit: 'C' | 'F'): '°C' | '°F' {
  return unit === 'C' ? '°C' : '°F';
}

function buildTemperature(unit: 'C' | 'F') {
  if (unit === 'C') {
    const high = randomInt(12, 32);
    const low = high - randomInt(3, 9);
    return { high, low };
  }

  const high = randomInt(58, 92);
  const low = high - randomInt(6, 16);
  return { high, low };
}

const randomWeatherForecast = tool(
  'get-random-weather-forecast',
  WEATHER_TOOL_DESCRIPTION,
  weatherForecastInputSchema.shape,
  async ({ location, days, unit }) => {
    const today = new Date();
    const unitLabel = toUnitLabel(unit);
    const forecast = Array.from({ length: days }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      const condition = weatherConditions[randomInt(0, weatherConditions.length - 1)];
      const summary = weatherSummaries[randomInt(0, weatherSummaries.length - 1)];
      const temperature = buildTemperature(unit);

      return {
        date: formatLocalYmd(day),
        condition,
        high: `${temperature.high}${unitLabel}`,
        low: `${temperature.low}${unitLabel}`,
        summary,
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
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
          ),
        },
      ],
    };
  },
  {
    annotations: {
      readOnly: true,
      openWorld: false,
    },
  },
);

export function createWeatherMcpServer(): McpSdkServerConfigWithInstance {
  return createSdkMcpServer({
    name: 'weather-tools',
    version: '1.0.0',
    tools: [randomWeatherForecast],
  });
}
