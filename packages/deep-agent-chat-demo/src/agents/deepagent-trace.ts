import type { ChatRequest, ChatResponse } from '../shared/chat.js';
import { deepAgentWorkspace } from '../shared/workspace.js';

type BuildTraceArgs = {
  phase: ChatRequest['phase'];
  parseWarning?: string;
  mcpServers: string[];
  availableAgents?: string[];
  availableSkills?: string[];
  sessionModel?: string;
  sessionPermissionMode?: string;
};

export function buildTrace({
  phase,
  parseWarning,
  mcpServers,
  availableAgents,
  availableSkills,
  sessionModel,
  sessionPermissionMode,
}: BuildTraceArgs): ChatResponse['trace'] {
  return {
    workspace: deepAgentWorkspace,
    sandboxed: false,
    loadedProjectConfig: true,
    activeAgent: 'trip-planner',
    mcpServers,
    phase,
    ...(parseWarning ? { parseWarning } : {}),
    ...(availableAgents ? { availableAgents } : {}),
    ...(availableSkills ? { availableSkills } : {}),
    ...(sessionModel ? { sessionModel } : {}),
    ...(sessionPermissionMode ? { sessionPermissionMode } : {}),
  };
}
