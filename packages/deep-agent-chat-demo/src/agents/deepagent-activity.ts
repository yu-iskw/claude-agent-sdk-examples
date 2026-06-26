import { randomUUID } from 'node:crypto';
import type { DeepAgentRunStream } from 'deepagents';
import type { BaseMessage } from '@langchain/core/messages';
import type { ActivityEvent } from '../shared/activity.js';
import { truncateText } from '../shared/activity.js';

export type SessionInitContext = {
  agents: string[];
  skills: string[];
  tools: string[];
  mcpServers: string[];
  model: string;
  permissionMode: string;
};

export function createSessionInitEvent(
  context: SessionInitContext,
  ts = Date.now(),
): ActivityEvent {
  return {
    version: 1,
    ts,
    kind: 'session_init',
    agents: context.agents.map((name) => truncateText(name, 120)),
    agentsTotal: context.agents.length,
    skills: context.skills.map((name) => truncateText(name, 120)),
    skillsTotal: context.skills.length,
    tools: context.tools.map((name) => truncateText(name, 120)),
    toolsTotal: context.tools.length,
    mcpServers: context.mcpServers.map((name) => ({
      name: truncateText(name, 120),
      status: 'loaded',
    })),
    permissionMode: context.permissionMode,
    model: truncateText(context.model, 120),
  };
}

export async function consumeDeepAgentStream(
  stream: DeepAgentRunStream,
  emitActivity?: (event: ActivityEvent) => void,
): Promise<BaseMessage[]> {
  const tasks = [
    (async () => {
      for await (const call of stream.toolCalls) {
        const ts = Date.now();
        const toolUseId = randomUUID();
        emitActivity?.({
          version: 1,
          ts,
          kind: 'tool_progress',
          toolName: truncateText(call.name, 120),
          toolUseId,
          elapsedSeconds: 0,
        });
        emitActivity?.({
          version: 1,
          ts,
          kind: 'tool_use_summary',
          summary: truncateText(`Completed tool ${call.name}`, 240),
        });
      }
    })(),
    (async () => {
      for await (const sub of stream.subagents) {
        const ts = Date.now();
        const taskId = `${sub.name}-${ts}`;
        emitActivity?.({
          version: 1,
          ts,
          kind: 'task_started',
          taskId,
          description: truncateText(`Subagent ${sub.name} started`, 240),
          taskType: sub.name,
        });
        await Promise.all([
          (async () => {
            for await (const message of sub.messages) {
              const text = await message.text;
              if (text.trim()) {
                emitActivity?.({
                  version: 1,
                  ts,
                  kind: 'task_progress',
                  taskId,
                  description: truncateText(text, 240),
                });
              }
            }
          })(),
          (async () => {
            for await (const call of sub.toolCalls) {
              emitActivity?.({
                version: 1,
                ts,
                kind: 'tool_progress',
                toolName: truncateText(call.name, 120),
                toolUseId: randomUUID(),
                elapsedSeconds: 0,
                taskId,
              });
            }
          })(),
        ]);
        await sub.output;
        emitActivity?.({
          version: 1,
          ts,
          kind: 'task_completed',
          taskId,
          status: 'completed',
          summary: truncateText(`Subagent ${sub.name} finished`, 240),
        });
      }
    })(),
  ];

  const [output] = await Promise.all([stream.output, ...tasks]);
  emitActivity?.({ version: 1, ts: Date.now(), kind: 'status', status: 'idle' });
  if (
    output &&
    typeof output === 'object' &&
    'messages' in output &&
    Array.isArray(output.messages)
  ) {
    return output.messages as BaseMessage[];
  }
  return [];
}
