import fs from 'node:fs';
import path from 'node:path';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { deepAgentWorkspace } from '../shared/workspace.js';
import { createWeatherTool } from './tools/weather-tool.js';

export type McpLoadResult = {
  tools: StructuredToolInterface[];
  serverNames: string[];
};

type McpJson = Record<
  string,
  {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }
>;

const MAX_TOOL_OUTPUT_CHARS = 8_000;

let cachedExecuteTools: McpLoadResult | undefined;

function wrapToolWithPolicy(
  tool: StructuredToolInterface,
  serverName: string,
): StructuredToolInterface {
  const originalInvoke = tool.invoke.bind(tool);
  return {
    ...tool,
    invoke: async (input, config) => {
      const output = await originalInvoke(input, config);
      const serialized = typeof output === 'string' ? output : JSON.stringify(output);
      if (serialized.length > MAX_TOOL_OUTPUT_CHARS) {
        return `${serialized.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n...[truncated by policy:${serverName}]`;
      }
      return typeof output === 'string' ? output : serialized;
    },
  } as StructuredToolInterface;
}

function loadMcpJson(): McpJson {
  const filePath = path.join(deepAgentWorkspace, '.mcp.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as McpJson;
}

async function loadExecuteMcpTools(): Promise<McpLoadResult> {
  const configured = loadMcpJson();
  const enableContext7 = process.env.DEEP_AGENT_ENABLE_CONTEXT7 === 'true';
  const filteredEntries = Object.entries(configured).filter(
    ([name]) => enableContext7 || name !== 'context7',
  );
  const serverNames = filteredEntries.map(([name]) => name);
  let mcpTools: StructuredToolInterface[] = [];

  if (filteredEntries.length > 0) {
    const client = new MultiServerMCPClient({
      mcpServers: Object.fromEntries(
        filteredEntries.map(([name, cfg]) => [
          name,
          {
            transport: 'stdio' as const,
            command: cfg.command,
            args: cfg.args ?? [],
            env: cfg.env,
          },
        ]),
      ),
      onConnectionError: 'ignore',
    });

    try {
      const timeoutMs = Number(process.env.DEEP_AGENT_MCP_TIMEOUT_MS ?? 5_000);
      mcpTools = await Promise.race([
        client.getTools(),
        new Promise<StructuredToolInterface[]>((_, reject) => {
          setTimeout(() => reject(new Error('MCP tool load timed out')), timeoutMs);
        }),
      ]);
    } catch (error) {
      console.warn('MCP tools failed to load:', error instanceof Error ? error.message : error);
      mcpTools = [];
    }
  }

  const weatherTool = createWeatherTool();
  return {
    tools: [...mcpTools.map((toolItem) => wrapToolWithPolicy(toolItem, 'mcp')), weatherTool],
    serverNames: [...serverNames, 'weatherTools'],
  };
}

export async function loadMcpToolsForPhase(phase: 'plan' | 'execute'): Promise<McpLoadResult> {
  if (phase === 'plan') {
    return { tools: [], serverNames: [] };
  }
  if (!cachedExecuteTools) {
    cachedExecuteTools = await loadExecuteMcpTools();
  }
  return cachedExecuteTools;
}
