import { AUTH_LOGOUT_EVENT, clearSession, getToken } from '../utils/authStorage';

// Shared by nodeApi and pythonApi so auth header logic exists exactly once.
export function attachAuthInterceptors(client) {
  // Request: add "Authorization: Bearer <JWT>" when logged in.
  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response: a 401 on an authenticated call means the token is missing,
  // invalid or expired -> clear it and tell AuthContext to log out.
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const hadToken = Boolean(error.config?.headers?.Authorization);
      if (error.response?.status === 401 && hadToken) {
        clearSession();
        window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
      }
      return Promise.reject(error);
    }
  );

  return client;
}
