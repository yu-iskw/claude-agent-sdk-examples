import type { SDKMessage, SDKSystemMessage } from '@anthropic-ai/claude-agent-sdk';
import type { ChatTrace } from '../shared/chat.js';
import { truncateList, truncateText, type ActivityEvent } from '../shared/activity.js';

export function traceExtrasFromInit(
  init: SDKSystemMessage,
): Pick<
  ChatTrace,
  'availableAgents' | 'availableSkills' | 'sessionModel' | 'sessionPermissionMode'
> {
  const out: Pick<
    ChatTrace,
    'availableAgents' | 'availableSkills' | 'sessionModel' | 'sessionPermissionMode'
  > = {
    sessionPermissionMode: init.permissionMode,
  };
  if (init.agents && init.agents.length > 0) {
    out.availableAgents = [...init.agents];
  }
  if (init.skills && init.skills.length > 0) {
    out.availableSkills = [...init.skills];
  }
  if (init.model) {
    out.sessionModel = init.model;
  }
  return out;
}

export function findInitMessage(messages: SDKMessage[]): SDKSystemMessage | undefined {
  const m = messages.find(
    (x): x is SDKSystemMessage => x.type === 'system' && x.subtype === 'init',
  );
  return m;
}

/**
 * Maps one SDK stream message to zero or more UI activity events.
 * Omits high-volume types such as `stream_event` by design.
 */
export function activitiesFromSdkMessage(message: SDKMessage, ts = Date.now()): ActivityEvent[] {
  if (message.type === 'stream_event') {
    return [];
  }

  if (message.type === 'system' && message.subtype === 'init') {
    const agents = truncateList(message.agents ?? []);
    const skills = truncateList(message.skills ?? []);
    const tools = truncateList(message.tools ?? []);
    const mcpRaw = truncateList(message.mcp_servers ?? []);
    const mcpServers = mcpRaw.shown.map((s) => ({
      name: truncateText(String(s.name), 120),
      status: truncateText(String(s.status), 80),
    }));
    const ev: ActivityEvent = {
      version: 1,
      ts,
      kind: 'session_init',
      agents: agents.shown.map((a) => truncateText(String(a), 120)),
      agentsTotal: agents.total,
      skills: skills.shown.map((s) => truncateText(String(s), 120)),
      skillsTotal: skills.total,
      tools: tools.shown.map((t) => truncateText(String(t), 120)),
      toolsTotal: tools.total,
      mcpServers,
      permissionMode: String(message.permissionMode),
      ...(message.model ? { model: truncateText(message.model, 120) } : {}),
    };
    return [ev];
  }

  if (message.type === 'system' && message.subtype === 'status') {
    return [
      {
        version: 1,
        ts,
        kind: 'status',
        status: message.status === 'compacting' ? 'compacting' : 'idle',
      },
    ];
  }

  if (message.type === 'system' && message.subtype === 'task_started') {
    return [
      {
        version: 1,
        ts,
        kind: 'task_started',
        taskId: message.task_id,
        description: truncateText(message.description),
        ...(message.task_type ? { taskType: truncateText(message.task_type, 120) } : {}),
        ...(message.tool_use_id ? { toolUseId: message.tool_use_id } : {}),
      },
    ];
  }

  if (message.type === 'system' && message.subtype === 'task_progress') {
    return [
      {
        version: 1,
        ts,
        kind: 'task_progress',
        taskId: message.task_id,
        description: truncateText(message.description),
        ...(message.last_tool_name
          ? { lastToolName: truncateText(message.last_tool_name, 120) }
          : {}),
        ...(message.summary ? { summary: truncateText(message.summary) } : {}),
        ...(message.tool_use_id ? { toolUseId: message.tool_use_id } : {}),
        durationMs: message.usage?.duration_ms,
        toolUses: message.usage?.tool_uses,
      },
    ];
  }

  if (message.type === 'system' && message.subtype === 'task_notification') {
    return [
      {
        version: 1,
        ts,
        kind: 'task_completed',
        taskId: message.task_id,
        status: message.status,
        summary: truncateText(message.summary),
        ...(message.tool_use_id ? { toolUseId: message.tool_use_id } : {}),
      },
    ];
  }

  if (message.type === 'tool_progress') {
    return [
      {
        version: 1,
        ts,
        kind: 'tool_progress',
        toolName: truncateText(message.tool_name, 120),
        toolUseId: message.tool_use_id,
        elapsedSeconds: message.elapsed_time_seconds,
        ...(message.task_id ? { taskId: message.task_id } : {}),
      },
    ];
  }

  if (message.type === 'tool_use_summary') {
    return [
      {
        version: 1,
        ts,
        kind: 'tool_use_summary',
        summary: truncateText(message.summary),
      },
    ];
  }

  return [];
}
