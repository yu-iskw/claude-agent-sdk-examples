import path from 'node:path';
import { appRoot, claudeWorkspace } from '../shared/workspace.js';

export { appRoot, claudeWorkspace };
export const clientBuildDir = path.join(appRoot, 'dist', 'client');
export const serverPort = Number(process.env.PORT ?? 8787);
