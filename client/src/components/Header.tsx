interface Props {
  onLogout: () => void;
}

export default function Header({ onLogout }: Props) {
  return (
    <header style={{
      background: '#1a1f2e',
      borderBottom: '1px solid #2d3748',
      padding: '0.875rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
        Claude Launchpad
      </span>
      <button
        onClick={onLogout}
        style={{
          background: 'transparent',
          border: '1px solid #2d3748',
          borderRadius: '6px',
          color: '#a0aec0',
          fontSize: '0.8rem',
          padding: '0.375rem 0.75rem',
        }}
      >
        Log out
      </button>
    </header>
  );
}
