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
