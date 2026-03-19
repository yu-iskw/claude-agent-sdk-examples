/**
 * slack-transport.ts
 *
 * Stub Slack transport for future Slack bot extension.
 *
 * ## How to implement:
 *
 * 1. Install dependencies:
 *    pnpm add @slack/web-api @slack/bolt
 *
 * 2. Replace the stub methods with real Slack API calls:
 *    - sendChunk: append text to a streaming Slack message (using chat.update)
 *    - sendToolUse: post an ephemeral "Claude is using tool X..." message
 *    - sendDone: finalize the Slack message
 *    - sendError: post an error message in the thread
 *
 * 3. Create a Bolt app in server.ts:
 *    const boltApp = new App({ token, signingSecret });
 *    boltApp.message(async ({ message, say }) => {
 *      const transport = new SlackTransport(client, channel, threadTs);
 *      await runAgentQuery({ message: message.text, transport });
 *    });
 *
 * ## Example implementation sketch:
 *
 *   import { WebClient } from "@slack/web-api";
 *   export class SlackTransport implements Transport {
 *     private buffer = "";
 *     private ts: string | undefined;
 *     constructor(
 *       private client: WebClient,
 *       private channel: string,
 *       private threadTs?: string
 *     ) {}
 *
 *     async sendChunk(text: string) {
 *       this.buffer += text;
 *       if (this.ts) {
 *         await this.client.chat.update({ channel: this.channel, ts: this.ts, text: this.buffer });
 *       } else {
 *         const res = await this.client.chat.postMessage({
 *           channel: this.channel, text: this.buffer, thread_ts: this.threadTs
 *         });
 *         this.ts = res.ts as string;
 *       }
 *     }
 *     async sendToolUse(toolName: string) { ... }
 *     async sendDone(sessionId: string) { ... }
 *     async sendError(error: Error) { ... }
 *   }
 */

import type { Transport } from "./interface.js";

/**
 * Placeholder Slack transport.
 * Replace with a real implementation when adding Slack bot support.
 */
export class SlackTransport implements Transport {
  constructor(
    private readonly channel: string,
    private readonly threadTs?: string
  ) {}

  async sendChunk(text: string): Promise<void> {
    // TODO: implement with @slack/web-api chat.postMessage / chat.update
    console.log(`[SlackTransport] chunk → #${this.channel}: ${text.slice(0, 50)}`);
  }

  async sendToolUse(toolName: string, _input: unknown): Promise<void> {
    console.log(`[SlackTransport] tool_use → #${this.channel}: ${toolName}`);
  }

  async sendDone(sessionId: string): Promise<void> {
    console.log(
      `[SlackTransport] done → #${this.channel} (session: ${sessionId})`
    );
  }

  async sendError(error: Error): Promise<void> {
    console.error(`[SlackTransport] error → #${this.channel}: ${error.message}`);
  }
}
