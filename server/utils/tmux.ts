import { execFile } from 'child_process';
import path from 'path';

/**
 * Turns an absolute directory into a human-readable label suitable for
 * `claude --remote-control <label>`.
 *
 * Returns the path **relative to `rootDir`**, preserving slashes so the
 * Claude mobile app shows the project's nested structure
 * (e.g. `ecommerce-shop/backend`). Any character outside
 * `[a-zA-Z0-9_/-]` is replaced with `-`, runs of dashes are collapsed,
 * and leading/trailing dashes are trimmed.
 *
 * Edge cases:
 * - If `absoluteDir === rootDir`, falls back to `basename(rootDir)`
 *   (e.g. `claude-launchpad-demo`) rather than an empty label.
 * - If sanitisation leaves nothing, falls back to `'session'`.
 *
 * The result is safe to double-quote in a shell string (no `"`, `$`,
 * backtick or backslash can survive the whitelist).
 */
export function dirToDisplayName(absoluteDir: string, rootDir: string): string {
  let rel = path.relative(rootDir, absoluteDir);
  if (rel === '') {
    rel = path.basename(rootDir) || 'root';
  }
  const sanitised = rel
    .replace(/[^a-zA-Z0-9_/-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitised || 'session';
}

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

export interface TmuxSession {
  name: string;
  created: number;
}

export async function listSessions(): Promise<TmuxSession[]> {
  try {
    const out = await exec('tmux', ['ls', '-F', '#{session_name}|#{session_created}']);
    return out.split('\n').filter(Boolean).map(line => {
      const [name, created] = line.split('|');
      return { name, created: Number(created) };
    });
  } catch {
    return [];
  }
}

export async function hasSession(name: string): Promise<boolean> {
  try {
    await exec('tmux', ['has-session', '-t', name]);
    return true;
  } catch {
    return false;
  }
}

export async function startSession(name: string, dir: string, displayName: string, continueConversation = false): Promise<void> {
  const claudeBin = process.env.CLAUDE_BIN ?? 'claude';
  // `displayName` is sanitised by `dirToDisplayName` (whitelist excludes `"`,
  // `$`, backtick, backslash) so double-quoting it in the shell string is safe.
  const suffix = continueConversation ? ' --continue' : '';
  const cmd = `${claudeBin} --remote-control "${displayName}"${suffix}`;
  console.log(`[tmux] Creating session "${name}" in ${dir}, command: ${cmd}`);
  await exec('tmux', ['new-session', '-d', '-s', name, '-c', dir]);
  await exec('tmux', ['send-keys', '-t', name, cmd, 'Enter']);
  console.log(`[tmux] Session "${name}" created and command sent`);
}

export async function capturePane(name: string, lines = 50): Promise<string> {
  return exec('tmux', ['capture-pane', '-t', name, '-p', '-S', `-${lines}`]);
}

export async function killSession(name: string): Promise<void> {
  await exec('tmux', ['kill-session', '-t', name]);
}
