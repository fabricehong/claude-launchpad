# Troubleshooting

Known issues and their resolutions when running Claude Launchpad on a remote Linux server.

## "Session created" in UI but nothing usable in the Claude mobile app

**Symptom**

The app returns `ok: true` when starting a claude session in a given directory, but:

- The tmux pane shows `·✔︎· Ready` with `Capacity: 0/32` (instead of `Connected` and `1/32`)
- No session appears in the Claude mobile/web app for that environment
- Or the session appears but messages from the mobile fail with *"GitHub repository access check failed"*

**Root cause**

The Anthropic API performs a **GitHub App authorization check** when the target directory is a git repository whose `origin` points to **github**. If the repository is not authorized in the user's [Claude GitHub App](https://github.com/apps/claude), the session-creation call returns:

```
POST /v1/environments/bridge/.../sessions
-> 400 Bad Request
source: Extra inputs are not permitted
```

The local `claude remote-control` server handles this error **silently** — it enters a poll loop and never retries the initial session creation. The TUI keeps displaying `Ready` / `0/32` with no visible error. The Claude Launchpad backend sees a non-error pane snapshot after its 2s sleep and returns `ok: true`.

**Why the backend reports success anyway** — `server/routes/sessions.ts` sends the command via `tmux send-keys`, sleeps 2 seconds, captures the pane, and returns the output regardless of its content. There is no parsing of the pane to detect `Capacity: 0/32`, `source: Extra inputs`, or similar signals.

**Scope of the bug**

- Affects repositories whose `origin` resolves to `github.com` (both `git@github.com:...` and `https://github.com/...`)
- Does **not** affect bitbucket or other providers (no "Claude Bitbucket App" exists, so no check is performed)
- Does **not** affect non-git directories (no `git_repo_url` sent, no check)
- Unrelated to workspace trust, onboarding state, or claude version (reproduced on 2.1.107 and 2.1.112)

Upstream issue: [anthropics/claude-code#44805](https://github.com/anthropics/claude-code/issues/44805)

**Workarounds (pick one)**

1. **Authorize the repo in the Claude GitHub App** — go to *GitHub → Settings → Applications → Installed GitHub Apps → Claude* and allow the specific repository. This is the "official" fix and keeps `origin` on github.

2. **Swap `origin` to a non-github remote** — add the repo on bitbucket (or any non-github host), set it as `origin`, keep github as a secondary remote:

   ```
   git remote rename origin github
   git remote add origin https://<user>@bitbucket.org/<user>/<repo>.git
   ```

   Claude picks the `origin` URL as `git_repo_url`, bypasses the github check, and the session spawns.

3. **Remove the git remote entirely** — no remote → no `git_repo_url` → no check. Useful for throwaway sandboxes.

**How to diagnose another case**

SSH to your server and reproduce the spawn manually with the debug log enabled:

```bash
cd /root/<some-dir>
tmux new-session -d -s probe -c /root/<some-dir>
tmux send-keys -t probe \
  '/root/.nvm/versions/node/v25.0.0/bin/claude --remote-control "probe" --debug-file /tmp/probe.log -v' Enter

sleep 8
tmux capture-pane -t probe -p -S -80
grep -E '>>>|Created initial|Session creation failed' /tmp/probe.log

tmux kill-session -t probe
```

A `Session creation failed with status 400: source: Extra inputs are not permitted` line, together with a `git_repo_url` containing `github.com` in the registration body (`>>>`), is a direct match for this issue.

## Node version / shebang pitfall in non-interactive shells

When running `claude` via a non-interactive SSH (`ssh <your-server> "claude --version"`), the shebang `#!/usr/bin/env node` resolves to `/usr/bin/node` (system v12 on Ubuntu 22.04) instead of the nvm-managed node used interactively. This produces `SyntaxError: Unexpected token '?'` from the minified bundle.

This does **not** affect the deployed app (tmux panes spawn login shells that load nvm), but it breaks ad-hoc SSH debugging. Use `bash -ilc '…'` or a tmux session to get a proper login shell when invoking claude directly.

## MCP servers from `.mcp.json` missing when Launchpad runs as a systemd service

**Symptom**

- Running `claude --remote-control` directly over SSH in a project directory: MCP servers from `.mcp.json` are visible and usable.
- Launching the same directory via Claude Launchpad (deployed as a systemd service): typing `/mcp` in the Claude app shows the MCP server as missing or failed.

**Root cause**

systemd services do **not** inherit `~/.bashrc`, `~/.zshrc`, or any login shell initialization. The unit's `Environment="PATH=..."` directive is the only `PATH` the service and all its child processes see — including the tmux panes spawned via `send-keys`, and any MCP server command that runs in them.

If a project's `.mcp.json` declares a server launched via `uv`, `pipx`, or any binary installed outside the default system paths (commonly `~/.local/bin`, `~/.cargo/bin`, `~/.volta/bin`), the MCP server command fails with something like `uv: command not found`. Claude Code logs the failure but the UI simply shows no MCP tool — easy to mistake for "MCP not approved" or "config wrong".

Over SSH, `~/.bashrc` populates the `PATH` correctly, so the same `.mcp.json` works — which is why this only surfaces through Launchpad.

**Fix**

Add the relevant binary directories to the unit's `PATH`. Example for an Ubuntu droplet where `uv` is installed via the official installer:

```ini
# /etc/systemd/system/claude-launchpad.service
Environment="PATH=/root/.local/bin:/root/.nvm/versions/node/v25.0.0/bin:/usr/local/bin:/usr/bin:/bin"
```

Then:

```bash
systemctl daemon-reload
systemctl restart claude-launchpad.service
```

**Existing tmux sessions keep the old PATH** — kill and recreate any session whose project needs the updated `PATH` (via the Launchpad UI, or `tmux kill-session -t <name>`).

**Diagnostic**

```bash
# Effective PATH of the running service
PID=$(systemctl show --property=MainPID --value claude-launchpad.service)
cat /proc/$PID/environ | tr '\0' '\n' | grep '^PATH='

# Compare with your interactive PATH
echo $PATH
```

If the service's `PATH` is missing the directory that contains `uv` (or whatever your MCP server binary is), that's the issue.

## Backend improvement ideas

- Parse the tmux pane after the sleep and surface known failure modes to the UI:
  - `Capacity: 0/32` while `Ready` → session creation silently failed (most likely the github bug above)
  - `Workspace not trusted` → need to run `claude` interactively first in this dir
  - `SyntaxError`, `Error:`, auth errors, etc.
- Increase or make configurable the initial sleep (currently 2000 ms in `server/routes/sessions.ts`) so slow-starting sessions don't show a transient "Ready" snapshot.
- Expose `--debug-file` when starting a session and serve the log tail via an API endpoint — would have made this investigation 30× faster.
