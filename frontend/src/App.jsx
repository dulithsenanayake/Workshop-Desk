import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import WorkshopsPage from './pages/WorkshopsPage.jsx';
import WorkshopDetailPage from './pages/WorkshopDetailPage.jsx';
import WorkshopFormPage from './pages/WorkshopFormPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import AuditPage from './pages/AuditPage.jsx';

/** Each role lands on the first screen it is allowed to use. */
function Home() {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={can('workshops:read') ? '/workshops' : '/users'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route element={<RequireAuth permission="workshops:read" />}>
            <Route path="/workshops" element={<WorkshopsPage />} />
            <Route path="/workshops/:id" element={<WorkshopDetailPage />} />
          </Route>
          <Route element={<RequireAuth permission="workshops:write" />}>
            <Route path="/workshops/new" element={<WorkshopFormPage />} />
            <Route path="/workshops/:id/edit" element={<WorkshopFormPage />} />
          </Route>
          <Route element={<RequireAuth permission="users:manage" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route element={<RequireAuth permission="audit:read" />}>
            <Route path="/audit" element={<AuditPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
