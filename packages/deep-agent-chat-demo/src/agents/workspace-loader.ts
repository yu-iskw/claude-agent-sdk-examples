import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { SubAgent } from 'deepagents';
import { deepAgentWorkspace } from '../shared/workspace.js';

export type AgentMarkdownSpec = {
  name: string;
  description: string;
  body: string;
  tools: string[];
  skills: string[];
  model?: string;
};

export type WorkspaceResources = {
  agentsMd: string;
  rulesText: string;
  agentSpecs: AgentMarkdownSpec[];
  skillNames: string[];
  settings: Record<string, unknown>;
};

const agentsDir = path.join(deepAgentWorkspace, '.agents', 'agents');
const skillsDir = path.join(deepAgentWorkspace, '.agents', 'skills');
const rulesDir = path.join(deepAgentWorkspace, '.agents', 'rules');
const agentsMdPath = path.join(deepAgentWorkspace, 'AGENTS.md');
const settingsPath = path.join(deepAgentWorkspace, '.agents', 'settings.json');

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u.exec(content);
  if (!match) {
    return { meta: {}, body: content.trim() };
  }
  const meta = parseYaml(match[1]) as Record<string, unknown>;
  return { meta, body: match[2].trim() };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export function loadAgentMarkdown(filePath: string): AgentMarkdownSpec {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const name = typeof meta.name === 'string' ? meta.name : path.basename(filePath, '.md');
  const description = typeof meta.description === 'string' ? meta.description : `Subagent ${name}`;
  return {
    name,
    description,
    body,
    tools: asStringArray(meta.tools),
    skills: asStringArray(meta.skills),
    model: typeof meta.model === 'string' ? meta.model : undefined,
  };
}

export function loadWorkspaceResources(): WorkspaceResources {
  const agentsMd = fs.existsSync(agentsMdPath) ? fs.readFileSync(agentsMdPath, 'utf8') : '';

  const settings = fs.existsSync(settingsPath)
    ? (JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>)
    : {};

  const agentFiles = fs
    .readdirSync(agentsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(agentsDir, file));

  const agentSpecs = agentFiles.map(loadAgentMarkdown);
  const names = new Set<string>();
  for (const spec of agentSpecs) {
    if (names.has(spec.name)) {
      throw new Error(`Duplicate agent name in workspace: ${spec.name}`);
    }
    names.add(spec.name);
  }

  const skillNames = fs.existsSync(skillsDir)
    ? fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

  const ruleFiles = fs.existsSync(rulesDir)
    ? fs.readdirSync(rulesDir).filter((file) => file.endsWith('.md'))
    : [];
  const rulesText = ruleFiles
    .map((file) => fs.readFileSync(path.join(rulesDir, file), 'utf8'))
    .join('\n\n');

  return { agentsMd, rulesText, agentSpecs, skillNames, settings };
}

export function buildSubagents(specs: AgentMarkdownSpec[]): SubAgent[] {
  return specs
    .filter((spec) => spec.name !== 'trip-planner')
    .map((spec) => ({
      name: spec.name,
      description: spec.description,
      systemPrompt: spec.body,
      ...(spec.skills.length > 0
        ? { skills: spec.skills.map((skill) => `/.agents/skills/${skill}/`) }
        : {}),
    }));
}

export function tripPlannerSystemPrompt(resources: WorkspaceResources): string {
  const tripPlanner = resources.agentSpecs.find((spec) => spec.name === 'trip-planner');
  const body = tripPlanner?.body ?? 'You are the trip planner coordinator.';
  return [resources.agentsMd, resources.rulesText, body].filter(Boolean).join('\n\n');
}
