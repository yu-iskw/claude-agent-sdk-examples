import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deepAgentWorkspace } from '../shared/workspace.js';

describe('deepagent workspace assets', () => {
  it('has required workspace files', () => {
    expect(fs.existsSync(path.join(deepAgentWorkspace, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(deepAgentWorkspace, '.mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(deepAgentWorkspace, '.agents', 'settings.json'))).toBe(true);
    expect(
      fs.existsSync(path.join(deepAgentWorkspace, '.agents', 'agents', 'trip-planner.md')),
    ).toBe(true);
  });
});
