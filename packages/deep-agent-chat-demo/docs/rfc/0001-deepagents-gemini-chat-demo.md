# RFC 0001: DeepAgents Gemini Chat Demo Workspace

- **Status**: Accepted (M1 implemented)
- **Package**: `@typescript-template/deep-agent-chat-demo`
- **Default model**: `gemini-3.1-flash-lite` (Gemini API)
- **Vertex AI**: deferred to M2

## Summary

Sibling workspace to `agent-chat-demo` that preserves the web/API contract (`/api/chat`, plan → approve → execute, SSE activity) while replacing the Claude Agent SDK runner with **DeepAgents JS** and **Gemini API**.

## Architecture

```text
Browser UI / CLI  →  runChat()  →  DeepAgents profiles  →  Gemini API
```

- **Plan profile**: no tools, no subagents, no MCP (`createHarnessProfile` excludes filesystem/task tools).
- **Execute profile**: subagents, skills, MCP (Context7), synthetic weather tool.
- **Session**: `sessionId` = LangGraph `thread_id` with shared `MemorySaver`.

## CLI (agent independent of web app)

```bash
GEMINI_API_KEY=... pnpm --filter @typescript-template/deep-agent-chat-demo agent:plan "Plan a trip to Kyoto"
GEMINI_API_KEY=... pnpm --filter @typescript-template/deep-agent-chat-demo agent:execute --session <sessionId>
```

## Environment

See [`.env.example`](../.env.example).

## References

- [DeepAgents JS overview](https://docs.langchain.com/oss/javascript/deepagents/overview)
- [DeepAgents models](https://docs.langchain.com/oss/javascript/deepagents/models)
- [Gemini API](https://ai.google.dev/gemini-api/docs)
