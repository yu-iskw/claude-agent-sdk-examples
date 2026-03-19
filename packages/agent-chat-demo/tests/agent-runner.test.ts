import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TRIP_PLANNER_ALLOWED_DOMAINS } from '../src/server/agent-runner.js';

const appRoot = path.resolve(import.meta.dirname, '..');

describe('agent chat demo workspace assets', () => {
  it('ships the local .mcp.json with the Context7 plugin', () => {
    const config = JSON.parse(fs.readFileSync(path.join(appRoot, '.mcp.json'), 'utf8')) as Record<
      string,
      { command: string }
    >;
    expect(config.context7.command).toBe('npx');
  });

  it('declares project settings so the SDK can load CLAUDE.md and .claude resources', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(appRoot, '.claude', 'settings.json'), 'utf8'),
    ) as Record<string, unknown> & {
      permissions: { allow: string[]; deny: string[] };
      env: Record<string, string>;
    };
    expect(settings.permissions.allow).toContain('Read');
    expect(settings.permissions.allow).toContain('WebFetch(*)');
    expect(settings.permissions.deny).not.toContain('WebFetch(*)');
    expect('sandbox' in settings).toBe(false);
    expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
  });

  it('keeps sandbox egress allowlist in agent-runner (single source of truth)', () => {
    expect(TRIP_PLANNER_ALLOWED_DOMAINS).toContain('kayak.com');
    expect(TRIP_PLANNER_ALLOWED_DOMAINS).toContain('docs.anthropic.com');
  });
});
