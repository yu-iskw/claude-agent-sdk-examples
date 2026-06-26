import type { ActivityEvent } from '../shared/activity';

export type ActivityLine = { label: string; detail?: string };

export function describeActivity(event: ActivityEvent): ActivityLine {
  switch (event.kind) {
    case 'session_init':
      return {
        label: 'Session initialized',
        detail: `${event.agentsTotal} agents · ${event.skillsTotal} skills · ${event.toolsTotal} tools · model ${event.model ?? 'default'}`,
      };
    case 'task_started':
      return {
        label: `Task started: ${event.description}`,
        detail: event.taskType ? `Type: ${event.taskType}` : event.toolUseId,
      };
    case 'task_progress':
      return {
        label: event.summary ?? event.description,
        detail: event.lastToolName
          ? `Last tool: ${event.lastToolName}`
          : event.durationMs != null
            ? `${event.durationMs} ms`
            : undefined,
      };
    case 'task_completed':
      return {
        label: `Task ${event.status}: ${event.summary}`,
        detail: event.taskId,
      };
    case 'tool_progress':
      return {
        label: `${event.toolName} (${event.elapsedSeconds}s)`,
        detail: event.taskId ?? event.toolUseId,
      };
    case 'tool_use_summary':
      return {
        label: 'Tool summary',
        detail: event.summary,
      };
    case 'status':
      return {
        label: event.status === 'compacting' ? 'Compacting session…' : 'Idle',
      };
  }
}
