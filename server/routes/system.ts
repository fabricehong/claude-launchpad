import { Router } from 'express';
import { readMemory } from '../utils/memory.js';

const router = Router();

router.get('/memory', async (_req, res) => {
  try {
    res.json(await readMemory());
  } catch (err) {
    console.error('[system/memory] Failed to read memory:', err);
    res.status(500).json({ error: 'Failed to read memory' });
  }
});

export default router;
