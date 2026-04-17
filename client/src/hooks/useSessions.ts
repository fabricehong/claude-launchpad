import { useState, useEffect, useCallback } from 'react';
import type { Credentials, Session } from '../api.ts';
import { getSessions } from '../api.ts';

export function useSessions(creds: Credentials) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await getSessions(creds);
    if (data) setSessions(data.sessions);
    setLoading(false);
  }, [creds]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { sessions, loading, refresh };
}
