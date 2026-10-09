import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Spinner } from './ui.jsx';

/** Gate routes by login and (optionally) a permission. The backend enforces the same rules; this is only UX. */
export default function RequireAuth({ permission }) {
  const { user, loading, can } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) {
    return <main className="page"><Alert>Your role does not have access to this page.</Alert><Link className="btn" to="/">Go to my home page</Link></main>;
  }
  return <Outlet />;
}
