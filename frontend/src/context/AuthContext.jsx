import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, permissions: [] });
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setSession({ user: null, permissions: [] });
  }, []);

  // Restore the session on page load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then(setSession).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  // Any 401 from the API (expired token, disabled account) signs the user out.
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { token } = await api.login(email, password);
    tokenStore.set(token);
    setSession(await api.me());
  }, []);

  const value = useMemo(
    () => ({ ...session, loading, login, logout, can: (p) => session.permissions.includes(p) }),
    [session, loading, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
