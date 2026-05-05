import { execFile } from 'child_process';

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
    // `=` prefix forces an exact match; otherwise tmux matches by prefix
    // (e.g. `has-session -t foo` matches an existing `foo-bar`).
    await exec('tmux', ['has-session', '-t', `=${name}`]);
    return true;
  } catch {
    return false;
  }
}

export type ModelChoice = 'default' | 'haiku';

export function suffixedName(name: string, model: ModelChoice): string {
  return `${name} - ${model === 'haiku' ? 'fast' : 'pro'}`;
}

export async function startSession(
  name: string,
  dir: string,
  continueConversation = false,
  model: ModelChoice = 'default'
): Promise<string> {
  const claudeBin = process.env.CLAUDE_BIN ?? 'claude';
  const fullName = suffixedName(name, model);
  // `name` is validated by the /^[a-zA-Z0-9_-]+$/ regex in the route, so
  // `fullName` only adds the literal " - pro" / " - fast" suffix — still
  // safe to double-quote in the shell string (no `"`, `$`, backtick, backslash).
  const parts = [`${claudeBin} --remote-control "${fullName}"`];
  if (continueConversation) parts.push('--continue');
  if (model === 'haiku') parts.push('--model haiku');
  const cmd = parts.join(' ');
  console.log(`[tmux] Creating session "${fullName}" in ${dir}, command: ${cmd}`);
  await exec('tmux', ['new-session', '-d', '-s', fullName, '-c', dir]);
  // `=name:` targets the active pane of the exact session (pane targets
  // don't accept the bare `=name` form accepted by session targets).
  await exec('tmux', ['send-keys', '-t', `=${fullName}:`, cmd, 'Enter']);
  console.log(`[tmux] Session "${fullName}" created and command sent`);
  return fullName;
}

export async function capturePane(name: string, lines = 50): Promise<string> {
  return exec('tmux', ['capture-pane', '-t', `=${name}:`, '-p', '-S', `-${lines}`]);
}

export async function killSession(name: string): Promise<void> {
  await exec('tmux', ['kill-session', '-t', `=${name}`]);
}
