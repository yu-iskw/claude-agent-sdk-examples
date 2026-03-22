import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { concatenateAssistantText } from '../server/assistant-text.js';
import {
  extractJsonFenceBlock,
  parseOrchestrationFromAssistantText,
  stripOrchestrationJsonFence,
  validateOrchestrationPlan,
} from './orchestration.js';

const validPlan = {
  version: 1,
  title: 'Test',
  researchSteps: ['step a', 'step b'],
  nodes: [
    { id: 'a', kind: 'agent' as const, name: 'agent-a' },
    { id: 'b', kind: 'skill' as const, name: 'skill-b', description: 'd' },
  ],
  edges: [{ from: 'a', to: 'b', label: 'uses' }],
};

function assistantMsg(text: string): Extract<SDKMessage, { type: 'assistant' }> {
  return {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
    },
  } as Extract<SDKMessage, { type: 'assistant' }>;
}

describe('orchestration parsing', () => {
  it('extracts fenced json', () => {
    const text = 'Hello\n\n```json\n{"version": 1}\n```\n';
    expect(extractJsonFenceBlock(text)).toBe('{"version": 1}');
  });

  it('strips fenced json for display', () => {
    const text = 'Plan here.\n\n```json\n{"x":1}\n```';
    expect(stripOrchestrationJsonFence(text)).toBe('Plan here.');
  });

  it('validates a well-formed plan', () => {
    expect(validateOrchestrationPlan(validPlan)).toEqual(validPlan);
  });

  it('rejects invalid plan shapes', () => {
    expect(validateOrchestrationPlan(null)).toBeNull();
    expect(validateOrchestrationPlan({ version: 2 })).toBeNull();
    expect(
      validateOrchestrationPlan({
        version: 1,
        researchSteps: 'nope',
        nodes: [],
        edges: [],
      }),
    ).toBeNull();
  });

  it('parses orchestration from assistant text with fence', () => {
    const text = `Some plan prose.

\`\`\`json
${JSON.stringify(validPlan)}
\`\`\``;
    const { orchestration, parseWarning } = parseOrchestrationFromAssistantText(text);
    expect(parseWarning).toBeUndefined();
    expect(orchestration).toEqual(validPlan);
  });

  it('returns warning when fence is missing', () => {
    const { orchestration, parseWarning } = parseOrchestrationFromAssistantText('no json here');
    expect(orchestration).toBeNull();
    expect(parseWarning).toContain('No valid orchestration JSON found');
  });

  it('parses orchestration from an untagged fence when JSON validates', () => {
    const text = `Intro.\n\n\`\`\`\n${JSON.stringify(validPlan)}\n\`\`\``;
    const { orchestration, parseWarning } = parseOrchestrationFromAssistantText(text);
    expect(parseWarning).toBeUndefined();
    expect(orchestration).toEqual(validPlan);
  });

  it('strips a validated untagged orchestration fence for display', () => {
    const text = `Plan.\n\n\`\`\`\n${JSON.stringify(validPlan)}\n\`\`\``;
    expect(stripOrchestrationJsonFence(text)).toBe('Plan.');
  });

  it('returns warning when json is invalid', () => {
    const text = '```json\nnot-json\n```';
    const { orchestration, parseWarning } = parseOrchestrationFromAssistantText(text);
    expect(orchestration).toBeNull();
    expect(parseWarning).toMatch(/Failed to parse JSON/);
  });
});

describe('concatenateAssistantText with orchestration parsing', () => {
  it('joins multiple assistant turns so orchestration in an earlier turn is visible', () => {
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
    expect(orchestration?.title).toBe('Test');
  });
});
