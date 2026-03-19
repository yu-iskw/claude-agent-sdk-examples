# Agent SDK v1 (TypeScript) Reference

This reference is tailored to this repository’s `query()` integration patterns (see `packages/agent-chat-demo/src/server/agent-runner.ts`).

## Repo-consistent `query()` options checklist

- `cwd`: set to the isolated Claude workspace directory used by the app
- `settingSources`: `['project']` (so `CLAUDE.md` and `.claude/settings.json` permissions/env load consistently; sandbox for the demo lives in code, not in `settings.json`)
- `model`: `'haiku'` by default for agent-chat-demo so sessions do not fall back to the CLI default model
- `agent`: choose one of the repo’s configured agents (agent-chat-demo values):
  - `trip-planner` (orchestrator)
  - `flight-researcher`, `hotel-researcher` (Task delegation targets)
- `systemPrompt`: use the Claude Code preset:
  - `{ type: 'preset', preset: 'claude_code', append: '...' }`
- `permissionMode`: demo uses `'plan'` for the plan phase and `'dontAsk'` when resuming execute with a `sessionId`
- `sandbox`:
  - `enabled: true`
  - `autoAllowBashIfSandboxed: true`
  - `allowUnsandboxedCommands: false`
  - `network.allowedDomains`: use the exported `TRIP_PLANNER_ALLOWED_DOMAINS` list in `agent-runner.ts` (docs/tooling + curated trip-planning hosts)
  - `network.allowLocalBinding: true` (only when needed for local bindings)
  - `filesystem`:
    - `allowRead`: restricted to the isolated workspace path
    - `allowWrite`: restricted to the isolated workspace path
    - `denyWrite`: explicitly deny writes above the isolated workspace
- `mcpServers`: attach the MCP server configs loaded from the app’s `.mcp.json` flow
- `maxTurns`: keep the repo’s default unless the user asks otherwise (demo default: `10`)
- `promptSuggestions`: keep enabled unless explicitly disabled by the user
- `env`:
  - forward `process.env`
  - set `CLAUDE_AGENT_SDK_CLIENT_APP` to identify the app for telemetry/user-agent

## Minimal parsing pattern for assistant text

The SDK returns a stream of `SDKMessage` events. A common repo pattern is:

```typescript
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

function extractAssistantText(messages: SDKMessage[]): string {
  const assistantMessages = messages.filter(
    (m): m is Extract<SDKMessage, { type: 'assistant' }> => m.type === 'assistant',
  );
  const lastAssistant = assistantMessages.at(-1);
  if (!lastAssistant) return 'No assistant response was generated.';

  const textBlocks = lastAssistant.message.content.filter(
    (block: unknown): block is { type: 'text'; text: string } =>
      typeof block === 'object' &&
      block !== null &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block,
  );

  return textBlocks
    .map((b) => b.text)
    .join('\n\n')
    .trim();
}
```

## Security reminder (policy, not decoration)

When writing instructions or generated code:

- Avoid recommending `permissionMode: 'bypassPermissions'`.
- Avoid recommending `dangerouslyDisableSandbox: true`.
- Keep sandboxed execution constrained to the isolated workspace.
