import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Package root for this app workspace (used as `cwd` and `.mcp.json` base).
export const appRoot = path.resolve(currentDir, '..', '..');
export const claudeWorkspace = appRoot;
