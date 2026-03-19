import type { ChatRequest } from '../shared/chat.js';

const EXECUTE_PREAMBLE = [
  'Execute the approved plan.',
  'Proceed with Task delegation to flight-researcher and hotel-researcher as described in the project agents.',
  'Do not write files.',
  'In your final chat response, include these sections (required): Trip Plan, Flights, Lodging, Task Logs, Follow-up Questions.',
].join(' ');

export function buildPrompt(request: ChatRequest): string {
  const transcript = request.history
    .slice(-6)
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.text}`)
    .join('\n');

  if (request.phase === 'execute') {
    const userLine =
      request.message.trim().length > 0
        ? `Latest user message:\n${request.message}`
        : 'Latest user message: (none — continue from session context.)';

    return [
      'You are running inside the isolated workspace for the agent-chat-demo app.',
      'You must follow the local CLAUDE.md and the .claude directory settings, rules, agents, and skills from this workspace.',
      EXECUTE_PREAMBLE,
      transcript ? `Recent transcript:\n${transcript}` : 'No recent transcript.',
      userLine,
    ].join('\n\n');
  }

  return [
    'You are running inside the isolated workspace for the agent-chat-demo app.',
    'You must follow the local CLAUDE.md and the .claude directory settings, rules, agents, and skills from this workspace.',
    'You are in PLAN PHASE only: describe what you will do and output the required orchestration JSON block. Do not execute tools or perform any `Task` delegations. Do not assume tools have run yet.',
    'Use Context7 whenever you need current library or framework documentation.',
    transcript ? `Recent transcript:\n${transcript}` : 'No recent transcript.',
    `Latest user message:\n${request.message}`,
  ].join('\n\n');
}
