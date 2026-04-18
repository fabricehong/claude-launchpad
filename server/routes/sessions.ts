import { Router } from 'express';
import path from 'path';
import { listSessions, hasSession, startSession, killSession, capturePane, dirToDisplayName } from '../utils/tmux.js';

const router = Router();
const ROOT = path.resolve(process.env.ROOT_DIR ?? '/root');
const VALID_NAME = /^[a-zA-Z0-9_-]+$/;

router.get('/', async (_req, res) => {
  try {
    const sessions = await listSessions();
    res.json({ sessions });
  } catch (err) {
    console.error('[sessions/list] Failed to list sessions:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

router.post('/start', async (req, res) => {
  const { dir, name, continueConversation } = req.body as { dir?: string; name?: string; continueConversation?: boolean };

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

  if (await hasSession(name)) {
    res.status(409).json({ error: `Session "${name}" already exists` });
    return;
  }

  try {
    const displayName = dirToDisplayName(resolved, ROOT);
    console.log(`[sessions/start] Starting session "${name}" in ${resolved} (Claude display name: "${displayName}")`);
    await startSession(name, resolved, displayName, continueConversation);
    // Wait a moment and capture initial output for diagnostics
    await new Promise(r => setTimeout(r, 2000));
    let output = '';
    try {
      output = await capturePane(name);
      console.log(`[sessions/start] Session "${name}" initial output (${output.length} chars): ${output.slice(0, 200)}`);
    } catch (captureErr) {
      console.warn(`[sessions/start] Could not capture initial output for "${name}":`, captureErr);
    }
    res.json({ ok: true, name, dir: resolved, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sessions/start] Failed to start session "${name}":`, message);
    res.status(500).json({ error: `Failed to start session: ${message}` });
  }
});

router.get('/output/:name', async (req, res) => {
  const { name } = req.params;
  if (!name || !VALID_NAME.test(name)) {
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

  if (!name || !VALID_NAME.test(name)) {
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
