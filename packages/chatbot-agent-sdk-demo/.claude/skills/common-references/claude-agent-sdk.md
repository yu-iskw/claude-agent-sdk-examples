# Claude Agent SDK — Quick Reference

This document provides key patterns for using `@anthropic-ai/claude-agent-sdk` in this app.

## Core Entry Point

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({ prompt: "...", options: { ... } })) {
  if ("result" in message) console.log(message.result);
}
```

## Loading .claude/ Resources

```typescript
// settingSources: ["project"] loads .claude/settings.json + CLAUDE.md relative to cwd
options: {
  settingSources: ["project"],
  systemPrompt: { type: "preset", preset: "claude_code" },
}
```

## Programmatic Agent Definitions

Loaded via `claude-loader.ts` from markdown frontmatter:

```typescript
type AgentDefinition = {
  description: string;
  tools?: string[];
  prompt: string;
  model?: "sonnet" | "opus" | "haiku" | "inherit";
  skills?: string[];
};
```

## Session Management

```typescript
import { listSessions, getSessionMessages } from "@anthropic-ai/claude-agent-sdk";

const sessions = await listSessions({ limit: 20 });
const messages = await getSessionMessages(sessionId, { limit: 50 });
// Resume: options: { resume: sessionId }
```

## Streaming Message Types

| Type | When | Key Fields |
|------|------|-----------|
| `system` + `init` | Session start | `session_id` |
| `assistant` | Full response chunk | `message.content` |
| `result` | Session end | `result`, `stop_reason` |
| `system` + `task_progress` | Tool use progress | `usage` |

## Sandbox Configuration

```typescript
options: {
  sandbox: {
    enabled: true,
    network: { allowLocalBinding: true, allowedDomains: ["api.anthropic.com"] },
    filesystem: { allowWrite: ["/tmp", cwd], denyRead: ["/etc/shadow"] },
  }
}
```

## Context7 MCP Server

```typescript
mcpServers: {
  context7: { type: "stdio", command: "npx", args: ["-y", "@upstash/context7-mcp"] }
}
```
