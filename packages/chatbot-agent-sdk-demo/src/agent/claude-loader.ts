/**
 * claude-loader.ts
 *
 * Loads Claude Code CLI resources from .claude/ directories and converts them
 * into programmatic objects for use with the Claude Agent SDK.
 *
 * This is the core module demonstrating how apps can leverage .claude/ resources:
 *  - Agents: parse markdown frontmatter → AgentDefinition objects
 *  - Skills: read SKILL.md files → reference text for system prompts
 *  - CLAUDE.md: project memory automatically loaded via settingSources
 *
 * Searches both the monorepo root .claude/ AND this package's .claude/:
 *   rootClaudeDir  = ../../.claude/  (verifier, code-reviewer, etc.)
 *   localClaudeDir = ./.claude/      (chat-assistant, code-helper, research-assistant)
 *
 * Package-level agents override root agents with the same name.
 */

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

export interface LoadedAgents {
  agents: Record<string, AgentDefinition>;
  /** Human-readable list of agent names and their sources */
  summary: Array<{ name: string; source: string; description: string }>;
}

export interface LoadedSkills {
  /** Concatenated skill summaries for injection into system prompts */
  referenceText: string;
  /** Individual skill names found */
  names: string[];
}

/**
 * Parse a single .claude/agents/*.md file into an AgentDefinition.
 * The file must have YAML frontmatter with at least `name` and `description`.
 */
function parseAgentFile(
  filePath: string,
  raw: string
): { name: string; definition: AgentDefinition } | null {
  try {
    const { data, content } = matter(raw);
    if (!data.name || typeof data.name !== "string") return null;
    if (!data.description || typeof data.description !== "string") return null;

    const definition: AgentDefinition = {
      description: data.description,
      prompt: content.trim(),
    };

    if (Array.isArray(data.tools)) definition.tools = data.tools as string[];
    if (Array.isArray(data.disallowedTools))
      definition.disallowedTools = data.disallowedTools as string[];
    if (Array.isArray(data.skills)) definition.skills = data.skills as string[];
    if (typeof data.maxTurns === "number") definition.maxTurns = data.maxTurns;
    if (
      data.model &&
      data.model !== "inherit" &&
      ["sonnet", "opus", "haiku"].includes(data.model as string)
    ) {
      definition.model = data.model as "sonnet" | "opus" | "haiku";
    }

    return { name: data.name as string, definition };
  } catch {
    console.warn(`[claude-loader] Failed to parse agent file: ${filePath}`);
    return null;
  }
}

/**
 * Load all agents from a .claude/agents/ directory.
 * Returns an empty map if the directory doesn't exist.
 */
async function loadAgentsFromDir(
  claudeDir: string
): Promise<Map<string, { definition: AgentDefinition; source: string }>> {
  const agentsDir = path.join(claudeDir, "agents");
  const result = new Map<
    string,
    { definition: AgentDefinition; source: string }
  >();

  try {
    const files = await fs.readdir(agentsDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(agentsDir, file);
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = parseAgentFile(filePath, raw);
        if (parsed) {
          result.set(parsed.name, {
            definition: parsed.definition,
            source: filePath,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Directory doesn't exist — normal for root .claude/ if running standalone
  }

  return result;
}

/**
 * Load all agents from both root and local .claude/agents/ directories.
 *
 * Precedence: local (package) agents override root agents with the same name.
 * This lets packages customize or extend root-level agent behaviour.
 *
 * @param rootClaudeDir  Path to the monorepo root .claude/ directory
 * @param localClaudeDir Path to this package's .claude/ directory
 */
export async function loadAgents(
  rootClaudeDir: string,
  localClaudeDir: string
): Promise<LoadedAgents> {
  const [rootAgents, localAgents] = await Promise.all([
    loadAgentsFromDir(rootClaudeDir),
    loadAgentsFromDir(localClaudeDir),
  ]);

  // Merge: local takes precedence
  const merged = new Map([...rootAgents, ...localAgents]);

  const agents: Record<string, AgentDefinition> = {};
  const summary: LoadedAgents["summary"] = [];

  for (const [name, { definition, source }] of merged) {
    agents[name] = definition;
    summary.push({ name, source, description: definition.description });
  }

  return { agents, summary };
}

/**
 * Load skill names and brief descriptions from .claude/skills/<name>/SKILL.md files.
 * Returns concatenated reference text suitable for system prompt injection.
 */
async function loadSkillsFromDir(claudeDir: string): Promise<string[]> {
  const skillsDir = path.join(claudeDir, "skills");
  const snippets: string[] = [];

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
      try {
        const raw = await fs.readFile(skillFile, "utf8");
        const { data, content } = matter(raw);
        // Extract just the first paragraph as a brief description
        const firstPara = content.trim().split(/\n\n/)[0] ?? "";
        const name = data.name ?? entry.name;
        const desc = data.description ?? firstPara.slice(0, 200);
        snippets.push(`- **${name}**: ${desc}`);
      } catch {
        // No SKILL.md or unreadable — skip
      }
    }
  } catch {
    // Skills directory doesn't exist
  }

  return snippets;
}

/**
 * Load skills from both root and local .claude/skills/ directories.
 * Used to build the "available skills" section of the system prompt.
 */
export async function loadSkills(
  rootClaudeDir: string,
  localClaudeDir: string
): Promise<LoadedSkills> {
  const [rootSnippets, localSnippets] = await Promise.all([
    loadSkillsFromDir(rootClaudeDir),
    loadSkillsFromDir(localClaudeDir),
  ]);

  const allSnippets = [...rootSnippets, ...localSnippets];

  if (allSnippets.length === 0) {
    return { referenceText: "", names: [] };
  }

  const referenceText = [
    "## Available Skills (from .claude/skills/)",
    "",
    ...allSnippets,
  ].join("\n");

  const names = allSnippets.map(
    (s) => s.match(/\*\*([^*]+)\*\*/)?.[1] ?? "unknown"
  );

  return { referenceText, names };
}
