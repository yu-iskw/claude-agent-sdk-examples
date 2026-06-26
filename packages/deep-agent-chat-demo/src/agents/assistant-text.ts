import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage } from '@langchain/core/messages';

function textFromAiMessage(message: AIMessage): string {
  const content = message.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((block) => {
      if (typeof block === 'string') {
        return block;
      }
      if (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'text' &&
        'text' in block &&
        typeof block.text === 'string'
      ) {
        return block.text;
      }
      return '';
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n\n')
    .trim();
}

export function concatenateAssistantText(messages: BaseMessage[]): string {
  const assistantMessages = messages.filter((message) => AIMessage.isInstance(message));
  if (assistantMessages.length === 0) {
    return 'No assistant response was generated.';
  }
  return assistantMessages
    .map((message) => textFromAiMessage(message))
    .filter((chunk) => chunk.length > 0)
    .join('\n\n')
    .trim();
}
