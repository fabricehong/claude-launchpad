import { useState, type FormEvent } from 'react';
import type { Credentials } from '../api.ts';
import { startSession } from '../api.ts';

interface Props {
  creds: Credentials;
  dir: string;
  onToast: (message: string, variant: 'success' | 'error') => void;
  onSessionStarted: () => void;
}

function toSessionName(dir: string): string {
  const name = dir.split('/').filter(Boolean).pop() ?? 'session';
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
}

export default function LaunchBar({ creds, dir, onToast, onSessionStarted }: Props) {
  const [name, setName] = useState(toSessionName(dir));
  const [loading, setLoading] = useState(false);

  async function launch(continueConversation: boolean) {
    setLoading(true);

    const { error } = await startSession(creds, dir, name, continueConversation);

    setLoading(false);

    if (error) {
      onToast(error, 'error');
      return;
    }

    const verb = continueConversation ? 'resumed' : 'started';
    onToast(`Session "${name}" ${verb} - use "Show Output" to monitor`, 'success');
    onSessionStarted();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void launch(false);
  }

  return (
    <div style={{
      marginTop: '1rem',
      background: '#1e2535',
      border: '1px solid #2d3748',
      borderRadius: '8px',
      padding: '0.875rem',
    }}>
      <p style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
        {dir}
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Session name"
          required
          pattern="[a-zA-Z0-9_\-]+"
          title="Only letters, numbers, _ and - are allowed"
          style={{
            flex: 1,
            background: '#0f1117',
            border: '1px solid #2d3748',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.875rem',
            padding: '0.5rem 0.75rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#4f46e5',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Launching…' : 'Launch'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void launch(true)}
          style={{
            background: 'transparent',
            border: '1px solid #4f46e5',
            borderRadius: '6px',
            color: '#a5b4fc',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            whiteSpace: 'nowrap',
          }}
        >
          Continue last
        </button>
      </form>
    </div>
  );
}
