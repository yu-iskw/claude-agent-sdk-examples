/**
 * transport/interface.ts
 *
 * Abstract Transport interface that decouples agent logic from the delivery channel.
 *
 * The agent orchestrator (agent/index.ts) calls these methods as messages arrive.
 * Different channels implement this interface:
 *   - WebTransport   → HTTP Server-Sent Events (current)
 *   - SlackTransport → Slack Web API (future extension)
 *
 * Extending to Slack:
 *   1. Implement SlackTransport with @slack/web-api
 *   2. Wire up Bolt/Socket Mode in server.ts
 *   3. Pass SlackTransport instance to runAgentQuery()
 *   — No changes needed in agent/index.ts or routes/
 */

export interface Transport {
  /**
   * Send a partial or complete text chunk from the assistant.
   * Called for each streaming text delta.
   */
  sendChunk(text: string): Promise<void>;

  /**
   * Notify the client that a tool was used.
   * Used for showing "thinking..." indicators or audit logs.
   */
  sendToolUse(toolName: string, input: unknown): Promise<void>;

  /**
   * Signal that the agent has finished responding.
   * @param sessionId The session ID for resumption in future requests.
   */
  sendDone(sessionId: string): Promise<void>;

  /**
   * Send an error to the client.
   */
  sendError(error: Error): Promise<void>;
}
