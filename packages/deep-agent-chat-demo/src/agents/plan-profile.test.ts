import { describe, expect, it } from 'vitest';
import { createPlanAgent } from './deepagent-profiles.js';
import { createGeminiModel } from './deepagent-models.js';
import { tripPlannerSystemPrompt, loadWorkspaceResources } from './workspace-loader.js';

describe('plan profile', () => {
  it('creates a plan agent without throwing', () => {
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-key';
    const prompt = tripPlannerSystemPrompt(loadWorkspaceResources());
    const agent = createPlanAgent(prompt, createGeminiModel());
    expect(agent).toBeDefined();
    expect(typeof agent.invoke).toBe('function');
  });
});
