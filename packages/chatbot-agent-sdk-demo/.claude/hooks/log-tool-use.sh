#!/usr/bin/env bash
# PostToolUse hook: logs tool invocations to .claude/tool-use.log
# Triggered after Bash, Write, and Edit operations.
# Mirrors the pattern from root .claude/hooks/format-ts.sh

LOG_FILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/tool-use.log"

# Read the tool use event from stdin (JSON)
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "${TIMESTAMP} [tool_use] ${TOOL_NAME}" >> "$LOG_FILE" 2>/dev/null || true
