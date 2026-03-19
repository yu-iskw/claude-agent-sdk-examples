/**
 * Machine-readable orchestration graph emitted by trip-planner in plan phase (fenced JSON).
 */

export type OrchestrationNodeKind = 'agent' | 'skill' | 'stage';

export type OrchestrationNode = {
  id: string;
  kind: OrchestrationNodeKind;
  name: string;
  description?: string;
};

export type OrchestrationEdge = {
  from: string;
  to: string;
  label?: string;
};

export type OrchestrationPlan = {
  version: 1;
  title?: string;
  researchSteps: string[];
  nodes: OrchestrationNode[];
  edges: OrchestrationEdge[];
};

const JSON_FENCE = /```\s*json\s*([\s\S]*?)```/i;

/** Fenced code blocks: optional language tag, then body (used for orchestration fallbacks). */
const GENERIC_CODE_FENCE = /```\s*([\w-]*)\s*\n?([\s\S]*?)```/gi;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOrchestrationNodeKind(value: unknown): value is OrchestrationNodeKind {
  return value === 'agent' || value === 'skill' || value === 'stage';
}

/**
 * Extract the first ```json ... ``` fenced block from assistant text.
 */
export function extractJsonFenceBlock(text: string): string | null {
  const match = text.match(JSON_FENCE);
  if (!match?.[1]) {
    return null;
  }
  return match[1].trim();
}

/**
 * Prefer ```json ... ```; otherwise first generic ``` ... ``` body that parses to a valid
 * orchestration plan (models sometimes omit the `json` language tag).
 */
export function extractOrchestrationJsonCandidate(text: string): string | null {
  const jsonTagged = extractJsonFenceBlock(text);
  if (jsonTagged !== null) {
    return jsonTagged;
  }
  GENERIC_CODE_FENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = GENERIC_CODE_FENCE.exec(text)) !== null) {
    const lang = match[1]?.toLowerCase() ?? '';
    if (lang === 'json') {
      continue;
    }
    const body = match[2].trim();
    if (!body.startsWith('{')) {
      continue;
    }
    try {
      const raw = JSON.parse(body) as unknown;
      if (validateOrchestrationPlan(raw)) {
        return body;
      }
    } catch {
      /* try next fence */
    }
  }
  return null;
}

function stripFirstValidGenericOrchestrationFence(text: string): string {
  GENERIC_CODE_FENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = GENERIC_CODE_FENCE.exec(text)) !== null) {
    const lang = match[1]?.toLowerCase() ?? '';
    if (lang === 'json') {
      continue;
    }
    const body = match[2].trim();
    if (!body.startsWith('{')) {
      continue;
    }
    try {
      if (validateOrchestrationPlan(JSON.parse(body) as unknown)) {
        return text.slice(0, match.index) + text.slice(match.index + match[0].length);
      }
    } catch {
      /* next */
    }
  }
  return text;
}

/**
 * Remove orchestration fences for display (```json``` and validated generic ```...``` blocks).
 */
export function stripOrchestrationJsonFence(text: string): string {
  let t = text.replace(JSON_FENCE, '');
  t = stripFirstValidGenericOrchestrationFence(t);
  return t.trim();
}

export function validateOrchestrationPlan(data: unknown): OrchestrationPlan | null {
  if (!isRecord(data)) {
    return null;
  }
  if (data.version !== 1) {
    return null;
  }
  if (
    !Array.isArray(data.researchSteps) ||
    !data.researchSteps.every((s) => typeof s === 'string')
  ) {
    return null;
  }
  if (!Array.isArray(data.nodes)) {
    return null;
  }
  const nodes: OrchestrationNode[] = [];
  for (const n of data.nodes) {
    if (!isRecord(n)) {
      return null;
    }
    if (
      typeof n.id !== 'string' ||
      typeof n.name !== 'string' ||
      !isOrchestrationNodeKind(n.kind)
    ) {
      return null;
    }
    nodes.push({
      id: n.id,
      kind: n.kind,
      name: n.name,
      ...(typeof n.description === 'string' ? { description: n.description } : {}),
    });
  }
  if (!Array.isArray(data.edges)) {
    return null;
  }
  const edges: OrchestrationEdge[] = [];
  for (const e of data.edges) {
    if (!isRecord(e)) {
      return null;
    }
    if (typeof e.from !== 'string' || typeof e.to !== 'string') {
      return null;
    }
    edges.push({
      from: e.from,
      to: e.to,
      ...(typeof e.label === 'string' ? { label: e.label } : {}),
    });
  }
  return {
    version: 1,
    ...(typeof data.title === 'string' ? { title: data.title } : {}),
    researchSteps: data.researchSteps,
    nodes,
    edges,
  };
}

export type ParseOrchestrationResult = {
  orchestration: OrchestrationPlan | null;
  parseWarning?: string;
};

const NO_ORCHESTRATION_WARNING =
  'No valid orchestration JSON found. Use a ```json fenced block (preferred) or a generic code fence whose body is valid orchestration JSON.';

/**
 * Parse orchestration JSON from assistant reply (fenced block preferred).
 */
export function parseOrchestrationFromAssistantText(text: string): ParseOrchestrationResult {
  const fenced = extractOrchestrationJsonCandidate(text);
  if (!fenced) {
    return {
      orchestration: null,
      parseWarning: NO_ORCHESTRATION_WARNING,
    };
  }
  try {
    const raw = JSON.parse(fenced) as unknown;
    const plan = validateOrchestrationPlan(raw);
    if (!plan) {
      return {
        orchestration: null,
        parseWarning:
          'Orchestration JSON did not match the expected schema (version, researchSteps, nodes, edges).',
      };
    }
    return { orchestration: plan };
  } catch {
    return {
      orchestration: null,
      parseWarning: 'Failed to parse JSON inside the orchestration code fence.',
    };
  }
}
