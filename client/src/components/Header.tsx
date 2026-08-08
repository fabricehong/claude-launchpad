import type { MemoryInfo } from '../api.ts';

interface Props {
  memory: MemoryInfo | null;
  onRefreshMemory: () => void;
  onLogout: () => void;
}

const GB = 1024 ** 3;

function formatGB(bytes: number): string {
  return (bytes / GB).toFixed(1);
}

// Green while there's room, amber when it starts to matter, red when a new
// session is likely to hurt.
function barColor(usedRatio: number): string {
  if (usedRatio < 0.7) return '#48bb78';
  if (usedRatio < 0.88) return '#ecc94b';
  return '#f56565';
}

function tooltip(memory: MemoryInfo): string {
  const swap = memory.swapTotalBytes !== null && memory.swapUsedBytes !== null
    ? `Swap ${formatGB(memory.swapUsedBytes)} / ${formatGB(memory.swapTotalBytes)} GB used`
    : 'Swap unavailable';
  const at = new Date(memory.sampledAt).toLocaleTimeString();
  return `${swap} · updated ${at} · click to refresh`;
}

function MemoryGauge({ memory, onRefresh }: { memory: MemoryInfo | null; onRefresh: () => void }) {
  const usedRatio = memory && memory.totalBytes > 0
    ? (memory.totalBytes - memory.availableBytes) / memory.totalBytes
    : 0;

  return (
    <button
      className="mem-gauge"
      onClick={onRefresh}
      title={memory ? tooltip(memory) : 'Reading memory…'}
    >
      <span style={{ color: '#4a5568', letterSpacing: '0.05em' }}>RAM</span>
      {memory ? (
        <>
          <span className="mem-gauge-bar">
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.min(100, Math.round(usedRatio * 100))}%`,
                background: barColor(usedRatio),
                borderRadius: 'inherit',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          </span>
          <span>
            <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>{formatGB(memory.availableBytes)}</strong>
            {` / ${formatGB(memory.totalBytes)} GB free`}
          </span>
        </>
      ) : (
        <span>—</span>
      )}
    </button>
  );
}

export default function Header({ memory, onRefreshMemory, onLogout }: Props) {
  return (
    <header style={{
      background: '#1a1f2e',
      borderBottom: '1px solid #2d3748',
      padding: '0.875rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
    }}>
      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
        Claude Launchpad
      </span>

      <MemoryGauge memory={memory} onRefresh={onRefreshMemory} />

      <button
        onClick={onLogout}
        style={{
          background: 'transparent',
          border: '1px solid #2d3748',
          borderRadius: '6px',
          color: '#a0aec0',
          fontSize: '0.8rem',
          padding: '0.375rem 0.75rem',
          flexShrink: 0,
        }}
      >
        Log out
      </button>
    </header>
  );
}
