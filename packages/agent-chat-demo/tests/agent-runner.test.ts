import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

describe('agent chat demo workspace assets', () => {
  it('ships the local .mcp.json with the Context7 plugin', () => {
    const config = JSON.parse(fs.readFileSync(path.join(appRoot, '.mcp.json'), 'utf8')) as Record<string, { command: string }>;
    expect(config.context7.command).toBe('npx');
  });

  it('declares project settings so the SDK can load CLAUDE.md and .claude resources', () => {
    const settings = JSON.parse(fs.readFileSync(path.join(appRoot, '.claude', 'settings.json'), 'utf8')) as {
      permissions: { allow: string[] };
      sandbox: { enabled: boolean };
    };
    expect(settings.permissions.allow).toContain('Read');
    expect(settings.sandbox.enabled).toBe(true);
  });
});
