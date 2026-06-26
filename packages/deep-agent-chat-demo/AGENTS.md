# deep-agent-chat-demo workspace memory

## Goal

Build a ChatGPT-style web app powered by DeepAgents JS + Gemini API while preserving the same web/API contract as `agent-chat-demo`.

## Configuration layers

- **Project settings** ([`.agents/settings.json`](.agents/settings.json)): workspace metadata for agents, skills, and rules loaded from `.agents/`.
- **Model** ([`src/agents/deepagent-models.ts`](src/agents/deepagent-models.ts)): default Gemini model (`gemini-3.1-flash-lite`) and API key resolution.
- **Runner** ([`src/agents/deepagent-runner.ts`](src/agents/deepagent-runner.ts)): plan and execute profiles, SSE activity, session persistence.
- **MCP**: definitions in [`.mcp.json`](.mcp.json); Context7 for current library documentation.
- **Agents / skills / rules**: markdown under [`.agents/`](.agents/) as usual.

## Required local resources

- Load `.agents/settings.json` from this workspace.
- Use markdown agents in `.agents/agents/`.
- Use markdown skills in `.agents/skills/` when relevant.
- Follow markdown rules in `.agents/rules/`.
- Use Context7 via `.mcp.json` when you need current library or framework documentation.

## Product constraints

- The web UI renders chat as GitHub-flavored Markdown and shows orchestration as a **structured list** parsed from plan JSON.
- Keep the current UX web-first, but design shared orchestration so a Slack bot can reuse it later.
- Treat this package directory as the only writable workspace for the agent session.

## CLI

Use `pnpm agent:plan` and `pnpm agent:execute` for headless runs. See [README.md](README.md) and [docs/rfc/0001-deepagents-gemini-chat-demo.md](docs/rfc/0001-deepagents-gemini-chat-demo.md).
