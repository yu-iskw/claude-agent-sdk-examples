/**
 * session-manager.ts
 *
 * Thin wrapper over the Claude Agent SDK session APIs:
 *   - listSessions()       → list past conversations
 *   - getSessionMessages() → read message history
 *
 * Uses process.cwd() as the session directory so sessions are scoped to
 * this package workspace (packages/chatbot-agent-sdk-demo/).
 */

import {
  listSessions,
  getSessionMessages,
  type SDKSessionInfo,
  type SessionMessage,
} from "@anthropic-ai/claude-agent-sdk";

const SESSION_DIR = process.cwd();

export interface SessionSummary {
  sessionId: string;
  summary: string;
  lastModified: number;
  cwd: string | undefined;
  gitBranch: string | undefined;
  firstPrompt: string | undefined;
}

/**
 * List recent sessions scoped to this package's working directory.
 */
export async function getSessions(
  limit = 20
): Promise<SessionSummary[]> {
  const sessions: SDKSessionInfo[] = await listSessions({
    dir: SESSION_DIR,
    limit,
  });

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    summary: s.summary,
    lastModified: s.lastModified,
    cwd: s.cwd,
    gitBranch: s.gitBranch,
    firstPrompt: s.firstPrompt,
  }));
}

/**
 * Retrieve message history for a specific session.
 */
export async function getHistory(
  sessionId: string,
  limit = 50
): Promise<SessionMessage[]> {
  return getSessionMessages(sessionId, {
    dir: SESSION_DIR,
    limit,
  });
}
