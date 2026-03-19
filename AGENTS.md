# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a TypeScript monorepo template using pnpm workspaces. The sole package is `packages/common` which exports a `greet()` utility. There are no external services, databases, or Docker dependencies.

### Quick reference

All standard commands (`build`, `test`, `lint`, `format`) are documented in `CLAUDE.md` and `README.md`. Key commands:

| Task | Command |
|---|---|
| Install deps | `pnpm install` |
| Build | `pnpm build` |
| Test | `pnpm test` |
| Lint (ESLint) | `pnpm lint:eslint` |
| Format (Prettier) | `pnpm format:prettier` |

### Non-obvious caveats

- **Trunk CLI unavailable in Cloud Agent VMs**: The Trunk CLI (`trunk check`, `trunk fmt`) requires downloading its backend binary from `trunk.io`, which is blocked by network egress restrictions. Use `pnpm lint:eslint` and `pnpm format:prettier` instead of `pnpm lint` and `pnpm format` (which delegate to Trunk).
- **esbuild build scripts warning**: `pnpm install` emits a warning about ignored build scripts for `esbuild@0.27.2`. This is benign — Vitest falls back to esbuild's WASM version. Do **not** run `pnpm approve-builds` (interactive). Tests and builds work fine without the native binary.
- **Node.js version**: The project requires Node.js 24.13.0 (pinned in `.node-version`). The update script handles this via `nvm`.
- **pnpm via corepack**: After switching Node versions with nvm, pnpm must be activated via `corepack enable && corepack prepare pnpm@10.28.1 --activate`.
