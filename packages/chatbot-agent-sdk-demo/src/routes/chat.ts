/**
 * POST /api/chat
 *
 * Streaming chat endpoint using Server-Sent Events (SSE).
 *
 * Request body (JSON):
 *   {
 *     "message":   string,           // User's chat message
 *     "agentName": string | null,    // Optional: select a loaded agent by name
 *     "sessionId": string | null,    // Optional: resume a previous session
 *     "model":     string | null     // Optional: override the default model
 *   }
 *
 * SSE event stream:
 *   data: {"type":"chunk","text":"..."}       ← streaming text delta
 *   data: {"type":"tool_use","toolName":"..."} ← agent used a tool
 *   data: {"type":"done","sessionId":"..."}   ← conversation ended
 *   data: {"type":"error","message":"..."}    ← error occurred
 *
 * The frontend EventSource client in public/app.js consumes this stream.
 */

import { Router, type Request, type Response } from "express";
import { runAgentQuery } from "../agent/index.js";
import { WebTransport } from "../transport/web-transport.js";

export const chatRouter = Router();

interface ChatRequestBody {
  message?: string;
  agentName?: string | null;
  sessionId?: string | null;
  model?: string | null;
}

chatRouter.post("/api/chat", async (req: Request, res: Response) => {
  const body = req.body as ChatRequestBody;
  const message = body.message?.trim();

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  const transport = new WebTransport(res);

  await runAgentQuery({
    message,
    agentName: body.agentName ?? undefined,
    sessionId: body.sessionId ?? undefined,
    model: body.model ?? undefined,
    transport,
  });

  if (!res.writableEnded) {
    res.end();
  }
});
