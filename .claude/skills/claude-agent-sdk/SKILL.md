---
name: claude-agent-sdk
description: Develop TypeScript code using Claude Agent SDK v1 (`query()` with sandbox + MCP) with a repo-consistent verification loop.
---

# Claude Agent SDK v1 Skill

## Purpose

Use this skill to develop and iterate on TypeScript code that integrates with the Claude Agent SDK v1—specifically `query()`—following this repository’s conventions for sandboxing, permissions, and MCP wiring.

Reusable reference: [Agent SDK v1 (TypeScript) reference](../common-references/agent-sdk-v1-typescript.md)

## When to use this skill

Invoke this skill when the user requests any of the following:

- “Use Claude Agent SDK v1 in TypeScript to implement X”
- “Add/modify backend code that calls `query()`”
- “Implement a new agent workflow or endpoint that streams/collects Claude messages”

## Development Loop Logic

1. **Clarify the change scope**
   - Identify the target feature and the expected behavior/output.
   - Decide the minimal set of files to change (prefer the smallest surface area).

2. **Inspect repo conventions**
   - Use existing patterns from `packages/agent-chat-demo/src/server/agent-runner.ts`:
     - repo-consistent `query()` options (`cwd`, `settingSources: ['project']`, `permissionMode`, `sandbox`, `mcpServers`, etc.)
     - how assistant text is extracted from SDK messages
   - Ensure the implementation aligns with `.claude/settings.json` permission + hook behavior (formatting after `Edit`/`Write`).

3. **Select repo-consistent `query()` options**
   Apply the checklist below (do not invent new defaults unless the user explicitly requires it):
   - `cwd`: set to the isolated Claude workspace directory used by this app (repo pattern)
   - `settingSources`: use `['project']` so Claude.md guidance is loaded consistently
   - `model`: use `'haiku'` by default for agent-chat-demo (unless the user explicitly requires another model)
   - `agent`: choose the correct agent name used by this repo (for agent-chat-demo: `trip-planner`)
   - `systemPrompt`: use `{ type: 'preset', preset: 'claude_code', append: '...' }`
   - `permissionMode`: use `'dontAsk'`-like behavior (pre-defined policy rather than ad-hoc approvals)
   - `sandbox`:
     - `enabled: true`
     - `autoAllowBashIfSandboxed: true`
     - `allowUnsandboxedCommands: false`
     - `network.allowedDomains`: restrict to docs/code-hosting domains used by this repo
     - `filesystem`: allow read/write only within the Claude workspace; deny writes above it
   - `mcpServers`: load/attach MCP servers consistently with this app’s `.mcp.json` flow
   - `maxTurns`: keep the repo’s default unless the user asks to change it
   - `promptSuggestions`: keep it enabled unless the user asks to disable it
   - `env`: forward `process.env` and set `CLAUDE_AGENT_SDK_CLIENT_APP` to identify the app

4. **Implement the minimal code change**
   - Use `Edit`/`Write` to update only what’s needed.
   - Prefer small, deterministic parsing/formatting changes (e.g., assistant text extraction) over broad refactors.

5. **Verify**
   - Run `pnpm lint`
   - Run `pnpm build`
   - If the change touches runtime logic (not just docs), optionally run `pnpm test` when it is quick.

6. **Iterate (bounded loop)**
   - If verification fails, analyze the failing step and apply the smallest fix.
   - Repeat until passing or until you reach the maximum iteration count (default: 5 attempts).

7. **Deliver**
   - Explain what changed and why.
   - Include which `query()` options were used and how they match the repo’s sandbox/permissions patterns.

## Termination Criteria

- `pnpm lint` passes and `pnpm build` passes.
- Reached max iteration limit (default: 5) and the failure needs human intervention or a broader design change.

## Agent SDK v1 integration recipe (minimal `query()`-based change)

When implementing or modifying `query()` integration, structure the code like this (adapt names/paths to your target files):

```typescript
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';

function buildPrompt(input: string): string {
  return input;
}

export async function runAgent(input: string): Promise<string> {
  const stream = query({
    prompt: buildPrompt(input),
    options: {
      cwd: /* repo’s isolated claude workspace path */,
      settingSources: ['project'],
      model: 'haiku',
      agent: /* e.g. 'trip-planner' for agent-chat-demo */,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: 'Operate like a collaborative product engineer.'
      },
      permissionMode: 'dontAsk',
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true,
        allowUnsandboxedCommands: false,
        network: {
          allowedDomains: [
            'docs.anthropic.com',
            'platform.claude.com',
            'github.com',
            'raw.githubusercontent.com',
            'registry.npmjs.org'
          ],
          allowLocalBinding: true
        },
        filesystem: {
          allowRead: [/* claudeWorkspace */],
          allowWrite: [/* claudeWorkspace */],
          denyWrite: [/* path.join(claudeWorkspace, '..') */]
        }
      },
      mcpServers: /* loaded from repo’s `.mcp.json`-driven flow */,
      maxTurns: 10,
      promptSuggestions: true,
      env: {
        ...process.env,
        CLAUDE_AGENT_SDK_CLIENT_APP: '@typescript-template/agent-chat-demo'
      }
    }
  });

  const messages: SDKMessage[] = [];
  for await (const message of stream) {
    messages.push(message);
  }

  // Extract assistant text from the last assistant message.
  const lastAssistant = messages.filter((m) => m.type === 'assistant').at(-1);
  if (!lastAssistant) return 'No assistant response was generated.';

  const textBlocks = lastAssistant.message.content.filter(
    (block: unknown) =>
      typeof block === 'object' &&
      block !== null &&
      'type' in block &&
      (block as { type?: unknown }).type === 'text' &&
      'text' in block
  );

  return (textBlocks as Array<{ text: string }>).map((b) => b.text).join('\n\n').trim();
}
```

## Security / permissions notes (do not skip)

Do not help the model “escape sandbox” or bypass repository safeguards. Treat sandbox + permissions as policy, not optional decoration.

### Do

- Keep `sandbox.enabled: true` for any tool execution patterns that rely on sandboxed behavior.
- Keep `allowUnsandboxedCommands: false` unless there is an explicit and justified operational need.
- Keep `filesystem.allowRead` and `filesystem.allowWrite` constrained to the isolated Claude workspace.
- Use `permissionMode: 'dontAsk'`-style policy so approvals are handled consistently with repo expectations.
- Restrict `network.allowedDomains` to the small set this repo uses (docs + code hosting).

### Don’t

- Don’t suggest `permissionMode: 'bypassPermissions'` as a default recommendation.
- Don’t suggest `dangerouslyDisableSandbox: true` (unless the user explicitly requests a high-risk change and you have a strong policy rationale).
- Don’t write changes that broaden filesystem access beyond the isolated Claude workspace.
- Don’t include secrets in skill instructions or generated code.

## Examples

### Example: Add a new endpoint that calls `query()`

User request: “Add an endpoint that summarizes the latest messages using Agent SDK v1.”

Expected skill behavior:

- Read `packages/agent-chat-demo/src/server/agent-runner.ts` to match `query()` options.
- Implement the smallest change: a new function that calls `query()` and extracts assistant text.
- Run `pnpm lint` and `pnpm build`.

### Example: Implement a streaming-style change

User request: “Modify the backend so the client receives incremental assistant tokens.”

Expected skill behavior:

- Identify where `query()` is consumed (stream iteration).
- Preserve sandbox + permissions and reuse the existing message parsing approach.
- Verify with `pnpm lint` and `pnpm build`.
