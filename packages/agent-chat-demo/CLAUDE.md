# agent-chat-demo workspace memory

## Goal

Build a ChatGPT-style web app powered by Claude Agent SDK while behaving like Claude Code inside this isolated app workspace.

## Configuration layers

- **Project settings** ([`.claude/settings.json`](.claude/settings.json)): `env` and `permissions` for sessions that load this workspace via `settingSources: ['project']`. Sandbox policy is **not** duplicated here.
- **Model** ([`src/server/agent-runner.ts`](src/server/agent-runner.ts) `baseQueryOptions().model`): `'haiku'` so each `query()` session default is explicit, not tied to the Claude Code CLI default.
- **Sandbox and egress** ([`src/server/agent-runner.ts`](src/server/agent-runner.ts) `baseQueryOptions().sandbox`): canonical allowlists (`TRIP_PLANNER_ALLOWED_DOMAINS`, workspace read/write, `denyWrite` above the package). The web server enforces this for every `query()` call.
- **MCP**: definitions in [`.mcp.json`](.mcp.json); the server passes them as `mcpServers` (no separate `enabledPlugins` entry for Context7).
- **Agents / skills / rules**: markdown under [`.claude/`](.claude/) as usual.

## Required local resources

- Load `.claude/settings.json` from this workspace.
- Use markdown agents in `.claude/agents/`.
- Use markdown skills in `.claude/skills/` when relevant.
- Follow markdown rules in `.claude/rules/`.
- Use Context7 via `.mcp.json` (loaded by the server) when you need current library or framework documentation.

## Product constraints

- The web UI renders chat as GitHub-flavored Markdown and shows orchestration as a **structured list** parsed from plan JSON (not a visual graph/diagram unless we add one later).
- Keep the current UX web-first, but design shared orchestration so a Slack bot can reuse it later.
- Treat this package directory as the only writable workspace for the agent session.
- Explain how sandboxing affects any command or tool suggestions.

## Claude Code CLI in this folder

Interactive `claude` in this directory does not inherit the demo’s sandbox JSON from `settings.json`; sandbox for the product is defined in `agent-runner.ts`. Align behavior manually if you rely on both entry points.
