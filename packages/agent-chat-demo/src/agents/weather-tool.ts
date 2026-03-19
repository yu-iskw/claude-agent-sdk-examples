import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const WEATHER_CONDITIONS = [
  'Sunny',
  'Partly cloudy',
  'Overcast',
  'Windy',
  'Light rain',
  'Thunderstorms',
  'Foggy',
] as const;

const WEATHER_SUMMARIES = [
  'Great for outdoor walking plans.',
  'Pack a light jacket for changing conditions.',
  'A flexible indoor backup plan would help.',
  'Expect mixed conditions throughout the day.',
  'Bring an umbrella just in case.',
] as const;

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
  'Returns a dummy randomized weather forecast for a requested location. Use this when the user wants a quick weather outlook inside the chat app.',
  {
    location: z.string().min(1),
    days: z.number().int().min(1).max(5).default(3),
    unit: z.enum(['C', 'F']).default('F'),
  },
  async ({ location, days, unit }) => {
    const today = new Date();
    const unitLabel = toUnitLabel(unit);
    const forecast = Array.from({ length: days }, (_, index) => {
      const day = new Date(today);
      day.setUTCDate(today.getUTCDate() + index);
      const condition = WEATHER_CONDITIONS[randomInt(0, WEATHER_CONDITIONS.length - 1)];
      const summary = WEATHER_SUMMARIES[randomInt(0, WEATHER_SUMMARIES.length - 1)];
      const temperature = buildTemperature(unit);

      return {
        date: day.toISOString().slice(0, 10),
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

export const weatherMcpServer = createSdkMcpServer({
  name: 'weather-tools',
  version: '1.0.0',
  tools: [randomWeatherForecast],
});
