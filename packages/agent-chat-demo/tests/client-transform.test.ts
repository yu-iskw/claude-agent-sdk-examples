import { describe, expect, it } from 'vitest';
import type { ChatResponse, OrchestrationPlan } from '../src/shared/chat';
import {
  executeResponseToAssistantMessage,
  formatBackendCompletionError,
  formatExecuteError,
  planResponseToChatUpdates,
} from '../src/client/chat/transform';

const validPlan: OrchestrationPlan = {
  version: 1,
  title: 'Test',
  researchSteps: ['step a', 'step b'],
  nodes: [
    { id: 'a', kind: 'agent', name: 'agent-a' },
    { id: 'b', kind: 'skill', name: 'skill-b', description: 'd' },
  ],
  edges: [{ from: 'a', to: 'b', label: 'uses' }],
};

function baseTrace(overrides?: Partial<ChatResponse['trace']>): ChatResponse['trace'] {
  return {
    workspace: '/tmp/ws',
    sandboxed: true,
    loadedProjectConfig: true,
    activeAgent: 'trip-planner',
    mcpServers: ['context7'],
    phase: 'plan',
    ...overrides,
  };
}

function baseResponse(overrides: Partial<ChatResponse> & { reply: string }): ChatResponse {
  return {
    reply: overrides.reply,
    sessionId: overrides.sessionId,
    orchestration: overrides.orchestration,
    trace: overrides.trace ?? baseTrace(),
  } as ChatResponse;
}

describe('client chat transformers', () => {
  it('transforms plan response when display text exists', () => {
    const reply = `Plan narrative.\n\n\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\``;
    const response = baseResponse({
      reply,
      sessionId: 'session-123',
      orchestration: validPlan,
      trace: baseTrace(),
    });

    const { assistantMessage, planSessionId, planProse, planOrchestration } =
      planResponseToChatUpdates({ response, assistantMessageId: 'm1' });

    expect(assistantMessage.id).toBe('m1');
    expect(assistantMessage.role).toBe('assistant');
    expect(assistantMessage.text).toBe('Plan narrative.');
    expect(assistantMessage.plan?.orchestration).toEqual(validPlan);
    expect(assistantMessage.plan).not.toHaveProperty('parseWarning');

    expect(planSessionId).toBe('session-123');
    expect(planProse).toBe('Plan narrative.');
    expect(planOrchestration).toEqual(validPlan);
  });

  it('strips itinerary sections from orchestration-phase display prose', () => {
    const reply = [
      'Multi-City Trip Plan: NYC -> Chicago',
      '',
      '- Day 1: itinerary draft (should be removed)',
      '',
      'Research Approach & Assumptions',
      'Dates (assumed): June 8-22, 2026',
      '',
      'Flights',
      '- Flight option A (should be removed)',
      '',
      'Lodging',
      '- Hotel option B (should be removed)',
      '',
      '```json',
      JSON.stringify(validPlan),
      '```',
    ].join('\n');

    const response = baseResponse({
      reply,
      sessionId: 'session-999',
      orchestration: validPlan,
      trace: baseTrace(),
    });

    const { assistantMessage, planProse } = planResponseToChatUpdates({
      response,
      assistantMessageId: 'm-itinerary-strip',
    });

    expect(assistantMessage.text).toContain('Research Approach & Assumptions');
    expect(assistantMessage.text).not.toContain('Trip Plan');
    expect(assistantMessage.text).not.toContain('Flights');
    expect(assistantMessage.text).not.toContain('Lodging');

    // Sidebar prose should match what the user sees in the chat card.
    expect(planProse).toBe(assistantMessage.text);
  });

  it('strips itinerary sections when headings use markdown style', () => {
    const reply = [
      '## Trip Plan',
      '- itinerary bullets (removed)',
      '## Research Steps',
      '1) plan legs',
      '',
      '### Flights',
      '- flight option (removed)',
      '',
      '### Lodging',
      '- hotel option (removed)',
      '',
      '```json',
      JSON.stringify(validPlan),
      '```',
    ].join('\n');

    const response = baseResponse({
      reply,
      sessionId: 'session-1000',
      orchestration: validPlan,
      trace: baseTrace(),
    });

    const { assistantMessage } = planResponseToChatUpdates({
      response,
      assistantMessageId: 'm-itinerary-strip-md',
    });

    expect(assistantMessage.text).toContain('## Research Steps');
    expect(assistantMessage.text).not.toContain('## Trip Plan');
    expect(assistantMessage.text).not.toContain('### Flights');
    expect(assistantMessage.text).not.toContain('### Lodging');
  });

  it('uses empty-display fallback and preserves raw reply in sidebar prose', () => {
    const reply = `\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\``;
    const response = baseResponse({
      reply,
      sessionId: 'session-456',
      orchestration: validPlan,
      trace: baseTrace(),
    });

    const { assistantMessage, planSessionId, planProse } = planResponseToChatUpdates({
      response,
      assistantMessageId: 'm2',
    });

    expect(planSessionId).toBe('session-456');
    expect(assistantMessage.text).toBe(
      'Plan phase returned an empty message. Check the workspace panel for details.',
    );
    expect(planProse).toBe(reply);
  });

  it('propagates parseWarning from trace into message.plan', () => {
    const reply = `Plan narrative.\n\n\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\``;
    const response = baseResponse({
      reply,
      sessionId: 'session-789',
      orchestration: null,
      trace: baseTrace({ parseWarning: 'parse failed' }),
    });

    const { assistantMessage } = planResponseToChatUpdates({ response, assistantMessageId: 'm3' });

    expect(assistantMessage.plan?.orchestration).toBeNull();
    expect(assistantMessage.plan?.parseWarning).toBe('parse failed');
  });

  it('transforms execute response into assistant message', () => {
    const response = baseResponse({
      reply: 'Done.',
      orchestration: null,
      trace: baseTrace({ phase: 'execute' }),
    });

    const assistant = executeResponseToAssistantMessage({
      response,
      assistantMessageId: 'm4',
    });

    expect(assistant).toEqual({ id: 'm4', role: 'assistant', text: 'Done.' });
  });

  it('formats plan and execute error messages consistently', () => {
    expect(formatBackendCompletionError(new Error('nope'))).toBe(
      'The backend could not complete the request: nope',
    );
    expect(formatBackendCompletionError('nope')).toBe(
      'The backend could not complete the request: Unknown error',
    );

    expect(formatExecuteError(new Error('boom'))).toBe('Execution failed: boom');
    expect(formatExecuteError({})).toBe('Execution failed: Unknown error');
  });
});
