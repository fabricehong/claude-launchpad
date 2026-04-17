interface Props {
  rootDir: string;
  current: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({ rootDir, current, onNavigate }: Props) {
  const relative = current.startsWith(rootDir) ? current.slice(rootDir.length) : current;
  const parts = relative.split('/').filter(Boolean);

  const segments = [
    { label: '~', path: rootDir },
    ...parts.map((part, i) => ({
      label: part,
      path: rootDir + '/' + parts.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '0.125rem',
      fontSize: '0.8rem',
      color: '#718096',
      marginBottom: '0.75rem',
    }}>
      {segments.map((seg, i) => (
        <span key={seg.path} style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
          {i > 0 && <span style={{ color: '#4a5568' }}>/</span>}
          <button
            onClick={() => onNavigate(seg.path)}
            style={{
              background: 'none',
              border: 'none',
              color: i === segments.length - 1 ? '#e2e8f0' : '#718096',
              fontSize: '0.8rem',
              padding: '0.125rem 0.25rem',
              borderRadius: '4px',
              fontWeight: i === segments.length - 1 ? 600 : 400,
            }}
          >
            {seg.label}
          </button>
        </span>
      ))}
    </div>
  );
}
