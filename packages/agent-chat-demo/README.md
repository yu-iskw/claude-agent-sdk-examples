# agent-chat-demo

A ChatGPT-style demo web app that runs Claude Agent SDK from an isolated workspace under `packages/agent-chat-demo`.

![Demo](./docs/assets/demo.png)

## Why this package exists

- Demonstrates how a product app can keep its own `.claude/` directory and `CLAUDE.md` separate from the repo root.
- Loads project settings with `settingSources: ['project']` so the SDK behaves like Claude Code inside the app workspace.
- Enables SDK sandboxing and constrains the workspace to this package.
- Mounts the Context7 MCP plugin via `.mcp.json` for fresh documentation lookup.
- Keeps future Slack-bot guidance in local markdown agents and skills.

## How the chat experience works

This app runs a two-phase chat loop (SDK orchestration mode, then approved tool execution):

- When you send a message, the backend runs **orchestration phase** (no tools).
- The assistant’s response is expected to contain an **orchestration JSON block** (a fenced code block with an optional `json` language tag; the client validates that it parses as valid orchestration JSON).
- The client parses that orchestration and renders it as a structured list (agents/skills/stages + edges) in the orchestration message card, with a **TODO-style checklist** on **research steps** and **nodes**:
  - **Manual**: you toggle checkboxes (while the plan is active, or read-only when the plan is inactive).
  - **SDK estimate**: a best-effort automatic check when streamed [`ActivityEvent`](src/shared/activity.ts) text (tasks, summaries) appears to mention a step snippet (first 120 chars) or a node `id` / `name`. This is heuristic and may not match real execution order.
  - Unchecking sets a **pending** override so a wrong SDK match does not re-check the row.
  - Activity for hints is accumulated **per plan message** (plan stream + matching execute stream) so checks can still resolve after the sidebar live feed resets. **Discard plan** clears checklist + activity for that plan; older plans in the transcript keep their saved toggles until you start a new chat path.
- After orchestration finishes, a **plan approval dock** appears above the composer. You must check the box and click **Approve & run with tools**.
- When approved, the backend runs **execute phase** using the plan’s returned session id and enables tool use inside the sandbox.
- The left sidebar shows:
  - **Live activity**: Server-Sent Events stream of SDK-grounded events (session init, subagent tasks, tool progress, etc.) while a request runs. This is runtime telemetry from the Agent SDK, not the model-authored orchestration graph shown in chat.
  - Parse warnings when orchestration JSON can’t be parsed/validated
  - Runtime trace details (phase, workspace, sandboxed status, configured agent, MCP servers loaded, plus optional fields from SDK `system/init`: session model, permission mode, available agents/skills)

## Key endpoints

- `POST /api/chat`: runs either `phase: "plan"` or `phase: "execute"`
  - Default: JSON body in, JSON [`ChatResponse`](src/shared/chat.ts) out (same as before).
  - Streaming: send header `Accept: text/event-stream`. The response is SSE: repeated `data:` lines with JSON envelopes `{ "type": "activity", "event": … }` (see [`ActivityEvent`](src/shared/activity.ts)), then a final `{ "type": "done", "response": ChatResponse }` or `{ "type": "error", "error": "…" }`.
- `GET /api/health`: returns `{ ok: true }`

## Main implementation modules

- Client
  - `src/client/useChat.ts`: React state wiring + plan approval control
  - `src/client/api/chatApi.ts`: `fetch` wrappers for `POST /api/chat` (JSON and SSE)
  - `src/client/api/parseChatSse.ts`: SSE buffer parsing for the streaming client
  - `src/client/activityLabels.ts`: human-readable labels for activity events
  - `src/client/chat/transform.ts`: pure transformers for turning `ChatResponse` into chat state/messages
  - `src/client/chat/orchestrationChecklist.ts`: pure helpers for SDK-suggested vs manual checklist state
- Server
  - `src/server/index.ts`: Express app + static client serving
  - `src/server/http/apiRoutes.ts`: HTTP route registration for `/api/health` and `/api/chat`
- `src/agents/agent-runner.ts`: SDK `query()` orchestration (plan vs execute), optional per-message activity emission, trace wiring
- `src/agents/sdk-activity.ts`: maps `SDKMessage` → `ActivityEvent[]` and derives trace extras from `system/init`
- `src/agents/prompt.ts`: pure prompt builder extracted from `agent-runner.ts`
- `src/agents/trace.ts`: dependency-injected trace builder extracted from `agent-runner.ts`
- Shared
  - `src/shared/orchestration.ts`: orchestration JSON extraction/validation helpers (already unit-tested)
  - `src/shared/activity.ts`: versioned `ActivityEvent` union and SSE envelope types

## Scripts

```bash
pnpm --filter @typescript-template/agent-chat-demo dev
pnpm --filter @typescript-template/agent-chat-demo build
pnpm --filter @typescript-template/agent-chat-demo test
```
