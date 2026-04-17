# Roadmap

Planned features that aren't shipped yet, with a short note on why they're blocked or still in the "soon" bucket. Issues and PRs discussing any of these are welcome.

## Resume a previous session

**Goal** — offer a "Continue last" action in the UI so the user can pick up a conversation started earlier (from the mobile app, claude.ai/code, or the CLI) in a single tap, without having to re-explain context.

**Status** — partially implemented, currently hidden from the UI.

A `continueConversation` flag is still wired through the API (`POST /api/sessions/start`) and the tmux helper (`server/utils/tmux.ts`). When true, the server runs `claude --continue` in a tmux pane and then types `/remote-control` once the TUI is ready.

The reason it is not exposed to the user today:

- `claude --continue` only resumes conversations whose transcript was persisted locally at `~/.claude/projects/<encoded-dir>/*.jsonl`. Those files are written by the **interactive CLI** (`claude` run in a terminal).
- Sessions driven through `claude remote-control` — which is the mode Launchpad uses by default, and the mode the mobile/web Claude app talks to — do **not** write those transcript files. The conversation state lives server-side at Anthropic and is addressed by an opaque session ID, not by a local file.
- Result: after a typical Launchpad session (launched from the UI, used from the mobile app, killed), there is nothing local for `--continue` to find, and the button only ever "worked" in the narrow case where the user had *also* run `claude` manually on the server in that directory beforehand. That's surprising enough to be worse than not having the button.

**What we would need to finish this**

Either of the following upstream changes to `claude remote-control` would unblock a real "Continue" flow:

1. **A resume flag that targets a bridge/cloud session by ID** — e.g. `claude remote-control --session-id <uuid>` that *actually* resumes the named session instead of (as of `2.1.112`) only influencing internal mode selection. The flag is already parsed by the CLI but the handler never passes the ID to the bridge session creation call.
2. **A way to list the recent bridge sessions for a given directory from the CLI**, so Launchpad can show a picker instead of a single "Continue last" button.

Until one of those lands, any "continue" button in the UI would either be misleading or would need to fall back to the interactive-CLI flow, which is not what users expect from a remote-control launcher. The backend code path stays in the repo (dormant, with a comment pointing here) so wiring it up is a small change once upstream is ready.
