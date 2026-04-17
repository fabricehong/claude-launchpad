import type { Credentials } from '../api.ts';
import { useSessions } from '../hooks/useSessions.ts';
import SessionItem from './SessionItem.tsx';

interface Props {
  creds: Credentials;
  onToast: (message: string, variant: 'success' | 'error') => void;
}

export default function SessionList({ creds, onToast }: Props) {
  const { sessions, loading, refresh } = useSessions(creds);

  return (
    <section style={{
      background: '#1a1f2e',
      border: '1px solid #2d3748',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Sessions
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#4a5568' }}>
          {loading ? 'Refreshing…' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {sessions.length === 0 && !loading && (
        <p style={{ color: '#4a5568', fontSize: '0.875rem' }}>No active sessions</p>
      )}

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sessions.map(session => (
          <SessionItem
            key={session.name}
            session={session}
            creds={creds}
            onKilled={refresh}
            onToast={onToast}
          />
        ))}
      </ul>
    </section>
  );
}
