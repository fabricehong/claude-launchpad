# Claude Launchpad

> Launch and manage Claude Code sessions on a remote Linux machine, then code from the official Claude mobile app or claude.ai/code — anywhere.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Claude Launchpad is a minimalist web UI that starts `claude remote-control` sessions on a server you own, so you can pilot them from the official Claude mobile/web app without ever opening a terminal.

<p align="center">
  <img src="./docs/demo.gif" alt="Claude Launchpad demo — browse project directories, select one, launch a Claude Code session" width="700">
</p>

## Why

Anthropic ships a built-in **Remote Control** feature in Claude Code: once a session runs on your machine with `claude remote-control`, you can drive it from the Claude mobile app or claude.ai/code. The catch — *you still have to SSH in and start that session yourself*, from a terminal, every time you want to begin a new task.

That's where Claude Launchpad comes in. It runs on your server as a small web app. From your phone or laptop browser, you:

1. Open the Launchpad URL
2. Pick a project directory
3. Tap **Launch**

A `claude remote-control` session spawns in a tmux pane on the server. The session then shows up instantly in your Claude mobile app's session picker, and you code from there — with all your server-side MCP servers, tools, and project configuration available. Your laptop can stay closed.

**Claude Launchpad is not a terminal emulator.** It intentionally has no embedded xterm. The actual coding experience happens in the official Claude app — Launchpad is just the remote-accessible "start button".

## How it compares

| Tool | Web UI | Embedded terminal | Purpose |
|------|--------|-------------------|---------|
| **Claude Launchpad** | ✅ mobile-first | ❌ (by design) | Launch/kill sessions for the Claude mobile app to pick up |
| [Codeman](https://github.com/Ark0N/Codeman) | ✅ | ✅ xterm.js | Full web terminal with 20 parallel sessions |
| [247-claude-code-remote](https://github.com/QuivrHQ/247-claude-code-remote) | ✅ | ✅ | Mobile terminal via Cloudflare Tunnel |
| [claudecodeui](https://github.com/siteboon/claudecodeui) | ✅ | ✅ | Web GUI replacement for the Claude CLI |

If you want to *type* into a terminal from your phone, pick one of the others. If you want to *start sessions* that the official Claude app then takes over, you're in the right place.

## Features

- 📱 Mobile-first responsive UI (tabs on small screens, two-column on desktop)
- 📂 Browse any subdirectory under a configurable root
- 🚀 Launch `claude remote-control --spawn=same-dir` in a fresh tmux session
- 👀 Live tmux pane output viewer for debugging
- ☠️ One-click kill for any session
- 🔐 Stateless header-based auth

## Requirements

On the remote server:

- **Node.js 22+** (installed via [nvm](https://github.com/nvm-sh/nvm) is fine)
- **tmux** — `apt install tmux` / `brew install tmux`
- **Claude Code** — [installed and signed in](https://docs.claude.com/en/docs/claude-code/quickstart) on the server
- A reachable port (or reverse-proxy) for the web UI

## Quick start

```bash
git clone https://github.com/<your-user>/claude-launchpad.git
cd claude-launchpad
npm install
cp .env.example .env
# Edit .env — at minimum set AUTH_PASSWORD, CLAUDE_BIN, ROOT_DIR
npm run build      # compiles the React client into server/public/
npm start          # serves everything from Express
```

Visit `http://<your-server>:3456`.

## Development

```bash
npm run dev
```

Starts the Express API on `:3456` and the Vite dev server on `:5173` (Vite proxies `/api` to Express). Hot reload for both.

## Configuration

All config lives in `.env` (see [.env.example](./.env.example)):

| Variable | Purpose |
|----------|---------|
| `PORT` | Port the server listens on (default `3456`) |
| `AUTH_USERNAME` | Username for the login screen |
| `AUTH_PASSWORD` | Password for the login screen — **change this!** |
| `CLAUDE_BIN` | Absolute path to the `claude` binary (tmux panes don't inherit nvm's shell init) |
| `ROOT_DIR` | Base directory users are allowed to browse (e.g. `/root`, `/home/youruser`, `/Users/youruser`) |

## Running persistently

The app itself should survive SSH disconnects. Easiest approach — wrap it in tmux:

```bash
tmux new -s launchpad
npm start
# Detach: Ctrl+B then D
```

Or use a systemd unit, pm2, Docker, etc. Any process supervisor works.

## Exposing safely

The built-in auth is a minimal shared-secret check over plaintext headers. Before exposing Launchpad to the public internet you **must** either:

- Put it behind HTTPS with a reverse proxy (nginx, Caddy, Traefik), **or**
- Keep it on a private network (Tailscale, WireGuard, ZeroTier), **or**
- Bind it to localhost and reach it via SSH port-forwarding

Opening port 3456 directly without TLS exposes your credentials in cleartext. Don't.

## Architecture

Full-stack TypeScript, single `package.json`. In production, the React build is served statically by the Express API — one process, one port.

```
server/
├── index.ts              # Express entry point
├── middleware/auth.ts    # x-username / x-password header check
├── routes/
│   ├── browse.ts         # GET /api/browse?path=
│   └── sessions.ts       # GET/POST /api/sessions{,/start,/kill,/output/:name}
└── utils/tmux.ts         # All tmux interactions (ls, new-session, send-keys, kill, capture-pane)

client/src/
├── App.tsx               # Auth + tab state
├── components/           # FileBrowser, SessionList, AuthScreen, LaunchBar, …
├── hooks/                # useBrowse, useSessions (5s polling)
└── api.ts                # All fetch calls, credentials injected as headers
```

tmux is the session-persistence backend today, but the abstraction is small (all of `server/utils/tmux.ts`) — swapping to systemd user units or another process manager is a focused change.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features that aren't implemented yet and the upstream work they're waiting on.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for known issues, including the "session created but not visible in the Claude app" bug (related to [anthropics/claude-code#44805](https://github.com/anthropics/claude-code/issues/44805)).

## Contributing

Issues and PRs welcome. For non-trivial changes, please open an issue first to discuss the approach.

## License

[MIT](./LICENSE)
