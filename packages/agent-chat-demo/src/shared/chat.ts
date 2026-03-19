import type { OrchestrationPlan } from './orchestration.js';

export type { OrchestrationPlan, OrchestrationNode, OrchestrationEdge } from './orchestration.js';
export { stripOrchestrationJsonFence } from './orchestration.js';

export type ChatPhase = 'plan' | 'execute';

/** Optional attachment for assistant plan turns; transcript uses `text` only on the server. */
export type ChatPlanAttachment = {
  orchestration: OrchestrationPlan | null;
  /** Snapshot when orchestration JSON failed to parse (show in-chat + sidebar). */
  parseWarning?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  /** Markdown/plain body; for plan turns, prose only (no JSON fence). */
  text: string;
  plan?: ChatPlanAttachment;
};

export type ChatRequest = {
  phase: ChatPhase;
  /** Required when phase is `execute` (session from plan phase). */
  sessionId?: string;
  message: string;
  history: ChatMessage[];
};

export type ChatTrace = {
  workspace: string;
  sandboxed: boolean;
  loadedProjectConfig: boolean;
  activeAgent: string;
  mcpServers: string[];
  phase: ChatPhase;
  parseWarning?: string;
  /** From SDK `system/init` when present (available subagents). */
  availableAgents?: string[];
  /** From SDK `system/init` when present (skill names loaded for the session). */
  availableSkills?: string[];
  /** From SDK `system/init` when present. */
  sessionModel?: string;
  /** From SDK `system/init` when present (e.g. plan, dontAsk). */
  sessionPermissionMode?: string;
};

export type ChatResponse = {
  reply: string;
  sessionId?: string;
  orchestration?: OrchestrationPlan | null;
  trace: ChatTrace;
};
