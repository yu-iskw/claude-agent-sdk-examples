import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

function textFromAssistantMessage(message: Extract<SDKMessage, { type: 'assistant' }>): string {
  const textBlocks = message.message.content.filter(
    (block: unknown): block is { type: 'text'; text: string } =>
      typeof block === 'object' &&
      block !== null &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block &&
      typeof (block as { text: unknown }).text === 'string',
  );
  return textBlocks
    .map((block: { type: 'text'; text: string }) => block.text)
    .join('\n\n')
    .trim();
}

/**
 * Joins text from every `assistant` SDK message in stream order. Plan-phase orchestration
 * parsing needs the full model output when the stream splits across multiple assistant turns.
 */
export function concatenateAssistantText(messages: SDKMessage[]): string {
  const assistantMessages = messages.filter(
    (message): message is Extract<SDKMessage, { type: 'assistant' }> =>
      message.type === 'assistant',
  );
  if (assistantMessages.length === 0) {
    return 'No assistant response was generated.';
  }
  return assistantMessages
    .map((message) => textFromAssistantMessage(message))
    .filter((chunk) => chunk.length > 0)
    .join('\n\n')
    .trim();
}
