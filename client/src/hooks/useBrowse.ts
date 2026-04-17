import { useState, useEffect, useCallback } from 'react';
import type { Credentials, DirEntry } from '../api.ts';
import { browse } from '../api.ts';

export function useBrowse(creds: Credentials) {
  const [rootDir, setRootDir] = useState('');
  const [current, setCurrent] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await browse(creds, path);

    if (err || !data) {
      setError(err ?? 'Unknown error');
      setLoading(false);
      return;
    }

    setCurrent(data.current);
    setParent(data.parent);
    setDirs(data.dirs);
    setRootDir(prev => prev || data.current); // set once on first load
    setLoading(false);
  }, [creds]);

  useEffect(() => {
    navigate(); // no path → server uses ROOT_DIR from .env
  }, [navigate]);

  return { rootDir, current, parent, dirs, loading, error, navigate };
}
