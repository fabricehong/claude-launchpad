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
    await exec('tmux', ['has-session', '-t', name]);
    return true;
  } catch {
    return false;
  }
}

export type ModelChoice = 'default' | 'haiku';

export async function startSession(
  name: string,
  dir: string,
  continueConversation = false,
  model: ModelChoice = 'default'
): Promise<void> {
  const claudeBin = process.env.CLAUDE_BIN ?? 'claude';
  // `name` is validated by the /^[a-zA-Z0-9_-]+$/ regex in the route, so
  // double-quoting it in the shell string is safe (no `"`, `$`, backtick, backslash).
  const parts = [`${claudeBin} --remote-control "${name}"`];
  if (continueConversation) parts.push('--continue');
  if (model === 'haiku') parts.push('--model haiku');
  const cmd = parts.join(' ');
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
