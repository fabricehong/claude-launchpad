import type { CSSProperties } from 'react';
import type { DirEntry } from '../api.ts';
import { useBrowse } from '../hooks/useBrowse.ts';
import Breadcrumb from './Breadcrumb.tsx';
import LaunchBar from './LaunchBar.tsx';

interface Props {
  selectedDir: string | null;
  onSelect: (path: string | null) => void;
  onToast: (message: string, variant: 'success' | 'error') => void;
  onSessionStarted: () => void;
}

export default function FileBrowser({ selectedDir, onSelect, onToast, onSessionStarted }: Props) {
  const { rootDir, current, parent, dirs, loading, error, navigate } = useBrowse();

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
        {dirs.map((dir: DirEntry) => {
          const active = selectedDir === dir.path;
          return (
            <li key={dir.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              minWidth: 0,
              borderRadius: '6px',
              borderLeft: `3px solid ${active ? '#4f46e5' : 'transparent'}`,
              background: active ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              paddingRight: '0.25rem',
            }}>
              <button
                onClick={() => navigate(dir.path)}
                style={{ ...dirBtnStyle, color: active ? '#e2e8f0' : '#cbd5e0', fontWeight: active ? 600 : 400 }}
                title={dir.name}
              >
                📁 {dir.name}
              </button>
              {/* Same label whatever the state: only one folder can be picked, the row
                  highlight shows which one. Clicking the active row again closes the panel. */}
              <button
                onClick={() => onSelect(active ? null : dir.path)}
                style={{
                  background: 'none',
                  border: `1px solid ${active ? '#4f46e5' : '#2d3748'}`,
                  borderRadius: '4px',
                  color: active ? '#a5b4fc' : '#718096',
                  fontSize: '0.7rem',
                  padding: '0.125rem 0.5rem',
                  flexShrink: 0,
                }}
              >
                Launch…
              </button>
            </li>
          );
        })}
      </ul>

      {selectedDir && (
        <LaunchBar
          dir={selectedDir}
          onToast={onToast}
          onSessionStarted={onSessionStarted}
          onClose={() => onSelect(null)}
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
