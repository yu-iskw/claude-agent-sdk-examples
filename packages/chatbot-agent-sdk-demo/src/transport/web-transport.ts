/**
 * web-transport.ts
 *
 * HTTP Server-Sent Events (SSE) implementation of the Transport interface.
 *
 * SSE event format:
 *   data: {"type":"chunk","text":"Hello"}
 *   data: {"type":"tool_use","toolName":"Read","input":{...}}
 *   data: {"type":"done","sessionId":"..."}
 *   data: {"type":"error","message":"..."}
 */

import type { Response } from "express";
import type { Transport } from "./interface.js";

export class WebTransport implements Transport {
  private readonly res: Response;

  constructor(res: Response) {
    this.res = res;
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.res.writableEnded) {
      this.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }

  async sendChunk(text: string): Promise<void> {
    this.send({ type: "chunk", text });
  }

  async sendToolUse(toolName: string, input: unknown): Promise<void> {
    this.send({ type: "tool_use", toolName, input });
  }

  async sendDone(sessionId: string): Promise<void> {
    this.send({ type: "done", sessionId });
  }

  async sendError(error: Error): Promise<void> {
    this.send({ type: "error", message: error.message });
  }
}
