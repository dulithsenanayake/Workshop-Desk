import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Spinner } from './ui.jsx';

/** Gate routes by login and (optionally) a permission. The backend enforces the same rules; this is only UX. */
export default function RequireAuth({ permission }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !can(permission)) {
    return <main className="page"><Alert>Your role does not have access to this page.</Alert></main>;
  }
  return <Outlet />;
}
