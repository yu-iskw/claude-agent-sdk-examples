import type { ChatResponse } from './chat.js';

/** Max items embedded per list on an activity event (rest counted in *Total fields). */
export const ACTIVITY_LIST_CAP = 40;

/** Max length for free-text fields on activity events. */
export const ACTIVITY_TEXT_CAP = 240;

export function truncateList<T>(arr: T[], cap = ACTIVITY_LIST_CAP): { shown: T[]; total: number } {
  return { shown: arr.slice(0, cap), total: arr.length };
}

export function truncateText(s: string, max = ACTIVITY_TEXT_CAP): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

type ActivityBase = { version: 1; ts: number };

export type ActivitySessionInitEvent = ActivityBase & {
  kind: 'session_init';
  agents: string[];
  agentsTotal: number;
  skills: string[];
  skillsTotal: number;
  tools: string[];
  toolsTotal: number;
  mcpServers: Array<{ name: string; status: string }>;
  permissionMode: string;
  model?: string;
};

export type ActivityTaskStartedEvent = ActivityBase & {
  kind: 'task_started';
  taskId: string;
  description: string;
  taskType?: string;
  toolUseId?: string;
};

export type ActivityTaskProgressEvent = ActivityBase & {
  kind: 'task_progress';
  taskId: string;
  description: string;
  lastToolName?: string;
  summary?: string;
  toolUseId?: string;
  durationMs?: number;
  toolUses?: number;
};

export type ActivityTaskCompletedEvent = ActivityBase & {
  kind: 'task_completed';
  taskId: string;
  status: 'completed' | 'failed' | 'stopped';
  summary: string;
  toolUseId?: string;
};

export type ActivityToolProgressEvent = ActivityBase & {
  kind: 'tool_progress';
  toolName: string;
  toolUseId: string;
  elapsedSeconds: number;
  taskId?: string;
};

export type ActivityToolUseSummaryEvent = ActivityBase & {
  kind: 'tool_use_summary';
  summary: string;
};

export type ActivityStatusEvent = ActivityBase & {
  kind: 'status';
  status: 'compacting' | 'idle';
};

export type ActivityEvent =
  | ActivitySessionInitEvent
  | ActivityTaskStartedEvent
  | ActivityTaskProgressEvent
  | ActivityTaskCompletedEvent
  | ActivityToolProgressEvent
  | ActivityToolUseSummaryEvent
  | ActivityStatusEvent;

export type ChatSseActivityEnvelope = { type: 'activity'; event: ActivityEvent };
export type ChatSseDoneEnvelope = { type: 'done'; response: ChatResponse };
export type ChatSseErrorEnvelope = { type: 'error'; error: string };
export type ChatSseEnvelope = ChatSseActivityEnvelope | ChatSseDoneEnvelope | ChatSseErrorEnvelope;
