import fs from 'node:fs';
import path from 'node:path';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { ChatRequest, ChatResponse } from '../shared/chat.js';
import { claudeWorkspace } from './config.js';

const context7ConfigPath = path.join(claudeWorkspace, '.mcp.json');

type McpConfig = Record<
  string,
  {
    command: string;
    args?: string[];
  }
>;

function loadMcpServers(): McpConfig {
  const file = fs.readFileSync(context7ConfigPath, 'utf8');
  return JSON.parse(file) as McpConfig;
}

function extractAssistantText(messages: SDKMessage[]): string {
  const assistantMessages = messages.filter((message): message is Extract<SDKMessage, { type: 'assistant' }> => message.type === 'assistant');
  const lastAssistant = assistantMessages.at(-1);
  if (!lastAssistant) {
    return 'No assistant response was generated.';
  }

  const textBlocks = lastAssistant.message.content.filter(
    (block: unknown): block is { type: 'text'; text: string } =>
      typeof block === 'object' && block !== null && 'type' in block && block.type === 'text' && 'text' in block,
  );

  return textBlocks
    .map((block: { type: 'text'; text: string }) => block.text)
    .join('\n\n')
    .trim();
}

function buildPrompt(request: ChatRequest): string {
  const transcript = request.history
    .slice(-6)
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.text}`)
    .join('\n');

  const modeInstruction =
    request.mode === 'slack'
      ? 'Bias toward Slack-bot-ready answers. Reuse the workspace skill for Slack extension planning when helpful.'
      : 'Bias toward delivering product-quality web app answers and implementation details.';

  return [
    'You are running inside the isolated workspace for the agent-chat-demo app.',
    'You must follow the local CLAUDE.md and the .claude directory settings, rules, agents, and skills from this workspace.',
    'Use Context7 whenever you need current library or framework documentation.',
    modeInstruction,
    transcript ? `Recent transcript:\n${transcript}` : 'No recent transcript.',
    `Latest user message:\n${request.message}`,
  ].join('\n\n');
}

export async function runChat(request: ChatRequest): Promise<ChatResponse> {
  const stream = query({
    prompt: buildPrompt(request),
    options: {
      cwd: claudeWorkspace,
      settingSources: ['project'],
      agent: request.mode === 'slack' ? 'slack-solution-architect' : 'app-builder',
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append:
          'Operate like a collaborative product engineer. Keep answers concise, explain tradeoffs, and mention how the app can evolve into a Slack bot when relevant.',
      },
      permissionMode: 'dontAsk',
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true,
        allowUnsandboxedCommands: false,
        network: {
          allowedDomains: ['docs.anthropic.com', 'platform.claude.com', 'github.com', 'raw.githubusercontent.com', 'registry.npmjs.org'],
          allowLocalBinding: true,
        },
        filesystem: {
          allowRead: [claudeWorkspace],
          allowWrite: [claudeWorkspace],
          denyWrite: [path.join(claudeWorkspace, '..')],
        },
      },
      mcpServers: loadMcpServers(),
      maxTurns: 10,
      promptSuggestions: true,
      env: {
        ...process.env,
        CLAUDE_AGENT_SDK_CLIENT_APP: '@typescript-template/agent-chat-demo',
      },
    },
  });

  const messages: SDKMessage[] = [];
  for await (const message of stream) {
    messages.push(message);
  }

  return {
    reply: extractAssistantText(messages),
    sessionId: messages.find((message): message is Extract<SDKMessage, { session_id: string }> => 'session_id' in message)?.session_id,
    trace: {
      workspace: claudeWorkspace,
      sandboxed: true,
      loadedProjectConfig: true,
      activeAgent: request.mode === 'slack' ? 'slack-solution-architect' : 'app-builder',
      mcpServers: Object.keys(loadMcpServers()),
    },
  };
}
