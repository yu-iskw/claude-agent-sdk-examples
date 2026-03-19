# agent-chat-demo workspace memory

## Goal

Build a ChatGPT-style web app powered by Claude Agent SDK while behaving like Claude Code inside this isolated app workspace.

## Required local resources

- Load `.claude/settings.json` from this workspace.
- Use markdown agents in `.claude/agents/`.
- Use markdown skills in `.claude/skills/` when relevant.
- Follow markdown rules in `.claude/rules/`.
- Prefer the Context7 MCP plugin from `.mcp.json` for fresh documentation.

## Product constraints

- Keep the current UX web-first, but design shared orchestration so a Slack bot can reuse it later.
- Treat this package directory as the only writable workspace for the agent session.
- Explain how sandboxing affects any command or tool suggestions.
