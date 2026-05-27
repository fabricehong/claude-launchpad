# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project**: Claude Launchpad — web app to launch and manage `claude remote-control` sessions on a remote Linux machine, so the user can then code from the Claude mobile app or claude.ai/code.

## Commands

```bash
npm run dev          # start both server (tsx watch) and Vite dev server concurrently
npm run build        # compile React frontend into server/public/ (production)
npm start            # run production server (requires build first)
npx tsc --noEmit                        # type-check server code
cd client && npx tsc --noEmit          # type-check client code
```

### Applying changes in prod (dev-in-prod)

This repo *is* the deployment on the Hetzner droplet (`/root/claude-launchpad`). It runs as the systemd service `claude-launchpad.service` (via `tsx` on the TS source, port 3456, served at https://claude.active-prompts.com). To push edits made directly here into the live app:

```bash
cd /root/claude-launchpad
npm run build                               # ONLY if you touched client/ — recompiles the React app into server/public/
systemctl restart claude-launchpad.service  # picks up server changes (tsx runs the .ts source directly)
```

- **Server-only changes** (`server/**`) → just `systemctl restart`, no build needed.
- **Client changes** (`client/**`) → `npm run build` first (prod serves the compiled bundle from `server/public/`), then restart. Vite doesn't empty `server/public/assets/`, so old hashed bundles accumulate — clean up the ones `index.html` no longer references.
- `KillMode=process` in the unit means running tmux / `claude --remote-control` sessions survive the restart.
- Verify: `systemctl is-active claude-launchpad.service` (should be `active`, not a looping `activating`) and `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3456` (should be `200`).
- Full deployment doc (systemd unit rationale, Caddy/UFW/DNS, troubleshooting): `/root/droplet-guide/apps/claude-launchpad/deployment.md`.

## Architecture

Full-stack TypeScript app: Express backend + React/Vite frontend, single repo, single `package.json`.

**In production**, `npm run build` outputs the React app into `server/public/`. Express serves it statically and handles all API routes under `/api/*`. One process, one port (`PORT` in `.env`, default 3456).

**In dev**, Vite runs on `:5173` and proxies `/api` to `:3456` (configured in `client/vite.config.ts`).

### Server (`server/`)

- `index.ts` — Express entry point, static serving, route mounting
- `middleware/auth.ts` — stateless auth via `x-username` / `x-password` headers on all `/api/*` routes
- `routes/browse.ts` — `GET /api/browse?path=` — lists non-hidden subdirectories; path must stay under `ROOT_DIR`
- `routes/sessions.ts` — `GET /api/sessions`, `POST /api/sessions/start`, `POST /api/sessions/kill`, `GET /api/sessions/output/:name`
- `utils/tmux.ts` — all tmux interactions (`tmux ls`, `new-session`, `send-keys`, `kill-session`, `capture-pane`)

### Client (`client/src/`)

- `api.ts` — all fetch calls (`listSessions`, `startSession`, `getSessionOutput`, `killSession`, `browse`); credentials injected as headers on every request
- `App.tsx` — auth state, tab state (mobile), toast state; renders `FileBrowser` + `SessionList`
- `hooks/useBrowse.ts` — fetches `GET /api/browse`, tracks `rootDir` (set once from first response, never hardcoded)
- `hooks/useSessions.ts` — fetches sessions, polls every 5 seconds

### Key design decisions

- **No hardcoded `/root`** — `ROOT_DIR` comes from `.env` server-side; client discovers the root from the first browse API response
- **Auth is stateless** — credentials live in React state only (no localStorage, no cookies, no JWT); lost on tab close
- **tmux = session persistence** — each claude session is a named tmux session; `claude --remote-control <label>` is sent via `send-keys`
- **Mobile layout** — two-column grid on desktop, tab-based (`Browse` / `Sessions`) on mobile (≤700px via CSS classes in `index.css`)

## Environment variables

See `.env.example`. Key variables:
- `ROOT_DIR` — base directory users can browse (e.g. `/root` on a Linux server, `/Users/yourname` locally)
- `CLAUDE_BIN` — full path to the `claude` binary (needed because nvm paths aren't in tmux's environment)

## Conventions

- **Project memories live here, not in auto-memory.** Any preference, invariant, or working-agreement that Claude should retain across conversations belongs in this file (or in a doc delegated from here), not in `~/.claude/projects/.../memory/`. Auto-memory is per-machine and unversioned; this file is the source of truth.
- **A session's identifier is its full tmux name (including the `" - default"` / `" - fast"` suffix).** The `default` mode launches `claude` with no `--model` flag (inheriting the CLI's configured default); the `fast` mode passes `--model sonnet` (evergreen alias for the latest Sonnet). All uniqueness and lookup logic must operate on the full name, not on the base. Two sessions sharing a base but in different modes are distinct identifiers and may coexist. Never duplicate the suffix concatenation across layers — it lives in `suffixedName()` in `server/utils/tmux.ts` and the server is authoritative (the frontend asks `/api/sessions/suggest` for free names rather than recomputing them). The `/kill` and `/output` routes still accept the legacy `" - pro"` suffix so sessions launched before the rename remain manageable.
