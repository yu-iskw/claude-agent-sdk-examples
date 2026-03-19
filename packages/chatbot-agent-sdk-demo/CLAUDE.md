# Chatbot Agent SDK Demo — Claude Code Memory

## Package Overview

This package (`@claude-agent-sdk-examples/chatbot-agent-sdk-demo`) is a ChatGPT-like chatbot web app that **demonstrates how Claude Code CLI resources** (`.claude/` agents, skills, settings, hooks, `CLAUDE.md`) can be leveraged inside applications built with the `@anthropic-ai/claude-agent-sdk`.

It is an isolated workspace inside the `claude-agent-sdk-examples` TypeScript monorepo.

## Quick Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Compile TypeScript → dist/
pnpm start            # Start server (port 3000)
pnpm dev              # Start with --watch (requires prior build)
pnpm build:start      # Build then start
```

Set `ANTHROPIC_API_KEY` before starting.

## Architecture

```
src/
├── server.ts               # Express entry point — mounts routes, serves public/
├── agent/
│   ├── index.ts            # runAgentQuery() — orchestrates query() with all .claude/ options
│   ├── claude-loader.ts    # Loads .claude/agents/*.md from root + this package → AgentDefinition[]
│   ├── session-manager.ts  # Thin wrapper over listSessions() / getSessionMessages()
│   └── sandbox-config.ts   # SandboxSettings object (network + filesystem restrictions)
├── routes/
│   ├── chat.ts             # POST /api/chat — SSE streaming endpoint
│   ├── sessions.ts         # GET /api/sessions, GET /api/sessions/:id/messages
│   ├── agents.ts           # GET /api/agents — lists all loaded agents
│   └── health.ts           # GET /health
├── transport/
│   ├── interface.ts        # Transport interface (sendChunk, sendDone, sendError)
│   ├── web-transport.ts    # SSE-based implementation (HTTP)
│   └── slack-transport.ts  # Stub for future Slack bot extension
└── public/
    ├── index.html          # ChatGPT-like UI
    ├── app.js              # SSE client, session sidebar, agent selector, markdown rendering
    └── style.css           # Dark theme, message bubbles, sidebar layout
```

## How .claude/ Resources Are Used at Runtime

### 1. `settingSources: ["project"]`
When the server starts and `query()` is called, `settingSources: ["project"]` makes the SDK:
- Load **this file** (`CLAUDE.md`) as project memory injected into the system prompt
- Load `.claude/settings.json` — applying permissions (allow/deny) and hooks (log-tool-use.sh)

The server runs from `packages/chatbot-agent-sdk-demo/` as its `cwd`, so the SDK finds the package-level `.claude/` automatically.

### 2. Programmatic Agent Loading (`claude-loader.ts`)
At startup, `claude-loader.ts` reads markdown agent files from:
1. Root monorepo: `../../.claude/agents/` (verifier, code-reviewer, parallel-executor, parallel-tasks-planner, task-worker)
2. This package: `.claude/agents/` (chat-assistant, code-helper, research-assistant)

Each markdown file has YAML frontmatter (`name`, `description`, `model`, `tools`, `skills`) parsed via `gray-matter`. The body becomes the agent's `prompt`. The merged map is passed as `options.agents` to `query()`.

### 3. Skills as Reference Context
Skill descriptions from `.claude/skills/*/SKILL.md` (both root and package-level) are loaded and appended to the system prompt as a "available skills" reference, letting agents know what workflows are available.

### 4. PostToolUse Hook
`.claude/hooks/log-tool-use.sh` logs every tool invocation to `.claude/tool-use.log`. This fires automatically because `settingSources: ["project"]` activates the hooks defined in `.claude/settings.json`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | ChatGPT-like UI |
| `GET` | `/health` | Health check |
| `GET` | `/api/agents` | List all loaded agents (root + package) |
| `POST` | `/api/chat` | Stream a chat message (SSE) |
| `GET` | `/api/sessions` | List past sessions |
| `GET` | `/api/sessions/:id/messages` | Get session message history |

## Extending to Slack Bot

The `Transport` interface (`src/transport/interface.ts`) decouples agent logic from HTTP:

```typescript
interface Transport {
  sendChunk(text: string): Promise<void>;
  sendToolUse(toolName: string, input: unknown): Promise<void>;
  sendDone(sessionId: string): Promise<void>;
  sendError(error: Error): Promise<void>;
}
```

To add Slack support:
1. Implement `SlackTransport` in `src/transport/slack-transport.ts` using `@slack/web-api`
2. Create a Slack event handler that creates a `SlackTransport` and calls `runAgentQuery()`
3. Add Bolt/Socket Mode in `server.ts` alongside the existing Express server

## Sandboxing

Configured in `src/agent/sandbox-config.ts`:
- Filesystem writes restricted to `/tmp` and `cwd`
- Network restricted to `api.anthropic.com` + `registry.npmjs.org`
- Local port binding allowed (for dev server)
- Dangerous paths (`/etc/shadow`) denied for reads

## Common Gotchas

- Always run from the package directory (`packages/chatbot-agent-sdk-demo/`) so `settingSources: ["project"]` finds the correct `.claude/` folder
- The `gray-matter` dependency parses YAML frontmatter in `.md` agent files — required for `claude-loader.ts`
- Context7 MCP server (`@upstash/context7-mcp`) is invoked via `npx` on first use — requires network access and will download on first call
- Session data is stored by the SDK in `~/.claude/` by default; use the `dir` option in `listSessions()` to customize

## Code Style

Follows root monorepo conventions:
- TypeScript strict mode, NodeNext module resolution
- kebab-case filenames, PascalCase classes, camelCase functions
- ESM (`"type": "module"`)
