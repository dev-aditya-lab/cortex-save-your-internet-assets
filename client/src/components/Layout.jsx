import { NavLink } from 'react-router-dom';
import { HiOutlineHome, HiOutlineSearch, HiOutlineFolder, HiOutlineShare, HiOutlineChip, HiOutlineLogout } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>◆</span> Cortex
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineHome /> Dashboard
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineSearch /> Search
          </NavLink>
          <NavLink to="/collections" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineFolder /> Collections
          </NavLink>
          <NavLink to="/graph" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineShare /> Knowledge Graph
          </NavLink>
          <div style={{ borderTop: '1px solid #e2e5e9', margin: '8px 0' }}></div>
          <NavLink to="/debug" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineChip /> Debug Mode
          </NavLink>
        </nav>

        {/* User info + Logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e5e9' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'User'}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#646b75', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', color: '#dc2626', fontSize: '0.8125rem' }}
          >
            <HiOutlineLogout size={14} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
