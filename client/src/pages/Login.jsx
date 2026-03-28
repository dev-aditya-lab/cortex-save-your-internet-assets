import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(name, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f7f9' }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 10, border: '1px solid #e0e2e7', padding: 32 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: '#2563eb', fontSize: '1.25rem' }}>◆</span> Cortex
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8b919e', marginTop: 6 }}>
            Your knowledge, organized
          </p>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid #e0e2e7' }}>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{ flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8125rem',
              background: isLogin ? '#111318' : '#fff', color: isLogin ? '#fff' : '#8b919e' }}
          >Sign In</button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{ flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8125rem',
              background: !isLogin ? '#111318' : '#fff', color: !isLogin ? '#fff' : '#8b919e' }}
          >Sign Up</button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          {error && <p style={{ fontSize: '0.75rem', color: '#e5484d', marginBottom: 10 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '9px 0', marginTop: 4 }}>
            {loading ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> {isLogin ? 'Signing in...' : 'Creating account...'}</> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}
