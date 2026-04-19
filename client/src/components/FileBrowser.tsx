import type { CSSProperties } from 'react';
import type { Credentials, DirEntry } from '../api.ts';
import { useBrowse } from '../hooks/useBrowse.ts';
import Breadcrumb from './Breadcrumb.tsx';
import LaunchBar from './LaunchBar.tsx';

interface Props {
  creds: Credentials;
  selectedDir: string | null;
  onSelect: (path: string) => void;
  onToast: (message: string, variant: 'success' | 'error') => void;
  onSessionStarted: () => void;
}

export default function FileBrowser({ creds, selectedDir, onSelect, onToast, onSessionStarted }: Props) {
  const { rootDir, current, parent, dirs, loading, error, navigate } = useBrowse(creds);

  return (
    <section style={{
      background: '#1a1f2e',
      border: '1px solid #2d3748',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a0aec0', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Browse
      </h2>

      <Breadcrumb rootDir={rootDir} current={current} onNavigate={navigate} />

      {parent && (
        <button
          onClick={() => navigate(parent)}
          style={navBtnStyle}
        >
          ← ..
        </button>
      )}

      {loading && <p style={{ color: '#718096', fontSize: '0.875rem' }}>Loading…</p>}
      {error && <p style={{ color: '#fc8181', fontSize: '0.875rem' }}>{error}</p>}

      {!loading && !error && dirs.length === 0 && (
        <p style={{ color: '#4a5568', fontSize: '0.875rem' }}>No subdirectories</p>
      )}

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
        {dirs.map((dir: DirEntry) => (
          <li key={dir.path} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <button
              onClick={() => navigate(dir.path)}
              style={dirBtnStyle}
              title={dir.name}
            >
              📁 {dir.name}
            </button>
            <button
              onClick={() => onSelect(selectedDir === dir.path ? null! : dir.path)}
              style={{
                background: selectedDir === dir.path ? '#4f46e5' : 'none',
                border: `1px solid ${selectedDir === dir.path ? '#4f46e5' : '#2d3748'}`,
                borderRadius: '4px',
                color: selectedDir === dir.path ? '#fff' : '#718096',
                fontSize: '0.7rem',
                padding: '0.125rem 0.5rem',
                flexShrink: 0,
              }}
            >
              {selectedDir === dir.path ? '✓' : 'Select'}
            </button>
          </li>
        ))}
      </ul>

      {selectedDir && (
        <LaunchBar
          creds={creds}
          dir={selectedDir}
          onToast={onToast}
          onSessionStarted={onSessionStarted}
        />
      )}
    </section>
  );
}

const navBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#718096',
  fontSize: '0.875rem',
  padding: '0.25rem 0',
  textAlign: 'left',
  marginBottom: '0.5rem',
};

const dirBtnStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  color: '#cbd5e0',
  fontSize: '0.875rem',
  padding: '0.375rem 0.625rem',
  textAlign: 'left',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
