import {
  createDeepAgent,
  createHarnessProfile,
  FilesystemBackend,
  type DeepAgent,
} from 'deepagents';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ChatPhase } from '../shared/chat.js';
import { deepAgentWorkspace } from '../shared/workspace.js';
import type { ModelConfig } from './deepagent-models.js';
import { getSharedCheckpointer } from './deepagent-session.js';
import {
  buildSubagents,
  loadWorkspaceResources,
  type WorkspaceResources,
} from './workspace-loader.js';

const FILESYSTEM_TOOLS = [
  'ls',
  'read_file',
  'write_file',
  'edit_file',
  'glob',
  'grep',
  'execute',
  'write_todos',
] as const;

const planHarnessProfile = createHarnessProfile({
  excludedTools: [...FILESYSTEM_TOOLS, 'task'],
  generalPurposeSubagent: { enabled: false },
});

const executeHarnessProfile = createHarnessProfile({
  excludedTools: [...FILESYSTEM_TOOLS],
  generalPurposeSubagent: { enabled: false },
});

const denyAllPermissions = [
  { operations: ['read', 'write'] as const, paths: ['/**'], mode: 'deny' as const },
];

const executePermissions = [
  { operations: ['read'] as const, paths: ['/AGENTS.md', '/.agents/**'], mode: 'allow' as const },
  {
    operations: ['read', 'write'] as const,
    paths: ['/**/.env*', '/**/node_modules/**', '/**/dist/**'],
    mode: 'deny' as const,
  },
  { operations: ['write'] as const, paths: ['/**'], mode: 'deny' as const },
];

let cachedResources: WorkspaceResources | undefined;

export function getWorkspaceResources(): WorkspaceResources {
  if (!cachedResources) {
    cachedResources = loadWorkspaceResources();
  }
  return cachedResources;
}

export function createPlanAgent(systemPrompt: string, modelConfig: ModelConfig): DeepAgent {
  return createDeepAgent({
    model: modelConfig.chatModel,
    tools: [],
    subagents: [],
    systemPrompt,
    checkpointer: getSharedCheckpointer(),
    // harnessProfile is supported at runtime but missing from upstream CreateDeepAgentParams types.
    // @ts-expect-error deepagents harnessProfile typing lags runtime API
    harnessProfile: planHarnessProfile,
    permissions: denyAllPermissions,
  });
}

export function createExecuteAgent(
  systemPrompt: string,
  tools: StructuredToolInterface[],
  modelConfig: ModelConfig,
): DeepAgent {
  const resources = getWorkspaceResources();
  const backend = new FilesystemBackend({
    rootDir: deepAgentWorkspace,
    virtualMode: true,
  });

  return createDeepAgent({
    model: modelConfig.chatModel,
    tools,
    subagents: buildSubagents(resources.agentSpecs),
    systemPrompt,
    memory: ['/AGENTS.md'],
    skills: ['/.agents/skills/'],
    backend,
    checkpointer: getSharedCheckpointer(),
    // harnessProfile is supported at runtime but missing from upstream CreateDeepAgentParams types.
    // @ts-expect-error deepagents harnessProfile typing lags runtime API
    harnessProfile: executeHarnessProfile,
    permissions: executePermissions,
  });
}

export function describeActiveProfile(phase: ChatPhase): string {
  return phase === 'plan' ? 'deepagents-plan' : 'deepagents-execute-approved';
}
