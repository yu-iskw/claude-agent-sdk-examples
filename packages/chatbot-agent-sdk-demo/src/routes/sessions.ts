/**
 * Session management endpoints.
 *
 * GET  /api/sessions                    → list recent sessions
 * GET  /api/sessions/:id/messages       → get message history for a session
 */

import { Router } from "express";
import { getSessions, getHistory } from "../agent/session-manager.js";

export const sessionsRouter = Router();

sessionsRouter.get("/api/sessions", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
    const sessions = await getSessions(limit);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to list sessions",
    });
  }
});

sessionsRouter.get("/api/sessions/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
    const messages = await getHistory(id, limit);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to get session messages",
    });
  }
});
