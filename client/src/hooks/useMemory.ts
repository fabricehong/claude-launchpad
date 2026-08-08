import { useState, useEffect, useCallback, useRef } from 'react';
import type { Credentials, MemoryInfo } from '../api.ts';
import { getMemory } from '../api.ts';

// Delay before re-measuring after a session start/kill: the claude process needs
// a moment to allocate (or release) its memory before the reading is meaningful.
const AFTER_ACTION_DELAY_MS = 3000;
// Coming back to the tab refetches, but not more than this often — bouncing
// between tabs shouldn't hammer the endpoint.
const VISIBILITY_THROTTLE_MS = 15000;

// Deliberately has no polling interval: memory is fetched on mount, on demand,
// a few seconds after a session starts or dies, and when the tab regains focus.
// Nothing runs in the background while the phone is asleep.
// `creds` is null on the auth screen, where there is nothing to fetch yet.
export function useMemory(creds: Credentials | null) {
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const lastFetchRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!creds) return;
    lastFetchRef.current = Date.now();
    const { data } = await getMemory(creds);
    if (data) setMemory(data);
  }, [creds]);

  const refreshSoon = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refresh, AFTER_ACTION_DELAY_MS);
  }, [refresh]);

  useEffect(() => {
    refresh();

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current < VISIBILITY_THROTTLE_MS) return;
      refresh();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refresh]);

  return { memory, refresh, refreshSoon };
}
