import { useState, useEffect, useRef, type FormEvent } from 'react';
import type { Credentials, ModelChoice } from '../api.ts';
import { startSession, getSessions } from '../api.ts';

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

function makeUniqueSessionName(dir: string, existing: Set<string>): string {
  const base = toSessionName(dir);
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export default function LaunchBar({ creds, dir, onToast, onSessionStarted }: Props) {
  const [name, setName] = useState(toSessionName(dir));
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<ModelChoice>('default');
  const userEditedRef = useRef(false);

  useEffect(() => {
    userEditedRef.current = false;
    let cancelled = false;
    getSessions(creds).then(({ data }) => {
      if (cancelled || userEditedRef.current) return;
      const existing = new Set((data?.sessions ?? []).map(s => s.name));
      setName(makeUniqueSessionName(dir, existing));
    });
    return () => { cancelled = true; };
  }, [creds, dir]);

  function handleNameChange(value: string) {
    userEditedRef.current = true;
    setName(value);
  }

  async function launch(continueConversation: boolean) {
    setLoading(true);

    const { error } = await startSession(creds, dir, name, continueConversation, model);

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
      <p style={{
        fontSize: '0.75rem',
        color: '#718096',
        marginBottom: '0.5rem',
        fontFamily: 'monospace',
        overflowWrap: 'anywhere',
      }}>
        {dir}
      </p>
      <div
        role="radiogroup"
        aria-label="Model"
        style={{
          display: 'inline-flex',
          background: '#0f1117',
          border: '1px solid #2d3748',
          borderRadius: '6px',
          padding: '2px',
          marginBottom: '0.5rem',
          gap: '2px',
        }}
      >
        {([
          { value: 'default', label: 'Pro' },
          { value: 'haiku', label: 'Fast' },
        ] as const).map(opt => {
          const active = model === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setModel(opt.value)}
              style={{
                background: active ? '#4f46e5' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: active ? '#fff' : '#a0aec0',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.75rem',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="Session name"
          required
          pattern="[a-zA-Z0-9_\-]+"
          title="Only letters, numbers, _ and - are allowed"
          style={{
            flex: '1 1 100%',
            minWidth: 0,
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
