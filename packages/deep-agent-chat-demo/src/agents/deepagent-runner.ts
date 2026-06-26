import type { BaseMessage } from '@langchain/core/messages';
import type { ActivityEvent } from '../shared/activity.js';
import type { ChatRequest, ChatResponse } from '../shared/chat.js';
import { parseOrchestrationFromAssistantText } from '../shared/orchestration.js';
import { concatenateAssistantText } from './assistant-text.js';
import { consumeDeepAgentStream, createSessionInitEvent } from './deepagent-activity.js';
import { createGeminiModel } from './deepagent-models.js';
import {
  createExecuteAgent,
  createPlanAgent,
  describeActiveProfile,
  getWorkspaceResources,
} from './deepagent-profiles.js';
import {
  assertExecuteSession,
  createThreadId,
  loadSessionMessages,
  saveSessionMessages,
  serializedToLangChainMessages,
  threadConfig,
} from './deepagent-session.js';
import { buildTrace } from './deepagent-trace.js';
import { loadMcpToolsForPhase } from './mcp-loader.js';
import { buildPrompt } from './prompt.js';
import { tripPlannerSystemPrompt } from './workspace-loader.js';

export type RunChatOptions = {
  emitActivity?: (event: ActivityEvent) => void;
};

async function checkpointHasMessages(
  agent: ReturnType<typeof createPlanAgent>,
  threadId: string,
): Promise<boolean> {
  const state = await agent.getState(threadConfig(threadId));
  const messages = (state as { values?: { messages?: unknown[] } }).values?.messages;
  return Array.isArray(messages) && messages.length > 0;
}

async function runAgentStream(
  agent: ReturnType<typeof createPlanAgent>,
  userPrompt: string,
  threadId: string,
  phase: ChatRequest['phase'],
  emitActivity?: (event: ActivityEvent) => void,
): Promise<BaseMessage[]> {
  const config = threadConfig(threadId);
  const hasCheckpoint = phase === 'execute' ? await checkpointHasMessages(agent, threadId) : false;
  const priorMessages =
    phase === 'execute' && !hasCheckpoint
      ? serializedToLangChainMessages(loadSessionMessages(threadId))
      : [];

  const stream = await agent.streamEvents(
    { messages: [...priorMessages, { role: 'user', content: userPrompt }] },
    { version: 'v3', ...config },
  );
  return consumeDeepAgentStream(stream, emitActivity);
}

export async function runChat(
  request: ChatRequest,
  options?: RunChatOptions,
): Promise<ChatResponse> {
  if (request.phase === 'execute') {
    assertExecuteSession(request.sessionId ?? '');
  }

  const resources = getWorkspaceResources();
  const modelConfig = createGeminiModel();
  const mcp = await loadMcpToolsForPhase(request.phase);
  const permissionMode = describeActiveProfile(request.phase);

  options?.emitActivity?.(
    createSessionInitEvent({
      agents: resources.agentSpecs.map((spec) => spec.name),
      skills: resources.skillNames,
      tools: mcp.tools.map((toolItem) => toolItem.name),
      mcpServers: mcp.serverNames,
      model: modelConfig.descriptor.descriptor,
      permissionMode,
    }),
  );

  const systemPrompt = tripPlannerSystemPrompt(resources);
  const userPrompt = buildPrompt(request);
  const threadId = request.phase === 'plan' ? createThreadId() : (request.sessionId as string);

  const agent =
    request.phase === 'plan'
      ? createPlanAgent(systemPrompt, modelConfig)
      : createExecuteAgent(systemPrompt, mcp.tools, modelConfig);

  const messages = await runAgentStream(
    agent,
    userPrompt,
    threadId,
    request.phase,
    options?.emitActivity,
  );
  const reply = concatenateAssistantText(messages);

  if (request.phase === 'plan') {
    saveSessionMessages(threadId, messages);
  }

  const traceBase = {
    mcpServers: mcp.serverNames,
    availableAgents: resources.agentSpecs.map((spec) => spec.name),
    availableSkills: resources.skillNames,
    sessionModel: modelConfig.descriptor.descriptor,
    sessionPermissionMode: permissionMode,
  };

  if (request.phase === 'plan') {
    const { orchestration, parseWarning } = parseOrchestrationFromAssistantText(reply);
    return {
      reply,
      sessionId: threadId,
      orchestration,
      trace: buildTrace({ phase: 'plan', parseWarning, ...traceBase }),
    };
  }

  return {
    reply,
    sessionId: threadId,
    trace: buildTrace({ phase: 'execute', ...traceBase }),
  };
}
