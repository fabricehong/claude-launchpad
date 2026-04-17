import { useState } from 'react';
import type { Credentials } from './api.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Header from './components/Header.tsx';
import FileBrowser from './components/FileBrowser.tsx';
import SessionList from './components/SessionList.tsx';
import Toast from './components/Toast.tsx';
import './index.css';

export interface ToastState {
  message: string;
  variant: 'success' | 'error';
}

type Tab = 'browse' | 'sessions';

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('browse');

  function showToast(message: string, variant: 'success' | 'error') {
    setToast({ message, variant });
  }

  if (!creds) {
    return <AuthScreen onAuth={setCreds} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onLogout={() => setCreds(null)} />

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
            creds={creds}
            selectedDir={selectedDir}
            onSelect={setSelectedDir}
            onToast={showToast}
            onSessionStarted={() => {
              setSelectedDir(null);
              setActiveTab('sessions');
            }}
          />
        </div>
        <div className={`tab-panel${activeTab !== 'sessions' ? ' hidden' : ''}`}>
          <SessionList creds={creds} onToast={showToast} />
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
