import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { concatenateAssistantText } from '../src/server/assistant-text.js';
import { parseOrchestrationFromAssistantText } from '../src/shared/orchestration.js';

function assistantMsg(text: string): Extract<SDKMessage, { type: 'assistant' }> {
  return {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
    },
  } as Extract<SDKMessage, { type: 'assistant' }>;
}

describe('concatenateAssistantText', () => {
  it('returns fallback when there are no assistant messages', () => {
    expect(concatenateAssistantText([])).toBe('No assistant response was generated.');
  });

  it('joins multiple assistant turns so orchestration in an earlier turn is visible', () => {
    const validPlan = {
      version: 1,
      title: 'T',
      researchSteps: ['a'],
      nodes: [{ id: 'x', kind: 'agent' as const, name: 'trip-planner' }],
      edges: [] as { from: string; to: string }[],
    };
    const fence = ['', '```json', JSON.stringify(validPlan), '```'].join('\n');
    const messages: SDKMessage[] = [
      assistantMsg(`Here is the plan narrative.\n\n${fence}`),
      assistantMsg('Done.'),
    ];
    const combined = concatenateAssistantText(messages);
    expect(combined).toContain('```json');
    expect(combined).toContain('"version":1');
    expect(combined).toContain('Here is the plan narrative');
    expect(combined).toContain('Done.');
    const { orchestration, parseWarning } = parseOrchestrationFromAssistantText(combined);
    expect(parseWarning).toBeUndefined();
    expect(orchestration?.title).toBe('T');
  });

  it('preserves order: narrative after fence in a later turn still appends after JSON block', () => {
    const messages: SDKMessage[] = [assistantMsg('Part one.'), assistantMsg('Part two.')];
    expect(concatenateAssistantText(messages)).toBe('Part one.\n\nPart two.');
  });
});
