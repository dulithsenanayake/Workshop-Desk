import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../utils/format.js';

export default function Layout() {
  const { user, can, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Workshop Desk</span>
          <nav aria-label="Main">
            {can('workshops:read') && <NavLink to="/workshops">Workshops</NavLink>}
            {can('users:manage') && <NavLink to="/users">Accounts</NavLink>}
            {can('audit:read') && <NavLink to="/audit">Activity log</NavLink>}
          </nav>
          <div className="who">
            <span>{user.name} <span className="muted">({ROLE_LABELS[user.role]})</span></span>
            <button className="btn btn-quiet" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}
