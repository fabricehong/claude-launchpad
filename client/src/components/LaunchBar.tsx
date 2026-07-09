import { useState, useEffect, useRef, type FormEvent } from 'react';
import type { Credentials, ModelChoice, ModelOption } from '../api.ts';
import { startSession, suggestSessionName, getModels } from '../api.ts';

interface Props {
  creds: Credentials;
  dir: string;
  onToast: (message: string, variant: 'success' | 'error') => void;
  onSessionStarted: () => void;
}

export default function LaunchBar({ creds, dir, onToast, onSessionStarted }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<ModelChoice>('opus');
  const [models, setModels] = useState<ModelOption[]>([]);
  const userEditedRef = useRef(false);

  useEffect(() => {
    userEditedRef.current = false;
  }, [dir]);

  // Load the model catalogue from the server (single source of truth). Keep the
  // current selection if it's still valid, otherwise fall back to the server default.
  useEffect(() => {
    let cancelled = false;
    getModels(creds).then(({ data }) => {
      if (cancelled || !data) return;
      setModels(data.models);
      setModel(prev => (data.models.some(m => m.id === prev) ? prev : data.default));
    });
    return () => { cancelled = true; };
  }, [creds]);

  useEffect(() => {
    let cancelled = false;
    suggestSessionName(creds, dir, model).then(({ data }) => {
      if (cancelled || userEditedRef.current || !data) return;
      setName(data.name);
    });
    return () => { cancelled = true; };
  }, [creds, dir, model]);

  function handleNameChange(value: string) {
    userEditedRef.current = true;
    setName(value);
  }

  async function launch(continueConversation: boolean) {
    setLoading(true);

    const launched = name;
    const { error } = await startSession(creds, dir, name, continueConversation, model);

    setLoading(false);

    if (error) {
      onToast(error, 'error');
      return;
    }

    const verb = continueConversation ? 'resumed' : 'started';
    onToast(`Session "${launched}" ${verb} - use "Show Output" to monitor`, 'success');
    onSessionStarted();

    // Pull a fresh suggestion so the form is ready for an immediate sibling launch
    // (e.g. claude-launchpad-2 after claude-launchpad). Skip if the user has typed
    // something during the request.
    userEditedRef.current = false;
    const { data } = await suggestSessionName(creds, dir, model);
    if (data && !userEditedRef.current) setName(data.name);
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
      <select
        aria-label="Model"
        value={model}
        onChange={e => setModel(e.target.value)}
        style={{
          display: 'block',
          background: '#0f1117',
          border: '1px solid #2d3748',
          borderRadius: '6px',
          color: '#e2e8f0',
          fontSize: '0.8125rem',
          fontWeight: 600,
          padding: '0.35rem 0.6rem',
          marginBottom: '0.5rem',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {(models.length ? models : [{ id: model, label: model }]).map(m => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
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
