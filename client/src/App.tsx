import { useState, useEffect } from 'react';
import { getSessions, logout, setUnauthorizedHandler } from './api.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Header from './components/Header.tsx';
import FileBrowser from './components/FileBrowser.tsx';
import SessionList from './components/SessionList.tsx';
import Toast from './components/Toast.tsx';
import { useMemory } from './hooks/useMemory.ts';
import './index.css';

export interface ToastState {
  message: string;
  variant: 'success' | 'error';
}

type Tab = 'browse' | 'sessions';

export default function App() {
  // null = still checking whether the session cookie is valid.
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  // Called before the auth check below, so it must tolerate authed !== true.
  const { memory, refresh: refreshMemory, refreshSoon: refreshMemorySoon } = useMemory(authed === true);

  useEffect(() => {
    setUnauthorizedHandler(() => setAuthed(false));
    getSessions().then(({ error }) => setAuthed(!error));
  }, []);

  function showToast(message: string, variant: 'success' | 'error') {
    setToast({ message, variant });
  }

  if (authed === null) {
    return null;
  }

  if (!authed) {
    return <AuthScreen onAuth={() => setAuthed(true)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        memory={memory}
        onRefreshMemory={refreshMemory}
        onLogout={() => { void logout().then(() => setAuthed(false)); }}
      />

      {/* Tab bar — only visible on mobile via CSS */}
      <div className="tab-bar">
        <button
          className={activeTab === 'browse' ? 'active' : ''}
          onClick={() => setActiveTab('browse')}
        >
          Browse
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions
        </button>
      </div>

      <main className="app-main">
        <div className={`tab-panel${activeTab !== 'browse' ? ' hidden' : ''}`}>
          <FileBrowser
            selectedDir={selectedDir}
            onSelect={setSelectedDir}
            onToast={showToast}
            onSessionStarted={() => {
              setSelectedDir(null);
              setActiveTab('sessions');
              refreshMemorySoon();
            }}
          />
        </div>
        <div className={`tab-panel${activeTab !== 'sessions' ? ' hidden' : ''}`}>
          <SessionList onToast={showToast} onSessionKilled={refreshMemorySoon} />
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
