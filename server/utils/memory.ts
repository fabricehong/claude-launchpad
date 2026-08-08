import { readFile } from 'fs/promises';
import os from 'os';

export interface MemoryInfo {
  totalBytes: number;
  availableBytes: number;
  // null when /proc/meminfo isn't readable (e.g. dev on macOS): we then have no
  // swap figures at all, rather than misleading zeroes.
  swapTotalBytes: number | null;
  swapUsedBytes: number | null;
  sampledAt: number;
}

// Parses lines of the form "MemTotal:       3911576 kB" into bytes.
function parseMeminfo(raw: string): Map<string, number> {
  const values = new Map<string, number>();
  for (const line of raw.split('\n')) {
    const match = /^(\w+):\s+(\d+)\s*kB$/.exec(line);
    if (match) values.set(match[1], Number(match[2]) * 1024);
  }
  return values;
}

// MemAvailable — not MemFree, and not os.freemem() which mirrors it — is the
// figure we want: it accounts for reclaimable page cache. On the droplet
// MemFree sits around 0.2 GB while MemAvailable is 1.8 GB, so os.freemem()
// would show the gauge as permanently in the red.
export async function readMemory(): Promise<MemoryInfo> {
  const sampledAt = Date.now();
  try {
    const values = parseMeminfo(await readFile('/proc/meminfo', 'utf8'));
    const total = values.get('MemTotal');
    const available = values.get('MemAvailable');
    if (total === undefined || available === undefined) throw new Error('MemTotal/MemAvailable missing');

    const swapTotal = values.get('SwapTotal');
    const swapFree = values.get('SwapFree');
    const hasSwapFigures = swapTotal !== undefined && swapFree !== undefined;

    return {
      totalBytes: total,
      availableBytes: available,
      swapTotalBytes: hasSwapFigures ? swapTotal : null,
      swapUsedBytes: hasSwapFigures ? swapTotal - swapFree : null,
      sampledAt,
    };
  } catch {
    // Non-Linux fallback: os.freemem() understates what's actually usable, but
    // it's the only thing available off /proc.
    return {
      totalBytes: os.totalmem(),
      availableBytes: os.freemem(),
      swapTotalBytes: null,
      swapUsedBytes: null,
      sampledAt,
    };
  }
}
