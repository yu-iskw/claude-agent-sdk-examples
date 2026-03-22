import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { concatenateAssistantText } from './assistant-text.js';

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

  it('preserves order: narrative after fence in a later turn still appends after JSON block', () => {
    const messages: SDKMessage[] = [assistantMsg('Part one.'), assistantMsg('Part two.')];
    expect(concatenateAssistantText(messages)).toBe('Part one.\n\nPart two.');
  });
});
