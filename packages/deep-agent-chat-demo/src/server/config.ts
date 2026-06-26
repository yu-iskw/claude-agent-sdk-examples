import path from 'node:path';
import { appRoot, deepAgentWorkspace } from '../shared/workspace.js';

export { appRoot, deepAgentWorkspace };
export const clientBuildDir = path.join(appRoot, 'dist', 'client');
export const serverPort = Number(process.env.PORT ?? 8787);
