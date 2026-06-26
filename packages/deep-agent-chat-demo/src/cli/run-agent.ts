#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import type { ChatMessage, ChatRequest } from '../shared/chat.js';
import { deepAgentWorkspace } from '../shared/workspace.js';
import { runChat } from '../agents/deepagent-runner.js';

type CliPhase = 'plan' | 'execute';

function printUsage(): void {
  console.error(`Usage:
  agent:plan "<message>" [--history ./history.json]
  agent:execute --session <sessionId> [--history ./history.json] [--message "<message>"]`);
}

function parseArgs(argv: string[]): {
  phase: CliPhase;
  message: string;
  sessionId?: string;
  historyPath?: string;
} {
  const phase = argv[2] as CliPhase;
  if (phase !== 'plan' && phase !== 'execute') {
    throw new Error('First argument must be plan or execute.');
  }

  let message = '';
  let sessionId: string | undefined;
  let historyPath: string | undefined;

  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--session') {
      sessionId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--history') {
      historyPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--message') {
      message = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (!arg.startsWith('--') && !message) {
      message = arg;
    }
  }

  if (phase === 'execute' && !sessionId?.trim()) {
    throw new Error('execute requires --session <sessionId> from a prior plan run.');
  }

  return { phase, message, sessionId, historyPath };
}

function loadHistory(historyPath?: string): ChatMessage[] {
  if (!historyPath) {
    return [];
  }
  const resolved = path.resolve(historyPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw) as ChatMessage[];
}

async function main(): Promise<void> {
  process.chdir(deepAgentWorkspace);
  try {
    const { phase, message, sessionId, historyPath } = parseArgs(process.argv);
    const request: ChatRequest = {
      phase,
      message,
      history: loadHistory(historyPath),
      ...(phase === 'execute' ? { sessionId } : {}),
    };

    const response = await runChat(request);
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('First argument')) {
      printUsage();
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

void main();
