import fs from 'node:fs';
import path from 'node:path';
import { AIMessage, HumanMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { randomUUID } from 'node:crypto';
import { deepAgentWorkspace } from '../shared/workspace.js';

const sessionDir = path.join(deepAgentWorkspace, '.deep-agent', 'sessions');
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let checkpointer: MemorySaver | undefined;
let sessionDirReady = false;

function ensureSessionDir(): void {
  if (sessionDirReady) {
    return;
  }
  fs.mkdirSync(sessionDir, { recursive: true });
  sessionDirReady = true;
}

export function getSharedCheckpointer(): MemorySaver {
  if (!checkpointer) {
    checkpointer = new MemorySaver();
  }
  return checkpointer;
}

export function createThreadId(): string {
  return randomUUID();
}

export function assertValidSessionId(sessionId: string): void {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    throw new Error('execute phase requires a sessionId from the plan phase.');
  }
  if (!SESSION_ID_PATTERN.test(trimmed)) {
    throw new Error('sessionId must be a valid UUID from the plan phase.');
  }
}

export function assertExecuteSession(sessionId: string): void {
  assertValidSessionId(sessionId);
  const filePath = sessionFilePath(sessionId.trim());
  const resolvedDir = path.resolve(sessionDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error('sessionId resolves outside the session store.');
  }
  if (!fs.existsSync(resolvedFile)) {
    throw new Error(
      `Unknown sessionId "${sessionId}". Run agent:plan first in this workspace (sessions persist under .deep-agent/sessions/).`,
    );
  }
}

export function threadConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

function sessionFilePath(threadId: string): string {
  return path.join(sessionDir, `${threadId}.json`);
}

type SerializedMessage = {
  type: string;
  content: unknown;
  toolCallId?: string;
};

export function saveSessionMessages(threadId: string, messages: BaseMessage[]): void {
  ensureSessionDir();
  const payload = messages.map((message) => ({
    type: message.getType(),
    content: message.content,
    ...(message.getType() === 'tool' && 'tool_call_id' in message
      ? { toolCallId: (message as ToolMessage).tool_call_id }
      : {}),
  }));
  fs.writeFileSync(sessionFilePath(threadId), JSON.stringify(payload), 'utf8');
}

export function loadSessionMessages(threadId: string): SerializedMessage[] {
  assertValidSessionId(threadId);
  const filePath = sessionFilePath(threadId.trim());
  const resolvedDir = path.resolve(sessionDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error('sessionId resolves outside the session store.');
  }
  const raw = fs.readFileSync(resolvedFile, 'utf8');
  return JSON.parse(raw) as SerializedMessage[];
}

export function serializedToLangChainMessages(messages: SerializedMessage[]): BaseMessage[] {
  return messages.map((message) => {
    if (message.type === 'human') {
      return new HumanMessage(
        typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      );
    }
    if (message.type === 'ai') {
      return new AIMessage(
        typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      );
    }
    if (message.type === 'tool') {
      return new ToolMessage({
        content:
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        tool_call_id: message.toolCallId ?? 'unknown',
      });
    }
    return new HumanMessage(String(message.content));
  });
}
