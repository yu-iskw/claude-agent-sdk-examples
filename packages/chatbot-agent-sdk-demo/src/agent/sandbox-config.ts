/**
 * Sandbox configuration for the chatbot agent.
 *
 * Mirrors the sandboxing behavior of Claude Code CLI, restricting:
 * - Filesystem writes to /tmp and the project working directory
 * - Network access to allowed domains only
 * - Sensitive paths denied for reads
 *
 * Adjust `allowedDomains` for production deployments.
 */

import type { SandboxSettings } from "@anthropic-ai/claude-agent-sdk";

export const sandboxConfig: SandboxSettings = {
  enabled: true,
  // Still require explicit approval for bash even when sandboxed
  autoAllowBashIfSandboxed: false,
  network: {
    // Allow the server itself to bind to local ports
    allowLocalBinding: true,
    // Whitelist outbound network access
    allowedDomains: [
      "api.anthropic.com",
      "registry.npmjs.org",
      "upstash.io",
      "context7.io",
    ],
    // Restrict to only the domains above
    allowManagedDomainsOnly: false,
  },
  filesystem: {
    // Allow writes only to safe paths
    allowWrite: ["/tmp", process.cwd()],
    // Block reads of sensitive system files
    denyRead: ["/etc/shadow", "/etc/passwd", "/root/.ssh"],
  },
};
