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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 10, border: '1px solid #e2e5e9', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: '#2563eb' }}>◆</span> Cortex
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#646b75', marginTop: 6 }}>
            Save, organize, and rediscover knowledge
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', marginBottom: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e5e9' }}>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{ flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
              background: isLogin ? '#2563eb' : '#fff', color: isLogin ? '#fff' : '#646b75' }}
          >Sign In</button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{ flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
              background: !isLogin ? '#2563eb' : '#fff', color: !isLogin ? '#fff' : '#646b75' }}
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

          {error && (
            <p style={{ fontSize: '0.8125rem', color: '#dc2626', marginBottom: 12 }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 0', marginTop: 4 }} disabled={loading}>
            {loading ? (
              <><div className="spinner" style={{ width: 14, height: 14 }}></div> {isLogin ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
