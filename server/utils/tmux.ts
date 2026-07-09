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

// A model is chosen by its `claude --model` alias. Aliases are evergreen — each
// one always resolves to the latest model in its family, so we never pin a dated
// version here (the CLI resolves it at launch time). The alias is passed verbatim
// to `--model` and also forms the session-name suffix (e.g. "my-repo - opus").
// This list is the single source of truth; the frontend fetches it from
// GET /api/sessions/models rather than duplicating it.
export interface ModelOption {
  id: string;    // the `claude --model` alias
  label: string; // shown in the UI dropdown
}

// Ordered most → least powerful (Fable, Opus, Sonnet, Haiku). Opus is the
// default selection (DEFAULT_MODEL below), independent of list order.
export const MODELS: ModelOption[] = [
  { id: 'fable', label: 'Fable' },
  { id: 'opus', label: 'Opus' },
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'haiku', label: 'Haiku' },
];

export const DEFAULT_MODEL = 'opus';

// A ModelChoice is any alias present in MODELS. Kept as a plain string (not a
// union) because MODELS above is the authority — validate with isValidModel.
export type ModelChoice = string;

export function isValidModel(model: string): boolean {
  return MODELS.some(m => m.id === model);
}

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
  model: ModelChoice = DEFAULT_MODEL
): Promise<string> {
  const claudeBin = process.env.CLAUDE_BIN ?? 'claude';
  const fullName = suffixedName(name, model);
  // `name` is validated by the /^[a-zA-Z0-9_-]+$/ regex in the route, and `model`
  // is a validated alias from MODELS (lowercase letters only), so `fullName` only
  // adds a literal " - <alias>" suffix — still safe to double-quote in the shell
  // string (no `"`, `$`, backtick, backslash).
  const parts = [`${claudeBin} --remote-control "${fullName}"`];
  if (continueConversation) parts.push('--continue');
  // Always pass --model explicitly. It must be set even on --continue: without
  // it, `claude --continue` reuses the resumed conversation's original model
  // instead of the one just selected here. The alias is safe to interpolate.
  parts.push(`--model ${model}`);
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
