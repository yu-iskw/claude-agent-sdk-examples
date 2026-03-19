/**
 * server.ts — Express HTTP server entry point
 *
 * Responsibilities:
 *  1. Serve the static ChatGPT-like web UI from public/
 *  2. Mount API routes (chat, sessions, agents, health)
 *  3. Pre-warm the agent resource cache (load .claude/ agents + skills)
 *  4. Log loaded agents and the settings sources being used
 *
 * Run with:
 *   ANTHROPIC_API_KEY=... pnpm start
 *
 * Or for development (requires prior `pnpm build`):
 *   ANTHROPIC_API_KEY=... pnpm dev
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { chatRouter } from "./routes/chat.js";
import { sessionsRouter } from "./routes/sessions.js";
import { agentsRouter } from "./routes/agents.js";
import { healthRouter } from "./routes/health.js";
import { warmUp } from "./agent/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../src/public");

const PORT = Number(process.env["PORT"] ?? 3000);

// Validate API key at startup
if (!process.env["ANTHROPIC_API_KEY"]) {
  console.error(
    "[server] ERROR: ANTHROPIC_API_KEY environment variable is not set."
  );
  console.error("[server] Set it with: export ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static frontend — served from src/public/ (not compiled, plain HTML/JS)
app.use(express.static(PUBLIC_DIR));

// API routes
app.use(healthRouter);
app.use(agentsRouter);
app.use(sessionsRouter);
app.use(chatRouter);

// Catch-all: serve index.html for SPA routing
app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Start server
app.listen(PORT, async () => {
  console.log(`[server] Chatbot Agent SDK Demo listening on http://localhost:${PORT}`);
  console.log(`[server] Settings source: "project" → loads .claude/settings.json + CLAUDE.md`);
  console.log(`[server] Sandbox: enabled (network + filesystem restrictions)`);
  console.log(`[server] MCP: context7 (@upstash/context7-mcp)`);

  // Pre-warm: load .claude/ resources at startup
  try {
    await warmUp();
  } catch (err) {
    console.warn(
      "[server] Warning: failed to pre-warm agent resources:",
      err instanceof Error ? err.message : err
    );
  }
});
