import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { loginRequest, registerRequest } from '../services/authApi';
import { AUTH_LOGOUT_EVENT, clearSession, getToken, getUser, saveSession } from '../utils/authStorage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restored from localStorage, so a page reload keeps the user logged in.
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(() => getUser());
  const [sessionExpired, setSessionExpired] = useState(false);

  const applySession = useCallback((newToken, newUser) => {
    saveSession(newToken, newUser);
    setTokenState(newToken);
    setUser(newUser);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setTokenState(null);
    setUser(null);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const result = await loginRequest(email, password);
      applySession(result.token, result.data.user);
    },
    [applySession]
  );

  const register = useCallback(
    async (name, email, password) => {
      const result = await registerRequest(name, email, password);
      applySession(result.token, result.data.user);
    },
    [applySession]
  );

  // API interceptors fire this on any 401 (expired/invalid token).
  useEffect(() => {
    const onForcedLogout = () => {
      logout();
      setSessionExpired(true);
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
  }, [logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      sessionExpired,
      login,
      register,
      logout,
    }),
    [token, user, sessionExpired, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
