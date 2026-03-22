import { describe, expect, it } from 'vitest';
import {
  createWeatherMcpServer,
  formatLocalYmd,
  MAX_WEATHER_LOCATION_LENGTH,
  weatherForecastInputSchema,
} from './weather-tool.js';

describe('weather MCP server', () => {
  it('registers the dummy random weather tool', () => {
    const weatherMcpServer = createWeatherMcpServer();

    expect(weatherMcpServer.type).toBe('sdk');
    expect(weatherMcpServer.name).toBe('weather-tools');
  });

  it('creates a distinct SDK MCP server instance per call', () => {
    const firstServer = createWeatherMcpServer();
    const secondServer = createWeatherMcpServer();

    expect(firstServer).not.toBe(secondServer);
    expect(firstServer.instance).not.toBe(secondServer.instance);
  });
});

describe('weatherForecastInputSchema', () => {
  it('accepts a typical location', () => {
    const result = weatherForecastInputSchema.safeParse({
      location: 'Tokyo',
      days: 3,
      unit: 'C',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBe('Tokyo');
    }
  });

  it('accepts location at max length after trim', () => {
    const location = 'a'.repeat(MAX_WEATHER_LOCATION_LENGTH);
    const result = weatherForecastInputSchema.safeParse({ location });
    expect(result.success).toBe(true);
  });

  it('rejects location longer than max after trim', () => {
    const location = 'a'.repeat(MAX_WEATHER_LOCATION_LENGTH + 1);
    const result = weatherForecastInputSchema.safeParse({ location });
    expect(result.success).toBe(false);
  });

  it('rejects empty location', () => {
    expect(weatherForecastInputSchema.safeParse({ location: '' }).success).toBe(false);
  });

  it('rejects whitespace-only location', () => {
    expect(weatherForecastInputSchema.safeParse({ location: '   ' }).success).toBe(false);
  });
});

describe('formatLocalYmd', () => {
  it('formats local calendar date as YYYY-MM-DD', () => {
    expect(formatLocalYmd(new Date(2026, 2, 9))).toBe('2026-03-09');
  });

  it('zero-pads month and day', () => {
    expect(formatLocalYmd(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
