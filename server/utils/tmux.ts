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

// 'default' = no --model flag (inherits the claude CLI's configured default);
// 'fast' = an explicitly cheaper/faster model (currently Sonnet via the `sonnet` alias).
export type ModelChoice = 'default' | 'fast';

export function suffixedName(name: string, model: ModelChoice): string {
  return `${name} - ${model}`;
}

export async function findFreeBaseName(base: string, model: ModelChoice): Promise<string> {
  if (!(await hasSession(suffixedName(base, model)))) return base;
  let i = 2;
  while (await hasSession(suffixedName(`${base}-${i}`, model))) i++;
  return `${base}-${i}`;
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
  // `fullName` only adds the literal " - default" / " - fast" suffix — still
  // safe to double-quote in the shell string (no `"`, `$`, backtick, backslash).
  const parts = [`${claudeBin} --remote-control "${fullName}"`];
  if (continueConversation) parts.push('--continue');
  // `sonnet` is an evergreen alias that always resolves to the latest Sonnet.
  if (model === 'fast') parts.push('--model sonnet');
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
