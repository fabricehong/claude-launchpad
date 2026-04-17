import { useState, type CSSProperties, type FormEvent } from 'react';
import type { Credentials } from '../api.ts';
import { getSessions } from '../api.ts';

interface Props {
  onAuth: (creds: Credentials) => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const creds = { username, password };
    const { error: err } = await getSessions(creds);

    setLoading(false);

    if (err) {
      setError('Invalid username or password.');
      return;
    }

    onAuth(creds);
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1rem',
    }}>
      <div style={{
        background: '#1a1f2e',
        border: '1px solid #2d3748',
        borderRadius: '12px',
        padding: '2rem',
        width: '100%',
        maxWidth: '360px',
      }}>
        <h1 style={{ marginBottom: '0.25rem', fontSize: '1.25rem', fontWeight: 700 }}>
          Claude Launchpad
        </h1>
        <p style={{ marginBottom: '1.5rem', color: '#718096', fontSize: '0.875rem' }}>
          Sign in to continue
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <p style={{ color: '#fc8181', fontSize: '0.875rem' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: '#0f1117',
  border: '1px solid #2d3748',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '0.9rem',
  padding: '0.625rem 0.875rem',
  outline: 'none',
};

const btnStyle: CSSProperties = {
  background: '#4f46e5',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 600,
  marginTop: '0.25rem',
  padding: '0.625rem',
};
