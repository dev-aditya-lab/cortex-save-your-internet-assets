import { NavLink } from 'react-router-dom';
import { HiOutlineHome, HiOutlineSearch, HiOutlineFolder, HiOutlineShare, HiOutlineChip } from 'react-icons/hi';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>◆</span> Cortex
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineHome />
            Dashboard
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineSearch />
            Search
          </NavLink>
          <NavLink to="/collections" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineFolder />
            Collections
          </NavLink>
          <NavLink to="/graph" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineShare />
            Knowledge Graph
          </NavLink>
          <div style={{ borderTop: '1px solid #e2e5e9', margin: '8px 0' }}></div>
          <NavLink to="/debug" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <HiOutlineChip />
            Debug Mode
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
