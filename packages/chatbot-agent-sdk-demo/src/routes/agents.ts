/**
 * GET /api/agents
 *
 * Returns the list of all agents loaded from both root and local .claude/agents/.
 * Demonstrates that the app has successfully merged monorepo-level Claude Code
 * agent definitions with package-level agent definitions.
 */

import { Router } from "express";
import { loadResources } from "../agent/index.js";

export const agentsRouter = Router();

agentsRouter.get("/api/agents", async (_req, res) => {
  try {
    const { agentSummary } = await loadResources();
    res.json({ agents: agentSummary });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to load agents",
    });
  }
});
