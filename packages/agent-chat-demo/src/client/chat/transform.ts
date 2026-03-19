import type { ChatMessage, ChatResponse, OrchestrationPlan } from '../../shared/chat';
import { stripOrchestrationJsonFence } from '../../shared/chat';

const PLAN_EMPTY_FALLBACK_TEXT =
  'Plan phase returned an empty message. Check the workspace panel for details.';

/**
 * Defense-in-depth: the orchestration phase should not include final itinerary content.
 * We defensively strip any prose blocks that look like `Trip Plan`, `Flights`, or `Lodging`.
 *
 * This intentionally matches multiple formatting styles:
 * - Markdown headings like `### Trip Plan`
 * - Plain labels like `Multi-City Trip Plan: ...`
 */
function stripItinerarySectionsForOrchestration(text: string): string {
  const lines = text.split(/\r?\n/);

  const tripPlanStart = /^(?:#{1,6}\s*)?(?:Multi[-\s]?City\s+)?Trip\s+Plan\s*:?.*$/i;
  const flightsStart = /^(?:#{1,6}\s*)?Flights\s*:?.*$/i;
  const lodgingStart = /^(?:#{1,6}\s*)?Lodging\s*:?.*$/i;

  const isStripSectionStart = (line: string): boolean => {
    const t = line.trim();
    return tripPlanStart.test(t) || flightsStart.test(t) || lodgingStart.test(t);
  };

  const orchestrationBoundaryLabels =
    /^(?:Research Approach\b|Research Steps\b|Follow[-\s]up Questions\b|Task Logs\b)/i;
  const markdownHeading = /^#{1,6}\s+\S/;

  const out: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (!skipping) {
      if (isStripSectionStart(line)) {
        skipping = true;
        continue;
      }
      out.push(line);
      continue;
    }

    // If another itinerary section starts, keep skipping until we hit an orchestration boundary.
    if (isStripSectionStart(line)) {
      continue;
    }

    // Stop skipping at the next orchestration-appropriate heading/label.
    const boundary = orchestrationBoundaryLabels.test(line.trim()) || markdownHeading.test(line);
    if (boundary) {
      skipping = false;
      out.push(line);
      continue;
    }
    // Otherwise keep skipping itinerary content.
  }

  return out.join('\n').trim();
}

type PlanResponseToChatUpdatesArgs = {
  response: ChatResponse;
  assistantMessageId: string;
};

export function planResponseToChatUpdates({
  response,
  assistantMessageId,
}: PlanResponseToChatUpdatesArgs): {
  assistantMessage: ChatMessage;
  planSessionId: string | null;
  planProse: string;
  planOrchestration: OrchestrationPlan | null;
} {
  const display = stripOrchestrationJsonFence(response.reply).trim();
  const displayStripped = stripItinerarySectionsForOrchestration(display);
  const assistantText = displayStripped.length > 0 ? displayStripped : PLAN_EMPTY_FALLBACK_TEXT;
  const parseWarning = response.trace.parseWarning;

  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: 'assistant',
    text: assistantText,
    plan: {
      orchestration: response.orchestration ?? null,
      ...(parseWarning ? { parseWarning } : {}),
    },
  };

  return {
    assistantMessage,
    planSessionId: response.sessionId ?? null,
    planProse: displayStripped.length > 0 ? displayStripped : response.reply,
    planOrchestration: response.orchestration ?? null,
  };
}

type ExecuteResponseToAssistantMessageArgs = {
  response: ChatResponse;
  assistantMessageId: string;
};

export function executeResponseToAssistantMessage({
  response,
  assistantMessageId,
}: ExecuteResponseToAssistantMessageArgs): ChatMessage {
  return {
    id: assistantMessageId,
    role: 'assistant',
    text: response.reply,
  };
}

export function formatBackendCompletionError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return `The backend could not complete the request: ${message}`;
}

export function formatExecuteError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return `Execution failed: ${message}`;
}
