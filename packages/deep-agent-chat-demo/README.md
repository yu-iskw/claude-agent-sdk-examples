# DeepAgents Gemini Chat Demo

Sibling to `agent-chat-demo` using **DeepAgents JS** + **Gemini API** (`gemini-3.1-flash-lite`).

## CLI (independent of web UI)

```bash
export GEMINI_API_KEY=...

pnpm agent:plan "Plan a 7-day trip: Tokyo 3 nights, Kyoto 2 nights"
pnpm agent:execute --session <sessionId from plan>
```

Sessions persist under `.deep-agent/sessions/` for cross-process CLI use.

## Web UI

```bash
pnpm dev
```

## Configuration

See `.env.example` and [docs/rfc/0001-deepagents-gemini-chat-demo.md](docs/rfc/0001-deepagents-gemini-chat-demo.md).
