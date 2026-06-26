import type { ChatRequest, ChatResponse } from '../../shared/chat';
import type { ChatStreamHandlers } from './parseChatSse';
import { readChatSseResponse } from './parseChatSse';

/**
 * Minimal API adapter for the `/api/chat` endpoint.
 * Keeps networking + response validation out of React state logic.
 */
export async function postChat(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const payload = (await response.json()) as ChatResponse | { error: string };
  if (!response.ok || 'error' in payload) {
    const message = 'error' in payload ? payload.error : 'Request failed.';
    throw new Error(message);
  }

  return payload;
}

/**
 * Streaming chat: same JSON body as `postChat`, but `Accept: text/event-stream`.
 * Emits SDK-derived {@link import('../../shared/activity').ActivityEvent} values until the final `ChatResponse`.
 */
export async function postChatStream(
  request: ChatRequest,
  handlers: ChatStreamHandlers,
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    signal: handlers.signal,
  });

  let errorMessage = `Request failed (${response.status}).`;
  if (!response.ok) {
    try {
      const errBody = (await response.json()) as { error?: string };
      if (typeof errBody.error === 'string') {
        errorMessage = errBody.error;
      }
    } catch {
      /* use default */
    }
    throw new Error(errorMessage);
  }

  const stream = response.body;
  if (!stream) {
    throw new Error('Empty response body.');
  }

  return readChatSseResponse(stream, handlers);
}
