import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineFolder, HiOutlineShare, HiPlus } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';

export default function Layout({ children, onSaveClick }) {
  const { user, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') setProfileOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = () => setProfileOpen(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [profileOpen]);

  const isActive = (path) => location.pathname === path;
  const initials = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <>
      <nav className="topnav">
        <div className="topnav-logo" onClick={() => navigate('/')}>
          <span>◆</span> Cortex
        </div>

        <div className="topnav-search">
          <button className="topnav-search-trigger" onClick={() => setCmdOpen(true)}>
            <HiOutlineSearch size={15} />
            Search your knowledge...
            <kbd>⌘K</kbd>
          </button>
        </div>

        <div className="topnav-actions">
          <button
            className={`topnav-btn ${isActive('/collections') ? 'active' : ''}`}
            onClick={() => navigate('/collections')}
          >
            <HiOutlineFolder /> <span>Collections</span>
          </button>
          <button
            className={`topnav-btn ${isActive('/graph') ? 'active' : ''}`}
            onClick={() => navigate('/graph')}
          >
            <HiOutlineShare /> <span>Graph</span>
          </button>
          <button className="topnav-save-btn" onClick={onSaveClick}>
            <HiPlus size={14} /> Save
          </button>
          <div
            className="topnav-avatar"
            onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
          >
            {initials}
          </div>
        </div>

        {profileOpen && (
          <div className="profile-dropdown" onClick={e => e.stopPropagation()}>
            <div className="profile-dropdown-email">
              <strong style={{ color: '#111318', display: 'block', marginBottom: 2 }}>{user?.name}</strong>
              {user?.email}
            </div>
            <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); navigate('/debug'); }}>
              Debug Mode
            </button>
            <button className="profile-dropdown-item danger" onClick={() => { setProfileOpen(false); logout(); }}>
              Sign Out
            </button>
          </div>
        )}
      </nav>

      <main className="main-content">
        {children}
      </main>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
