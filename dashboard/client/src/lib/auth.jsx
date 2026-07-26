import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

async function tryRefresh() {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchWithAuth(url, options = {}) {
  let res = await fetch(url, { ...options, credentials: 'include' });

  if (res.status === 401 && !url.includes('/api/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(url, { ...options, credentials: 'include' });
    }
  }

  return res;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
      if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          const retryRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (retryRes.ok) {
            const data = await retryRes.json();
            setUser(data.user);
            return true;
          }
        }
      }
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth().finally(() => setLoading(false));

    refreshIntervalRef.current = setInterval(() => {
      tryRefresh();
    }, 30 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [checkAuth]);

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = { user, loading, login, logout, fetchWithAuth };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
