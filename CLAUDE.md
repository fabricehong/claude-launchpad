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
- `middleware/auth.ts` — `POST /api/login` / `POST /api/logout` (public) and `requireAuth`, which checks the signed `lp_session` cookie on every other `/api/*` route
- `routes/browse.ts` — `GET /api/browse?path=` — lists non-hidden subdirectories; path must stay under `ROOT_DIR`
- `routes/sessions.ts` — `GET /api/sessions`, `POST /api/sessions/start`, `POST /api/sessions/kill`, `GET /api/sessions/output/:name`
- `utils/tmux.ts` — all tmux interactions (`tmux ls`, `new-session`, `send-keys`, `kill-session`, `capture-pane`)

### Client (`client/src/`)

- `api.ts` — all fetch calls (`listSessions`, `startSession`, `getSessionOutput`, `killSession`, `browse`); auth rides on the session cookie; any 401 triggers the handler set by `setUnauthorizedHandler` (App → back to login)
- `App.tsx` — auth state, tab state (mobile), toast state; renders `FileBrowser` + `SessionList`
- `hooks/useBrowse.ts` — fetches `GET /api/browse`, tracks `rootDir` (set once from first response, never hardcoded)
- `hooks/useSessions.ts` — fetches sessions, polls every 5 seconds

### Key design decisions

- **No hardcoded `/root`** — `ROOT_DIR` comes from `.env` server-side; client discovers the root from the first browse API response
- **Auth = signed HttpOnly cookie, 3 weeks** — `lp_session=<expiresAt>.<HMAC>`; the HMAC key is derived from `AUTH_PASSWORD`, so there's no extra secret and changing the password logs everyone out. Fixed expiry (no sliding). The password is never stored client-side (no localStorage, no credentials in headers).
- **PWA** — hand-written `client/public/manifest.webmanifest` + `sw.js` (no `vite-plugin-pwa`). The service worker caches **nothing** on purpose: it only exists to make the app installable; the app is useless offline and a cache would risk stale bundles.
- **tmux = session persistence** — each claude session is a named tmux session; `claude --remote-control <label>` is sent via `send-keys`
- **Mobile layout** — two-column grid on desktop, tab-based (`Browse` / `Sessions`) on mobile (≤700px via CSS classes in `index.css`)

## Environment variables

See `.env.example`. Key variables:
- `ROOT_DIR` — base directory users can browse (e.g. `/root` on a Linux server, `/Users/yourname` locally)
- `CLAUDE_BIN` — full path to the `claude` binary (needed because nvm paths aren't in tmux's environment)

## Conventions

- **Project memories live here, not in auto-memory.** Any preference, invariant, or working-agreement that Claude should retain across conversations belongs in this file (or in a doc delegated from here), not in `~/.claude/projects/.../memory/`. Auto-memory is per-machine and unversioned; this file is the source of truth.
- **A session's identifier is its full tmux name (including the `" - <model>"` suffix, e.g. `" - opus"`).** The chosen model is the `claude --model` alias, and it is **always passed explicitly** (`--model <alias>`), including on `--continue`. This matters: without an explicit `--model`, `claude --continue` reuses the resumed conversation's original model rather than the newly selected one — the source of the "relaunched as X but it's still the old model" bug. The model catalogue (`MODELS`) and default (`DEFAULT_MODEL`) live in `server/utils/tmux.ts` and are the single source of truth; the frontend fetches them from `GET /api/sessions/models` and never hardcodes the list. Aliases are evergreen (`opus`/`sonnet`/`haiku`/`fable` each track the latest model in their family) — prefer aliases over dated IDs so the list stays current without code changes. All uniqueness and lookup logic must operate on the full name, not on the base. Two sessions sharing a base but in different models are distinct identifiers and may coexist. Never duplicate the suffix concatenation across layers — it lives in `suffixedName()` and the server is authoritative (the frontend asks `/api/sessions/suggest` for free names rather than recomputing them). The `/kill` and `/output` routes still accept the legacy `" - default"` / `" - pro"` / `" - fast"` suffixes so sessions launched before the model-list change remain manageable.
- **Known limitation — the cloud (mobile) session name can lag on `--continue`.** Because we deliberately do **not** pass `--fork-session`, a `--continue` reuses the original conversation's session ID and its Remote Control identity, so claude.ai / the mobile app may keep showing the *original* session's name (and it stays served by the live local process — there is no orphan). The **model** is still correct (thanks to the explicit `--model` above); only the displayed cloud name can be stale. Adding `--fork-session` in `startSession()` would fix the name but start a fresh session ID — a deliberate trade-off we've chosen against.
