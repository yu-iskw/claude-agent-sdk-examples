import { describe, expect, it } from 'vitest';
import { appendSseBuffer, extractSseEnvelopes } from '../src/client/api/parseChatSse';
import type { ChatResponse } from '../src/shared/chat';

describe('parseChatSse', () => {
  it('extractSseEnvelopes parses one event per block', () => {
    const sample =
      'data: {"type":"activity","event":{"version":1,"kind":"status","ts":1,"status":"idle"}}\n\n';
    const { rest, envelopes } = extractSseEnvelopes(sample);
    expect(rest).toBe('');
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]).toEqual({
      type: 'activity',
      event: { version: 1, kind: 'status', ts: 1, status: 'idle' },
    });
  });

  it('extractSseEnvelopes leaves incomplete tail in rest', () => {
    const { rest, envelopes } = extractSseEnvelopes('data: {"type":"done"');
    expect(envelopes).toHaveLength(0);
    expect(rest).toBe('data: {"type":"done"');
  });

  it('extractSseEnvelopes handles multiple blocks in one buffer', () => {
    const trace = {
      workspace: '/w',
      sandboxed: true,
      loadedProjectConfig: true,
      activeAgent: 'trip-planner',
      mcpServers: [],
      phase: 'plan' as const,
    };
    const response: ChatResponse = { reply: 'hi', trace };
    const buf =
      'data: {"type":"activity","event":{"version":1,"kind":"tool_use_summary","ts":2,"summary":"x"}}\n\n' +
      `data: ${JSON.stringify({ type: 'done', response })}\n\n`;
    const { rest, envelopes } = extractSseEnvelopes(buf);
    expect(rest).toBe('');
    expect(envelopes).toHaveLength(2);
    expect(envelopes[1]).toEqual({ type: 'done', response });
  });

  it('appendSseBuffer caps extremely long buffers', () => {
    const huge = 'x'.repeat(100);
    const buf = appendSseBuffer('y'.repeat(2_000_000), huge);
    expect(buf.length).toBeLessThanOrEqual(2_000_000);
  });
});
