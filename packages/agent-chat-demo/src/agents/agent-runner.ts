import fs from 'node:fs';
import path from 'node:path';
import { query, type Options, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { ActivityEvent } from '../shared/activity.js';
import type { ChatRequest, ChatResponse } from '../shared/chat.js';
import { parseOrchestrationFromAssistantText } from '../shared/orchestration.js';
import { concatenateAssistantText } from './assistant-text.js';
import { claudeWorkspace } from '../shared/workspace.js';
import { buildPrompt } from './prompt.js';
import { activitiesFromSdkMessage, findInitMessage, traceExtrasFromInit } from './sdk-activity.js';
import { buildTrace } from './trace.js';

const context7ConfigPath = path.join(claudeWorkspace, '.mcp.json');

/** Sandbox egress allowlist: docs/tooling + curated trip-planning sources (canonical; see `baseQueryOptions().sandbox`). */
export const TRIP_PLANNER_ALLOWED_DOMAINS = [
  'docs.anthropic.com',
  'platform.claude.com',
  'github.com',
  'raw.githubusercontent.com',
  'registry.npmjs.org',
  'kayak.com',
  'tripadvisor.com',
  'skyscanner.net',
  'skyscanner.com',
  'expedia.com',
  'hotels.com',
  'booking.com',
  'orbitz.com',
  'travelocity.com',
  'momondo.com',
  'google.com',
  'maps.googleapis.com',
  'geocoding.googleapis.com',
  'openstreetmap.org',
  'nominatim.openstreetmap.org',
  'aa.com',
  'delta.com',
  'united.com',
  'southwest.com',
  'jetblue.com',
  'alaskaair.com',
  'marriott.com',
  'hilton.com',
  'ihg.com',
  'hyatt.com',
  'accor.com',
] as const;

type McpConfig = Record<
  string,
  {
    command: string;
    args?: string[];
  }
>;

function loadMcpServers(): McpConfig {
  const file = fs.readFileSync(context7ConfigPath, 'utf8');
  return JSON.parse(file) as McpConfig;
}

function extractSessionId(messages: SDKMessage[]): string | undefined {
  const result = messages.find(
    (m): m is Extract<SDKMessage, { type: 'result' }> => m.type === 'result',
  );
  if (result && 'session_id' in result && typeof result.session_id === 'string') {
    return result.session_id;
  }
  const init = messages.find(
    (m): m is Extract<SDKMessage, { type: 'system'; subtype: 'init' }> =>
      m.type === 'system' && m.subtype === 'init',
  );
  if (init && 'session_id' in init && typeof init.session_id === 'string') {
    return init.session_id;
  }
  return undefined;
}

function baseQueryOptions(overrides: { permissionMode: 'plan' | 'dontAsk'; resume?: string }) {
  return {
    cwd: claudeWorkspace,
    settingSources: ['project'],
    model: 'haiku',
    agent: 'trip-planner',
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append:
        'Operate like a collaborative product engineer. Keep answers concise, explain tradeoffs, and mention how the app can evolve into a Slack bot when relevant.',
    },
    permissionMode: overrides.permissionMode,
    ...(overrides.resume ? { resume: overrides.resume } : {}),
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: true,
      allowUnsandboxedCommands: false,
      network: {
        allowedDomains: [...TRIP_PLANNER_ALLOWED_DOMAINS],
        allowLocalBinding: true,
      },
      filesystem: {
        allowRead: [claudeWorkspace],
        allowWrite: [claudeWorkspace],
        denyWrite: [path.join(claudeWorkspace, '..')],
      },
    },
    mcpServers: loadMcpServers(),
    maxTurns: 10,
    promptSuggestions: true,
    env: {
      ...process.env,
      CLAUDE_AGENT_SDK_CLIENT_APP: '@typescript-template/agent-chat-demo',
    },
  };
}

async function consumeAgentStream(
  stream: AsyncIterable<SDKMessage>,
  emitActivity?: (event: ActivityEvent) => void,
): Promise<SDKMessage[]> {
  const messages: SDKMessage[] = [];
  for await (const message of stream) {
    messages.push(message);
    if (emitActivity) {
      const ts = Date.now();
      for (const event of activitiesFromSdkMessage(message, ts)) {
        emitActivity(event);
      }
    }
  }
  return messages;
}

export type RunChatOptions = {
  emitActivity?: (event: ActivityEvent) => void;
};

export async function runChat(
  request: ChatRequest,
  options?: RunChatOptions,
): Promise<ChatResponse> {
  if (request.phase === 'execute' && !request.sessionId?.trim()) {
    throw new Error('execute phase requires a sessionId from the plan phase.');
  }

  const stream = query({
    prompt: buildPrompt(request),
    options: baseQueryOptions(
      request.phase === 'plan'
        ? { permissionMode: 'plan' }
        : { permissionMode: 'dontAsk', resume: request.sessionId! },
    ) as Options,
  });

  const messages = await consumeAgentStream(stream, options?.emitActivity);

  const reply = concatenateAssistantText(messages);
  const sessionId = extractSessionId(messages);
  const init = findInitMessage(messages);
  const initExtras = init ? traceExtrasFromInit(init) : undefined;
  const mcpServerNames = Object.keys(loadMcpServers());

  if (request.phase === 'plan') {
    const { orchestration, parseWarning } = parseOrchestrationFromAssistantText(reply);
    return {
      reply,
      sessionId,
      orchestration,
      trace: buildTrace({
        phase: 'plan',
        parseWarning,
        mcpServers: mcpServerNames,
        initExtras,
      }),
    };
  }

  return {
    reply,
    sessionId,
    trace: buildTrace({
      phase: 'execute',
      mcpServers: mcpServerNames,
      initExtras,
    }),
  };
}
