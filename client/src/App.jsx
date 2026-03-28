import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import SaveModal from './components/SaveModal';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Collections from './pages/Collections';
import Graph from './pages/Graph';
import Debug from './pages/Debug';
import Login from './pages/Login';
import './index.css';

function LoadingScreen() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-screen-logo">
        <span>◆</span> Cortex
      </div>
      <div className="spinner" style={{ width: 22, height: 22 }}></div>
      <div className="loading-screen-msg">
        {elapsed < 5
          ? 'Loading your knowledge base...'
          : elapsed < 15
            ? 'Waking up server — this may take up to 60 seconds'
            : 'Still connecting... the server is starting up'}
      </div>
      {elapsed >= 5 && (
        <div className="loading-screen-sub">Free tier servers sleep after inactivity</div>
      )}
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout onSaveClick={() => setSaveOpen(true)}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/graph" element={<Graph />} />
        <Route path="/debug" element={<Debug />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SaveModal isOpen={saveOpen} onClose={() => setSaveOpen(false)} onSaved={() => window.location.reload()} />
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
