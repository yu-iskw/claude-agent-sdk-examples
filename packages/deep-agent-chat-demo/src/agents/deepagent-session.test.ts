import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import {
  assertExecuteSession,
  assertValidSessionId,
  saveSessionMessages,
  serializedToLangChainMessages,
} from './deepagent-session.js';
import { createThreadId } from './deepagent-session.js';
import fs from 'node:fs';
import path from 'node:path';
import { deepAgentWorkspace } from '../shared/workspace.js';

describe('deepagent-session', () => {
  it('rejects path traversal in sessionId', () => {
    expect(() => assertValidSessionId('../etc/passwd')).toThrow(/valid UUID/);
    expect(() => assertExecuteSession('../../../etc/passwd')).toThrow();
  });

  it('round-trips human and ai messages', () => {
    const threadId = createThreadId();
    const messages = [new HumanMessage('hello'), new AIMessage('world')];
    saveSessionMessages(threadId, messages);
    const restored = serializedToLangChainMessages(
      JSON.parse(
        fs.readFileSync(
          path.join(deepAgentWorkspace, '.deep-agent', 'sessions', `${threadId}.json`),
          'utf8',
        ),
      ),
    );
    expect(restored).toHaveLength(2);
    expect(restored[0].getType()).toBe('human');
    expect(restored[1].getType()).toBe('ai');
  });
});
