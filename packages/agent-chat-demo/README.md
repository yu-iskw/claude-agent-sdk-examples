# agent-chat-demo

A ChatGPT-style demo web app that runs Claude Agent SDK from an isolated workspace under `packages/agent-chat-demo`.

## Why this package exists

- Demonstrates how a product app can keep its own `.claude/` directory and `CLAUDE.md` separate from the repo root.
- Loads project settings with `settingSources: ['project']` so the SDK behaves like Claude Code inside the app workspace.
- Enables SDK sandboxing and constrains the workspace to this package.
- Mounts the Context7 MCP plugin via `.mcp.json` for fresh documentation lookup.
- Keeps future Slack-bot guidance in local markdown agents and skills.

## Scripts

```bash
pnpm --filter @typescript-template/agent-chat-demo dev
pnpm --filter @typescript-template/agent-chat-demo build
pnpm --filter @typescript-template/agent-chat-demo test
```
