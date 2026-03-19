import type { ChatRequest, ChatResponse } from '../shared/chat.js';
import { claudeWorkspace } from '../shared/workspace.js';

type BuildTraceArgs = {
  phase: ChatRequest['phase'];
  parseWarning?: string;
  mcpServers: string[];
  initExtras?: Pick<
    ChatResponse['trace'],
    'availableAgents' | 'availableSkills' | 'sessionModel' | 'sessionPermissionMode'
  >;
};

export function buildTrace({
  phase,
  parseWarning,
  mcpServers,
  initExtras,
}: BuildTraceArgs): ChatResponse['trace'] {
  return {
    workspace: claudeWorkspace,
    sandboxed: true,
    loadedProjectConfig: true,
    activeAgent: 'trip-planner',
    mcpServers,
    phase,
    ...(parseWarning ? { parseWarning } : {}),
    ...(initExtras ?? {}),
  };
}
