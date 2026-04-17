import { Router } from 'express';
import { readdir } from 'fs/promises';
import path from 'path';

const router = Router();
const ROOT = process.env.ROOT_DIR ?? '/root';

router.get('/', async (req, res) => {
  const requested = (req.query.path as string) || ROOT;
  const resolved = path.resolve(requested);

  if (!resolved.startsWith(ROOT)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    const entries = await readdir(resolved, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => ({
        name: e.name,
        path: path.join(resolved, e.name),
      }));

    const parent = resolved === ROOT ? null : path.dirname(resolved);

    res.json({ current: resolved, parent, dirs });
  } catch {
    res.status(400).json({ error: 'Cannot read directory' });
  }
});

export default router;
