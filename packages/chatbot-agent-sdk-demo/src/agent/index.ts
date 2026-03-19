/**
 * agent/index.ts
 *
 * Core agent orchestration layer. Wires together:
 *  - Claude Agent SDK query()
 *  - .claude/ resource loading (agents, skills, settings, CLAUDE.md)
 *  - Sandbox configuration
 *  - Context7 MCP server
 *  - Transport abstraction (for web SSE or future Slack)
 *
 * Key SDK features demonstrated:
 *  - settingSources: ["project"] → loads this package's CLAUDE.md + settings.json
 *  - options.agents  → programmatically defined agents from .claude/agents/*.md
 *  - options.sandbox → network + filesystem restrictions
 *  - options.mcpServers → context7 for doc lookup
 *  - session resume via options.resume
 */

import path from "path";
import { fileURLToPath } from "url";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { loadAgents, loadSkills } from "./claude-loader.js";
import { sandboxConfig } from "./sandbox-config.js";
import type { Transport } from "../transport/interface.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve paths relative to the package root (two levels up from src/agent/)
const PACKAGE_ROOT = path.resolve(__dirname, "../../");
const ROOT_CLAUDE_DIR = path.resolve(PACKAGE_ROOT, "../../.claude");
const LOCAL_CLAUDE_DIR = path.resolve(PACKAGE_ROOT, ".claude");

export interface AgentQueryOptions {
  message: string;
  agentName?: string;
  sessionId?: string;
  transport: Transport;
  /** Model override — defaults to claude-opus-4-6 */
  model?: string;
}

export interface AgentResources {
  agents: Record<string, import("@anthropic-ai/claude-agent-sdk").AgentDefinition>;
  agentSummary: Array<{ name: string; source: string; description: string }>;
  skillsText: string;
}

/** Cached resources so we don't re-read the filesystem on every request */
let cachedResources: AgentResources | null = null;

/**
 * Load (and cache) agents and skills from both root and local .claude/ dirs.
 * Call this once at server startup via warmUp().
 */
export async function loadResources(): Promise<AgentResources> {
  if (cachedResources) return cachedResources;

  const [{ agents, summary }, { referenceText }] = await Promise.all([
    loadAgents(ROOT_CLAUDE_DIR, LOCAL_CLAUDE_DIR),
    loadSkills(ROOT_CLAUDE_DIR, LOCAL_CLAUDE_DIR),
  ]);

  cachedResources = { agents, agentSummary: summary, skillsText: referenceText };

  console.log(
    `[agent] Loaded ${Object.keys(agents).length} agents: ${Object.keys(agents).join(", ")}`
  );

  return cachedResources;
}

/**
 * Pre-warm the resource cache at server startup.
 */
export async function warmUp(): Promise<void> {
  await loadResources();
}

/**
 * Run a single-turn (or resumed) agent query, streaming all events to the
 * provided Transport. The Transport abstraction lets us swap HTTP/SSE for
 * Slack or any other channel without touching this function.
 *
 * SDK options used:
 *  - settingSources: ["project"]   → loads CLAUDE.md + .claude/settings.json
 *  - systemPrompt preset           → full Claude Code system prompt
 *  - agents                        → merged from root + local .claude/agents/
 *  - agent                         → selects which agent handles the request
 *  - sandbox                       → network + filesystem restrictions
 *  - mcpServers.context7           → @upstash/context7-mcp for docs
 *  - includePartialMessages        → stream text deltas in real time
 *  - resume                        → resume a previous session by ID
 *  - cwd                           → package root (so settingSources works)
 */
export async function runAgentQuery(opts: AgentQueryOptions): Promise<void> {
  const { message, agentName, sessionId, transport, model } = opts;
  const { agents, skillsText } = await loadResources();

  // Build the system prompt appendix: inject skills reference from .claude/skills/
  const systemPromptAppend = skillsText
    ? `\n\n${skillsText}`
    : undefined;

  try {
    const q = query({
      prompt: message,
      options: {
        // Working directory = package root so settingSources finds .claude/
        cwd: PACKAGE_ROOT,

        // Load CLAUDE.md + .claude/settings.json (permissions, hooks) from cwd
        settingSources: ["project"],

        // Full Claude Code system prompt with optional skills appendix
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          ...(systemPromptAppend ? { append: systemPromptAppend } : {}),
        },

        // Model — default to claude-opus-4-6 per skill guidance
        model: model ?? "claude-opus-4-6",

        // Programmatically loaded agents from .claude/agents/ (both root + local)
        agents,

        // Select which agent handles this request (falls back to default if undefined)
        ...(agentName ? { agent: agentName } : {}),

        // Resume a previous session by ID
        ...(sessionId ? { resume: sessionId } : {}),

        // Sandbox: network + filesystem restrictions
        sandbox: sandboxConfig,

        // Context7 MCP server for up-to-date documentation lookup
        mcpServers: {
          context7: {
            type: "stdio",
            command: "npx",
            args: ["-y", "@upstash/context7-mcp"],
          },
        },

        // Stream partial assistant message events (text deltas)
        includePartialMessages: true,

        // Reasonable cap on agentic turns per request
        maxTurns: 30,

        // In-process hook: log tool use (mirrors .claude/hooks/log-tool-use.sh)
        hooks: {
          PostToolUse: [
            {
              matcher: "Bash|Write|Edit",
              hooks: [
                async (input) => {
                  const i = input as {
                    tool_name?: string;
                    hook_event_name?: string;
                  };
                  await transport.sendToolUse(
                    i.tool_name ?? "unknown",
                    input
                  );
                  return {};
                },
              ],
            },
          ],
        },
      },
    });

    let currentSessionId: string | undefined;

    for await (const msg of q) {
      switch (msg.type) {
        case "system":
          if (msg.subtype === "init") {
            currentSessionId = msg.session_id;
          }
          break;

        case "assistant": {
          // Full assistant message — extract text blocks and stream them
          for (const block of msg.message.content) {
            if (block.type === "text" && block.text) {
              await transport.sendChunk(block.text);
            }
          }
          break;
        }

        case "stream_event": {
          // Partial streaming delta (requires includePartialMessages: true)
          const event = msg.event;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            await transport.sendChunk(event.delta.text);
          }
          break;
        }

        case "result":
          // Final result — signal completion with the session ID
          await transport.sendDone(currentSessionId ?? "");
          break;

        default:
          // task_progress, task_notification, etc. — ignore for now
          break;
      }
    }
  } catch (err) {
    await transport.sendError(
      err instanceof Error ? err : new Error(String(err))
    );
  }
}
