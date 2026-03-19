import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '../src/shared/activity';
import type { OrchestrationPlan } from '../src/shared/chat';
import {
  activityEventsSearchBlob,
  computeSuggestedCompletions,
  isNodeDisplayDone,
  isStepDisplayDone,
  manualFromCheckboxChecked,
  nodeCompletionBadge,
  normalizeChecklistText,
  stepCompletionBadge,
} from '../src/client/chat/orchestrationChecklist';

const fixedTs = 1_700_000_000_000;

const samplePlan: OrchestrationPlan = {
  version: 1,
  title: 'T',
  researchSteps: [
    'Normalize party size and budget before researching flights.',
    'Second step that will not appear in activity.',
  ],
  nodes: [
    { id: 'flight-researcher', kind: 'agent', name: 'flight-researcher' },
    { id: 'other-node', kind: 'stage', name: 'other' },
  ],
  edges: [],
};

function taskCompleted(summary: string, description = 'd'): ActivityEvent {
  return {
    version: 1,
    ts: fixedTs,
    kind: 'task_completed',
    taskId: 't1',
    status: 'completed',
    summary,
    description,
  };
}

describe('normalizeChecklistText', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeChecklistText('  Foo\n\tBar  ')).toBe('foo bar');
  });
});

describe('activityEventsSearchBlob', () => {
  it('joins task and tool summary fields', () => {
    const blob = activityEventsSearchBlob([
      taskCompleted('done with flight-researcher'),
      { version: 1, ts: fixedTs, kind: 'tool_use_summary', summary: 'used bash' },
    ]);
    expect(blob).toContain('flight-researcher');
    expect(blob).toContain('bash');
  });
});

describe('computeSuggestedCompletions', () => {
  it('marks step when snippet appears in activity blob', () => {
    const events: ActivityEvent[] = [
      taskCompleted(
        'subagent finished normalize party size and budget before researching flights. flight-researcher done',
      ),
    ];
    const { suggestedSteps, suggestedNodes } = computeSuggestedCompletions(samplePlan, events);
    expect(suggestedSteps.has(0)).toBe(true);
    expect(suggestedSteps.has(1)).toBe(false);
    expect(suggestedNodes.has('flight-researcher')).toBe(true);
    expect(suggestedNodes.has('other-node')).toBe(false);
  });
});

describe('manual overrides', () => {
  const suggested = new Set([0]);

  it('pending suppresses suggested done', () => {
    expect(isStepDisplayDone(0, suggested, { 0: 'pending' })).toBe(false);
  });

  it('done forces true without suggested', () => {
    expect(isStepDisplayDone(1, suggested, { 1: 'done' })).toBe(true);
  });

  it('manualFromCheckboxChecked', () => {
    expect(manualFromCheckboxChecked(true)).toBe('done');
    expect(manualFromCheckboxChecked(false)).toBe('pending');
  });
});

describe('badges', () => {
  it('stepCompletionBadge manual when user marked done', () => {
    expect(stepCompletionBadge(0, true, new Set([0]), { 0: 'done' })).toBe('manual');
  });

  it('stepCompletionBadge sdk when only suggested', () => {
    expect(stepCompletionBadge(0, true, new Set([0]), {})).toBe('sdk');
  });

  it('nodeCompletionBadge', () => {
    expect(nodeCompletionBadge('n1', true, new Set(['n1']), {})).toBe('sdk');
    expect(nodeCompletionBadge('n1', true, new Set(['n1']), { n1: 'done' })).toBe('manual');
  });
});

describe('isNodeDisplayDone', () => {
  it('matches suggested by node id', () => {
    expect(isNodeDisplayDone('flight-researcher', new Set(['flight-researcher']), {})).toBe(true);
  });
});
