import { describe, expect, it } from 'vitest';
import { weatherMcpServer } from '../src/server/weather-tool.js';

describe('weather MCP server', () => {
  it('registers the dummy random weather tool', () => {
    expect(weatherMcpServer.type).toBe('sdk');
    expect(weatherMcpServer.name).toBe('weather-tools');
  });
});
