import type { ActivityEvent } from '../../shared/activity';
import type { OrchestrationPlan } from '../../shared/chat';

/** User override: force done, or force pending (suppresses SDK-suggested done). */
export type ManualCheckState = 'done' | 'pending';

const STEP_SNIPPET_MAX = 120;
const MIN_STEP_SNIPPET_LEN = 12;
const MIN_NODE_TOKEN_LEN = 2;

export function normalizeChecklistText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Concatenate searchable text from activity events used for completion hints.
 */
export function activityEventsSearchBlob(events: ActivityEvent[]): string {
  const parts: string[] = [];
  for (const ev of events) {
    switch (ev.kind) {
      case 'task_started':
      case 'task_progress':
      case 'task_completed':
        parts.push(
          ev.description,
          'summary' in ev && ev.summary ? ev.summary : '',
          'lastToolName' in ev && ev.lastToolName ? ev.lastToolName : '',
        );
        break;
      case 'tool_use_summary':
        parts.push(ev.summary);
        break;
      default:
        break;
    }
  }
  return normalizeChecklistText(parts.filter(Boolean).join(' '));
}

export type SuggestedCompletions = {
  suggestedSteps: Set<number>;
  suggestedNodes: Set<string>;
};

/**
 * Full re-reduce: which steps / nodes appear referenced in SDK activity text (best-effort).
 */
export function computeSuggestedCompletions(
  plan: OrchestrationPlan,
  activityLog: ActivityEvent[],
): SuggestedCompletions {
  const blob = activityEventsSearchBlob(activityLog);
  const suggestedSteps = new Set<number>();
  const suggestedNodes = new Set<string>();

  plan.researchSteps.forEach((step, i) => {
    const raw = step.slice(0, STEP_SNIPPET_MAX);
    const snippet = normalizeChecklistText(raw);
    if (snippet.length >= MIN_STEP_SNIPPET_LEN && blob.includes(snippet)) {
      suggestedSteps.add(i);
    }
  });

  for (const n of plan.nodes) {
    const idN = normalizeChecklistText(n.id);
    const nameN = normalizeChecklistText(n.name);
    if (idN.length >= MIN_NODE_TOKEN_LEN && blob.includes(idN)) {
      suggestedNodes.add(n.id);
    } else if (nameN.length >= MIN_NODE_TOKEN_LEN && blob.includes(nameN)) {
      suggestedNodes.add(n.id);
    }
  }

  return { suggestedSteps, suggestedNodes };
}

export function isStepDisplayDone(
  index: number,
  suggested: Set<number>,
  manual: Record<number, ManualCheckState | undefined>,
): boolean {
  if (manual[index] === 'done') {
    return true;
  }
  if (manual[index] === 'pending') {
    return false;
  }
  return suggested.has(index);
}

export function isNodeDisplayDone(
  nodeId: string,
  suggested: Set<string>,
  manual: Record<string, ManualCheckState | undefined>,
): boolean {
  if (manual[nodeId] === 'done') {
    return true;
  }
  if (manual[nodeId] === 'pending') {
    return false;
  }
  return suggested.has(nodeId);
}

export type CompletionBadge = 'manual' | 'sdk' | null;

export function stepCompletionBadge(
  index: number,
  displayDone: boolean,
  suggested: Set<number>,
  manual: Record<number, ManualCheckState | undefined>,
): CompletionBadge {
  if (!displayDone) {
    return null;
  }
  if (manual[index] === 'done') {
    return 'manual';
  }
  if (suggested.has(index)) {
    return 'sdk';
  }
  return null;
}

export function nodeCompletionBadge(
  nodeId: string,
  displayDone: boolean,
  suggested: Set<string>,
  manual: Record<string, ManualCheckState | undefined>,
): CompletionBadge {
  if (!displayDone) {
    return null;
  }
  if (manual[nodeId] === 'done') {
    return 'manual';
  }
  if (suggested.has(nodeId)) {
    return 'sdk';
  }
  return null;
}

/** Checkbox toggled to checked -> manual done; unchecked -> manual pending (suppresses SDK). */
export function manualFromCheckboxChecked(checked: boolean): ManualCheckState {
  return checked ? 'done' : 'pending';
}
