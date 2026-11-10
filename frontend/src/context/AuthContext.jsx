import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../api/auth.js';
import { setUnauthorizedHandler } from '../api/client.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const value = localStorage.getItem('crm_user');
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem('crm_user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('crm_token'));
  const [user, setUser] = useState(readStoredUser);

  const logout = useCallback(() => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials);
    if (!result?.token || !result?.user) {
      throw new Error('La API devolvió una respuesta de inicio de sesión incompleta.');
    }
    localStorage.setItem('crm_token', result.token);
    localStorage.setItem('crm_user', JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback((userData) => registerRequest(userData), []);

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token && user), login, logout, register }),
    [token, user, login, logout, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
