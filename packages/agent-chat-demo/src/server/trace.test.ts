import { describe, expect, it } from 'vitest';
import { buildTrace } from './trace.js';
import { claudeWorkspace } from './config.js';

describe('server trace builder', () => {
  it('builds trace for plan phase with parseWarning', () => {
    const trace = buildTrace({
      phase: 'plan',
      parseWarning: 'parse failed',
      mcpServers: ['context7', 'other'],
    });

    expect(trace.workspace).toBe(claudeWorkspace);
    expect(trace.sandboxed).toBe(true);
    expect(trace.loadedProjectConfig).toBe(true);
    expect(trace.activeAgent).toBe('trip-planner');
    expect(trace.mcpServers).toEqual(['context7', 'other']);
    expect(trace.phase).toBe('plan');
    expect(trace.parseWarning).toBe('parse failed');
  });

  it('builds trace for execute phase without parseWarning', () => {
    const trace = buildTrace({
      phase: 'execute',
      mcpServers: ['context7'],
    });

    expect(trace.workspace).toBe(claudeWorkspace);
    expect(trace.phase).toBe('execute');
    expect(trace.mcpServers).toEqual(['context7']);
    expect(trace).not.toHaveProperty('parseWarning');
  });

  it('merges initExtras from SDK system/init when provided', () => {
    const trace = buildTrace({
      phase: 'plan',
      mcpServers: ['context7'],
      initExtras: {
        availableAgents: ['flight-researcher'],
        availableSkills: ['research-flight'],
        sessionModel: 'claude-test',
        sessionPermissionMode: 'plan',
      },
    });

    expect(trace.availableAgents).toEqual(['flight-researcher']);
    expect(trace.availableSkills).toEqual(['research-flight']);
    expect(trace.sessionModel).toBe('claude-test');
    expect(trace.sessionPermissionMode).toBe('plan');
  });
});
