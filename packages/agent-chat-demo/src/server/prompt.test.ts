import { describe, expect, it } from 'vitest';
import { buildPrompt } from './prompt.js';
import type { ChatRequest } from '../shared/chat';

function historyWithMessages(count: number) {
  const history = [];
  for (let i = 0; i < count; i++) {
    history.push({
      id: `m${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `msg${i}`,
    });
  }
  return history;
}

describe('server prompt builder', () => {
  it('includes plan-phase instructions and only the last 6 transcript messages', () => {
    const request: ChatRequest = {
      phase: 'plan',
      message: 'LATEST',
      history: historyWithMessages(10),
    };

    const prompt = buildPrompt(request);

    expect(prompt).toContain('You are in PLAN PHASE only');
    expect(prompt).toContain('Latest user message:\nLATEST');
    expect(prompt).toContain('Recent transcript:\n');

    // Last 6 are indices 4..9: 4(user),5(assistant),6(user),7(assistant),8(user),9(assistant)
    expect(prompt).toContain('USER: msg4');
    expect(prompt).toContain('ASSISTANT: msg5');
    expect(prompt).toContain('USER: msg6');
    expect(prompt).toContain('ASSISTANT: msg7');
    expect(prompt).toContain('USER: msg8');
    expect(prompt).toContain('ASSISTANT: msg9');

    // Earlier messages must not appear in transcript
    expect(prompt).not.toContain('USER: msg0');
    expect(prompt).not.toContain('ASSISTANT: msg1');
  });

  it('includes execute preamble and uses the empty-message user-line variant', () => {
    const request: ChatRequest = {
      phase: 'execute',
      message: '',
      history: historyWithMessages(10),
    };

    const prompt = buildPrompt(request);

    expect(prompt).toContain('Execute the approved plan.');
    expect(prompt).toContain(
      'Proceed with Task delegation to flight-researcher, hotel-researcher, and weather-forecaster',
    );
    expect(prompt).toContain('Latest user message: (none — continue from session context.)');
    expect(prompt).toContain('Weather Forecast');
    expect(prompt).toContain('Recent transcript:\n');

    // Still only last 6 transcript messages
    expect(prompt).toContain('USER: msg4');
    expect(prompt).not.toContain('USER: msg0');
  });
});
