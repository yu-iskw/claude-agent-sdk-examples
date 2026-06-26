import type { ActivityEvent, ChatSseEnvelope } from '../../shared/activity';
import type { ChatResponse } from '../../shared/chat';

const MAX_SSE_BUFFER_CHARS = 2_000_000;

/** Append decoded chunk to buffer with a hard cap to avoid unbounded growth on malformed streams. */
export function appendSseBuffer(buffer: string, chunk: string): string {
  const next = buffer + chunk;
  if (next.length > MAX_SSE_BUFFER_CHARS) {
    return next.slice(-MAX_SSE_BUFFER_CHARS);
  }
  return next;
}

/**
 * Split a buffer on SSE event boundaries (`\n\n`) and parse `data:` JSON payloads.
 * Returns the unparsed tail for the next chunk.
 */
export function extractSseEnvelopes(buffer: string): {
  rest: string;
  envelopes: ChatSseEnvelope[];
} {
  const envelopes: ChatSseEnvelope[] = [];
  let rest = buffer;
  let sep: number;
  while ((sep = rest.indexOf('\n\n')) !== -1) {
    const block = rest.slice(0, sep);
    rest = rest.slice(sep + 2);
    const dataLines = block.split('\n').filter((line) => line.startsWith('data:'));
    if (dataLines.length === 0) {
      continue;
    }
    const json = dataLines.map((line) => line.replace(/^data:\s?/, '')).join('\n');
    try {
      envelopes.push(JSON.parse(json) as ChatSseEnvelope);
    } catch {
      /* malformed chunk; skip */
    }
  }
  return { rest, envelopes };
}

export type ChatStreamHandlers = {
  onActivity: (event: ActivityEvent) => void;
  signal?: AbortSignal;
};

/**
 * Read a `text/event-stream` body until a `done` or `error` envelope is received.
 */
export async function readChatSseResponse(
  body: ReadableStream<Uint8Array>,
  handlers: ChatStreamHandlers,
): Promise<ChatResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer = appendSseBuffer(buffer, decoder.decode(value, { stream: true }));
    const { rest, envelopes } = extractSseEnvelopes(buffer);
    buffer = rest;

    for (const envelope of envelopes) {
      if (envelope.type === 'activity') {
        handlers.onActivity(envelope.event);
      }
      if (envelope.type === 'error') {
        await reader.cancel();
        throw new Error(envelope.error);
      }
      if (envelope.type === 'done') {
        await reader.cancel();
        return envelope.response;
      }
    }
  }

  await reader.cancel();
  throw new Error('Stream ended without a done event.');
}
