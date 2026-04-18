# Claude Launchpad

> Launch Claude Code sessions on a remote Linux machine and drive them from the Claude mobile app or claude.ai/code — code, notes, research, inbox, anywhere.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Claude Launchpad is a minimalist web UI that starts `claude remote-control` sessions on a server you own, so you can pilot them from the official Claude mobile/web app without ever opening a terminal.

<p align="center">
  <img src="./docs/demo.gif" alt="Claude Launchpad demo — browse project directories, select one, launch a Claude Code session" width="700">
</p>

## Why

Anthropic ships a built-in **Remote Control** feature in Claude Code: once a session runs on your machine with `claude remote-control`, you can drive it from the Claude mobile app or claude.ai/code. The catch — *you still have to SSH in and start that session yourself*, from a terminal, every time you want to begin a new task.

That's the friction Launchpad removes. It runs on your server as a small web app. From your phone or laptop browser, you:

1. Open the Launchpad URL
2. Pick a directory
3. Tap **Launch**

The interesting bit is step 2. **Each directory on your server is effectively a pre-configured agent** — its `CLAUDE.md` shapes the behaviour, it has access to specific files (a code repo, a notes vault, a dataset), and to whichever MCP servers the host runs. Picking a directory = picking which agent you're starting. Going from *"one coding session on the go"* to *"a dozen task-specific agents I can start in three taps from my phone"* is what turns the [scenarios below](#beyond-the-launcher--what-actually-runs) from nice ideas into things you actually run.

A `claude remote-control` session spawns in a tmux pane with that directory as its working context, and shows up in your Claude mobile app's session picker. Your laptop can stay closed.

**Claude Launchpad is not a terminal emulator.** It has no embedded xterm, by design. The work happens in the official Claude app — Launchpad is just the remote-accessible *start button*.

## Beyond the launcher — what actually runs

Once a Claude Code session is up on your server, the official Claude app can drive it through anything that session has access to — your code, your notes, and whatever MCP servers you've wired in. A few concrete scenarios people run:

- 📓 *"Add to my project X journal: client just validated the migration plan"* — or *"remind me what we agreed on Saferpay pricing last month"*. Claude writes to the right spot in your Obsidian vault (commit + push), or reads across notes to answer.
- 💻 *"Add password-reset to my app with tests and open the PR"* — dictated from a train. Your server already has the deps, DB access, and MCPs wired up; Claude works, pushes, opens the PR.
- 📚 *"Survey the current open-source vector DBs, comparison format"* — Claude researches the web, drops a sourced note in the right folder of your vault.
- 🤖 *"Triage this morning's inbox by priority, draft 3 replies, block 30 min Monday for the two prospects"* — via email and calendar MCP servers, one prompt.

Claude Launchpad is the *start button*. The actual work is done by Claude Code, your MCP servers, and your own data — none of which ship with this project. See [Use cases in detail](#use-cases-in-detail) at the bottom for prompts and setup per scenario.

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
- 🚀 Launch `claude --remote-control` in a fresh tmux session
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

> ⚠️ **systemd + MCP servers**: systemd units don't inherit your login shell's `PATH`. If your projects use `.mcp.json` with servers launched via `uv`, `pipx`, or anything in `~/.local/bin`, the MCP servers will fail to spawn silently. Add the binary directories to your unit's `Environment="PATH=..."`. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for details.

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

## Use cases in detail

Each of these assumes a Claude Code session launched via Claude Launchpad and driven from the Claude mobile app. The heavy lifting is Claude Code + your MCP servers + your own files — Launchpad only starts the session so the mobile app can pick it up.

### 📓 Your digital memory — capture and recall

**Prompt (write)**: *"Add to my project X journal: client validated the migration plan, refused option B. Next step: draft the migration risk doc."*

**Prompt (read)**: *"Remind me what we agreed with Marc on the Saferpay pricing last month."*

**What happens**: Claude opens your Obsidian vault (mounted on the server and kept in sync via Git), finds the right file using the conventions documented in the vault's own `CLAUDE.md`, appends the new entry in your usual format, commits, pushes. For reads, it greps across notes, cross-references dates, and returns a synthesis with links to the source notes.

**Setup**: Obsidian vault hosted on the server, synced to/from your laptop via Git. An Obsidian MCP server is optional — for many setups, plain file access is enough since the vault is just Markdown.

### 💻 Building an app from anywhere

**Prompt**: *"Add a password-reset flow to the backend: endpoint, tests, DB migration. Open a PR when done."*

**What happens**: Claude works in the repo checked out on your server, iterates on files, runs your test suite, commits, pushes the branch, opens the pull request. Because everything runs server-side, the session has full access to your usual DB, env vars, and dev dependencies — not a sandboxed cloud with partial tooling.

**Setup**: the repo cloned on the server, a `CLAUDE.md` at the project root documenting conventions, any project-specific MCPs (issue tracker, CI, etc.) registered for Claude Code on the server. For authenticated PR creation, a Git host token on the server.

### 📚 Research and synthesis into your vault

**Prompt**: *"Survey open-source vector databases actively maintained in 2026. Compare pricing, query performance, and ecosystem integrations. Drop the result in my 'Tech watch' folder with sources cited."*

**What happens**: Claude browses the web (via its built-in search/fetch), extracts the comparison data, formats the result according to your vault's note template, and creates a new file in the folder you specified — sources linked at the bottom. You read the note in Obsidian when you open your laptop.

**Setup**: vault accessible on the server, a templates folder, and vault conventions described in the vault's `CLAUDE.md` so Claude knows where notes go by topic.

### 🤖 Inbox and calendar automation

**Prompt**: *"Triage this morning's inbox by priority given my current projects. Draft replies to the three most urgent. Block 30 minutes on Monday morning for the two prospects."*

**What happens**: via an email MCP server, Claude reads incoming messages and ranks them against project context it pulls from your vault. Via a calendar MCP server, it creates the focus block. Drafts are written to your email client's draft folder — you review and hit send when you're ready.

**Setup**: an email MCP server and a calendar MCP server configured for Claude Code on the server. Optionally, your vault's `CLAUDE.md` defining what "urgent" means for your current projects.

## Contributing

Issues and PRs welcome. For non-trivial changes, please open an issue first to discuss the approach.

## License

[MIT](./LICENSE)
