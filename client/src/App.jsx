import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Collections from './pages/Collections';
import Graph from './pages/Graph';
import Debug from './pages/Debug';
import Login from './pages/Login';
import './index.css';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-center"><div className="spinner"></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/graph" element={<Graph />} />
        {/* <Route path="/debug" element={<Debug />} /> */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
