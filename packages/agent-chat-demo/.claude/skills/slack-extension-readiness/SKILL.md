---
name: slack-extension-readiness
description: Evaluate how the chatbot workspace can be extended into a Slack bot without duplicating prompts, agents, or skills.
---

# Slack Extension Readiness

When this skill is used:

1. Identify which runtime concerns should stay shared across web and Slack (session orchestration, prompt assembly, skills, and agent registry).
2. Separate transport-specific concerns (web UI, Slack events, slash commands, installation flow).
3. Recommend a minimal next step that keeps the current workspace reusable.
4. Call out any `.claude` resources that should remain app-local versus promoted to a shared package later.
