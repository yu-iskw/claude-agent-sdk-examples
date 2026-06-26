import { describe, expect, it } from 'vitest';
import { loadWorkspaceResources } from './workspace-loader.js';

describe('workspace-loader', () => {
  it('loads AGENTS.md, agents, skills, and settings', () => {
    const resources = loadWorkspaceResources();
    expect(resources.agentsMd.length).toBeGreaterThan(0);
    expect(resources.agentSpecs.map((spec) => spec.name)).toEqual(
      expect.arrayContaining([
        'trip-planner',
        'flight-researcher',
        'hotel-researcher',
        'weather-forecaster',
      ]),
    );
    expect(resources.skillNames).toEqual(
      expect.arrayContaining(['research-flight', 'research-hotel']),
    );
    expect(resources.settings).toBeTypeOf('object');
  });
});
