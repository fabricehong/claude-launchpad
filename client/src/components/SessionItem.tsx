import { useState, useEffect, useRef } from 'react';
import type { Session, Credentials } from '../api.ts';
import { killSession, getSessionOutput } from '../api.ts';

interface Props {
  session: Session;
  creds: Credentials;
  onKilled: () => void;
  onToast: (message: string, variant: 'success' | 'error') => void;
}

function elapsed(created: number): string {
  const secs = Math.floor(Date.now() / 1000) - created;
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function SessionItem({ session, creds, onKilled, onToast }: Props) {
  const [showOutput, setShowOutput] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputLoading, setOutputLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOutput() {
    const { data, error } = await getSessionOutput(creds, session.name);
    if (error) {
      setOutput(`Error: ${error}`);
    } else if (data) {
      setOutput(data.output);
    }
  }

  useEffect(() => {
    if (showOutput) {
      setOutputLoading(true);
      fetchOutput().finally(() => setOutputLoading(false));
      intervalRef.current = setInterval(fetchOutput, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [showOutput]);

  async function handleKill() {
    if (!confirm(`Kill session "${session.name}"?`)) return;

    const { error } = await killSession(creds, session.name);
    if (error) {
      onToast(error, 'error');
      return;
    }
    onToast(`Session "${session.name}" killed`, 'success');
    onKilled();
  }

  return (
    <li style={{
      background: '#0f1117',
      border: '1px solid #2d3748',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.625rem 0.875rem',
      }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{session.name}</p>
          <p style={{ color: '#718096', fontSize: '0.75rem' }}>{elapsed(session.created)}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowOutput(v => !v)}
            style={{
              background: 'transparent',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              color: showOutput ? '#63b3ed' : '#a0aec0',
              fontSize: '0.75rem',
              padding: '0.375rem 0.625rem',
              cursor: 'pointer',
            }}
          >
            {showOutput ? 'Hide Output' : 'Show Output'}
          </button>
          <button
            onClick={handleKill}
            style={{
              background: 'transparent',
              border: '1px solid #fc8181',
              borderRadius: '6px',
              color: '#fc8181',
              fontSize: '0.75rem',
              padding: '0.375rem 0.625rem',
              cursor: 'pointer',
            }}
          >
            Kill
          </button>
        </div>
      </div>

      {showOutput && (
        <div style={{
          borderTop: '1px solid #2d3748',
          padding: '0.75rem',
          background: '#0a0c10',
        }}>
          {outputLoading && output === null ? (
            <p style={{ color: '#4a5568', fontSize: '0.75rem' }}>Loading...</p>
          ) : (
            <pre style={{
              color: '#cbd5e0',
              fontSize: '0.7rem',
              lineHeight: 1.4,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: '300px',
              overflowY: 'auto',
              margin: 0,
            }}>
              {output || '(empty)'}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}
