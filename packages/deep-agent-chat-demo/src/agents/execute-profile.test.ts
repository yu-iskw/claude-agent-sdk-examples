import { describe, expect, it } from 'vitest';
import { createExecuteAgent } from './deepagent-profiles.js';
import { createGeminiModel } from './deepagent-models.js';
import { createWeatherTool } from './tools/weather-tool.js';
import { tripPlannerSystemPrompt, loadWorkspaceResources } from './workspace-loader.js';

describe('execute profile', () => {
  it('creates an execute agent with weather tool', () => {
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-key';
    const prompt = tripPlannerSystemPrompt(loadWorkspaceResources());
    const agent = createExecuteAgent(prompt, [createWeatherTool()], createGeminiModel());
    expect(agent).toBeDefined();
    expect(typeof agent.streamEvents).toBe('function');
  });
});
