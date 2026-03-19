import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const appRoot = path.resolve(currentDir, '..', '..');
export const claudeWorkspace = appRoot;
export const clientBuildDir = path.join(appRoot, 'dist', 'client');
export const serverPort = Number(process.env.PORT ?? 8787);
