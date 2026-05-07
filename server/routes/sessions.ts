import { Router } from 'express';
import path from 'path';
import { listSessions, hasSession, startSession, killSession, capturePane, suffixedName, findFreeBaseName, type ModelChoice } from '../utils/tmux.js';

function deriveBaseFromDir(dir: string): string {
  const segment = dir.split('/').filter(Boolean).pop() ?? 'session';
  return segment.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'session';
}

const router = Router();
const ROOT = path.resolve(process.env.ROOT_DIR ?? '/root');
const VALID_NAME = /^[a-zA-Z0-9_-]+$/;
// Accepts both legacy names ("mon-repo") and new suffixed names ("mon-repo - pro" / " - fast")
// since /kill and /output target whatever already exists in tmux.
const VALID_FULL_NAME = /^[a-zA-Z0-9_-]+(?: - (?:pro|fast))?$/;

router.get('/', async (_req, res) => {
  try {
    const sessions = await listSessions();
    res.json({ sessions });
  } catch (err) {
    console.error('[sessions/list] Failed to list sessions:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

router.get('/suggest', async (req, res) => {
  const dir = typeof req.query.dir === 'string' ? req.query.dir : '';
  const modelParam = typeof req.query.model === 'string' ? req.query.model : '';
  if (!dir) {
    res.status(400).json({ error: 'dir is required' });
    return;
  }
  const resolved = path.resolve(dir);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const modelChoice: ModelChoice = modelParam === 'haiku' ? 'haiku' : 'default';
  const base = deriveBaseFromDir(resolved);
  const suggested = await findFreeBaseName(base, modelChoice);
  res.json({ name: suggested });
});

router.post('/start', async (req, res) => {
  const { dir, name, continueConversation, model } = req.body as {
    dir?: string;
    name?: string;
    continueConversation?: boolean;
    model?: ModelChoice;
  };

  const modelChoice: ModelChoice = model === 'haiku' ? 'haiku' : 'default';

  if (!name || !VALID_NAME.test(name)) {
    res.status(400).json({ error: 'Invalid session name (only a-z, A-Z, 0-9, _ and - allowed)' });
    return;
  }

  if (!dir) {
    res.status(400).json({ error: 'dir is required' });
    return;
  }

  const resolved = path.resolve(dir);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // A session is uniquely identified by its full (suffixed) name. Two sessions
  // sharing a base but in different modes are distinct identifiers and may coexist.
  const fullName = suffixedName(name, modelChoice);
  if (await hasSession(fullName)) {
    res.status(409).json({ error: `Session "${fullName}" already exists` });
    return;
  }

  try {
    console.log(`[sessions/start] Starting session "${name}" in ${resolved}`);
    await startSession(name, resolved, continueConversation, modelChoice);
    // Wait a moment and capture initial output for diagnostics
    await new Promise(r => setTimeout(r, 2000));
    let output = '';
    try {
      output = await capturePane(fullName);
      console.log(`[sessions/start] Session "${fullName}" initial output (${output.length} chars): ${output.slice(0, 200)}`);
    } catch (captureErr) {
      console.warn(`[sessions/start] Could not capture initial output for "${fullName}":`, captureErr);
    }
    res.json({ ok: true, name: fullName, dir: resolved, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sessions/start] Failed to start session "${name}":`, message);
    res.status(500).json({ error: `Failed to start session: ${message}` });
  }
});

router.get('/output/:name', async (req, res) => {
  const { name } = req.params;
  if (!name || !VALID_FULL_NAME.test(name)) {
    res.status(400).json({ error: 'Invalid session name' });
    return;
  }

  if (!(await hasSession(name))) {
    res.status(404).json({ error: `Session "${name}" not found` });
    return;
  }

  try {
    const output = await capturePane(name);
    res.json({ output });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to capture output: ${message}` });
  }
});

router.post('/kill', async (req, res) => {
  const { name } = req.body as { name?: string };

  if (!name || !VALID_FULL_NAME.test(name)) {
    res.status(400).json({ error: 'Invalid session name' });
    return;
  }

  try {
    console.log(`[sessions/kill] Killing session "${name}"`);
    await killSession(name);
    console.log(`[sessions/kill] Session "${name}" killed successfully`);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sessions/kill] Failed to kill session "${name}":`, message);
    res.status(500).json({ error: `Failed to kill session: ${message}` });
  }
});

export default router;
