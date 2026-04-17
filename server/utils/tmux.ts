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

export async function startSession(name: string, dir: string, continueConversation = false): Promise<void> {
  const claudeBin = process.env.CLAUDE_BIN ?? 'claude';
  if (continueConversation) {
    // NOTE: this branch is currently unreachable from the UI. `claude --continue`
    // only resumes conversations that were persisted locally in
    // ~/.claude/projects/<encoded-dir>/*.jsonl — i.e. sessions started in plain
    // interactive mode on this machine. Sessions driven via `claude remote-control`
    // (the default path below) live server-side at Anthropic and do NOT write
    // such a file, so --continue finds nothing and the Claude mobile app shows
    // no active session either. See ROADMAP.md ("Resume a previous session")
    // for the upstream feature that would unblock this.
    const cmd = `${claudeBin} --continue`;
    console.log(`[tmux] Creating session "${name}" in ${dir}, command: ${cmd} + /remote-control`);
    await exec('tmux', ['new-session', '-d', '-s', name, '-c', dir]);
    await exec('tmux', ['send-keys', '-t', name, cmd, 'Enter']);
    // Wait for claude to load before sending /remote-control
    await new Promise(r => setTimeout(r, 5000));
    await exec('tmux', ['send-keys', '-t', name, '/remote-control', 'Enter']);
  } else {
    const cmd = `${claudeBin} remote-control --spawn=same-dir`;
    console.log(`[tmux] Creating session "${name}" in ${dir}, command: ${cmd}`);
    await exec('tmux', ['new-session', '-d', '-s', name, '-c', dir]);
    await exec('tmux', ['send-keys', '-t', name, cmd, 'Enter']);
  }
  console.log(`[tmux] Session "${name}" created and command sent`);
}

export async function capturePane(name: string, lines = 50): Promise<string> {
  return exec('tmux', ['capture-pane', '-t', name, '-p', '-S', `-${lines}`]);
}

export async function killSession(name: string): Promise<void> {
  await exec('tmux', ['kill-session', '-t', name]);
}
