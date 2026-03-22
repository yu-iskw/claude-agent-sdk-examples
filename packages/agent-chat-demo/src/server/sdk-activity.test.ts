import { describe, expect, it } from 'vitest';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { activitiesFromSdkMessage, traceExtrasFromInit } from './sdk-activity.js';

const fixedTs = 1_700_000_000_000;

function initMessage(partial: Partial<Extract<SDKMessage, { type: 'system'; subtype: 'init' }>>) {
  return {
    type: 'system',
    subtype: 'init',
    apiKeySource: 'user',
    claude_code_version: '0.0.0',
    cwd: '/tmp',
    tools: ['Read'],
    mcp_servers: [],
    model: 'test-model',
    permissionMode: 'plan',
    slash_commands: [],
    output_style: 'default',
    plugins: [],
    uuid: '00000000-0000-4000-8000-000000000001',
    session_id: '00000000-0000-4000-8000-000000000002',
    skills: ['research-flight'],
    ...partial,
  } as SDKMessage;
}

describe('activitiesFromSdkMessage', () => {
  it('returns session_init for system init', () => {
    const events = activitiesFromSdkMessage(
      initMessage({
        agents: ['flight-researcher', 'hotel-researcher'],
        skills: ['research-flight', 'research-hotel'],
        tools: ['Read', 'Write', 'Bash'],
        mcp_servers: [{ name: 'context7', status: 'connected' }],
      }),
      fixedTs,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      version: 1,
      kind: 'session_init',
      ts: fixedTs,
      agentsTotal: 2,
      skillsTotal: 2,
      toolsTotal: 3,
      permissionMode: 'plan',
      model: 'test-model',
    });
    expect((events[0] as { kind: string }).kind).toBe('session_init');
  });

  it('maps task_started', () => {
    const msg = {
      type: 'system',
      subtype: 'task_started',
      task_id: 't1',
      description: 'Research flights',
      task_type: 'subagent',
      uuid: 'u',
      session_id: 's',
    } as SDKMessage;
    const events = activitiesFromSdkMessage(msg, fixedTs);
    expect(events[0]).toEqual({
      version: 1,
      ts: fixedTs,
      kind: 'task_started',
      taskId: 't1',
      description: 'Research flights',
      taskType: 'subagent',
    });
  });

  it('maps task_progress', () => {
    const msg = {
      type: 'system',
      subtype: 'task_progress',
      task_id: 't1',
      description: 'Working',
      last_tool_name: 'WebFetch',
      summary: 'Fetching page',
      usage: { total_tokens: 1, tool_uses: 2, duration_ms: 99 },
      uuid: 'u',
      session_id: 's',
    } as SDKMessage;
    const events = activitiesFromSdkMessage(msg, fixedTs);
    expect(events[0]?.kind).toBe('task_progress');
    expect(events[0]).toMatchObject({
      lastToolName: 'WebFetch',
      summary: 'Fetching page',
      durationMs: 99,
      toolUses: 2,
    });
  });

  it('maps task_notification to task_completed', () => {
    const msg = {
      type: 'system',
      subtype: 'task_notification',
      task_id: 't1',
      status: 'completed',
      summary: 'Done',
      output_file: '/tmp/out',
      uuid: 'u',
      session_id: 's',
    } as SDKMessage;
    const events = activitiesFromSdkMessage(msg, fixedTs);
    expect(events[0]).toEqual({
      version: 1,
      ts: fixedTs,
      kind: 'task_completed',
      taskId: 't1',
      status: 'completed',
      summary: 'Done',
    });
  });

  it('maps tool_progress', () => {
    const msg = {
      type: 'tool_progress',
      tool_use_id: 'toolu_1',
      tool_name: 'Bash',
      parent_tool_use_id: null,
      elapsed_time_seconds: 3,
      task_id: 't1',
      uuid: 'u',
      session_id: 's',
    } as SDKMessage;
    const events = activitiesFromSdkMessage(msg, fixedTs);
    expect(events[0]).toMatchObject({
      kind: 'tool_progress',
      toolName: 'Bash',
      toolUseId: 'toolu_1',
      elapsedSeconds: 3,
      taskId: 't1',
    });
  });

  it('maps tool_use_summary', () => {
    const msg = {
      type: 'tool_use_summary',
      summary: 'Ran several tools',
      preceding_tool_use_ids: [],
      uuid: 'u',
      session_id: 's',
    } as SDKMessage;
    const events = activitiesFromSdkMessage(msg, fixedTs);
    expect(events[0]).toEqual({
      version: 1,
      ts: fixedTs,
      kind: 'tool_use_summary',
      summary: 'Ran several tools',
    });
  });

  it('maps system status', () => {
    const msg = {
      type: 'system',
      subtype: 'status',
      status: 'compacting',
      uuid: 'u',
      session_id: 's',
    } as SDKMessage;
    const events = activitiesFromSdkMessage(msg, fixedTs);
    expect(events[0]).toEqual({
      version: 1,
      ts: fixedTs,
      kind: 'status',
      status: 'compacting',
    });
  });

  it('returns empty for stream_event', () => {
    const msg = {
      type: 'stream_event',
      event: {} as never,
      parent_tool_use_id: null,
      uuid: 'u',
      session_id: 's',
    } as SDKMessage;
    expect(activitiesFromSdkMessage(msg, fixedTs)).toEqual([]);
  });

  it('returns empty for unhandled message types', () => {
    const msg = {
      type: 'user',
      message: { role: 'user', content: 'hi' },
      parent_tool_use_id: null,
      session_id: 's',
    } as SDKMessage;
    expect(activitiesFromSdkMessage(msg, fixedTs)).toEqual([]);
  });
});

describe('traceExtrasFromInit', () => {
  it('includes agents, skills, model, permission mode', () => {
    const init = initMessage({
      agents: ['a'],
      skills: ['s'],
      model: 'm',
      permissionMode: 'dontAsk',
    }) as Extract<SDKMessage, { type: 'system'; subtype: 'init' }>;
    expect(traceExtrasFromInit(init)).toEqual({
      availableAgents: ['a'],
      availableSkills: ['s'],
      sessionModel: 'm',
      sessionPermissionMode: 'dontAsk',
    });
  });
});
