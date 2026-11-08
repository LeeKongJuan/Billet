import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/http.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const logoutOnPageHide = (event) => {
      // Keep the session when the browser places the page in its back/forward cache.
      if (event.persisted) return;

      const logoutUrl = new URL('/api/auth/logout', window.location.origin);
      const sent = navigator.sendBeacon?.(logoutUrl);

      // sendBeacon is best-effort; use a keepalive request when it is unavailable
      // or the browser refuses to queue the beacon during page shutdown.
      if (!sent) {
        fetch(logoutUrl, {
          method: 'POST',
          credentials: 'include',
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('pagehide', logoutOnPageHide);
    return () => window.removeEventListener('pagehide', logoutOnPageHide);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    setUser(null);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
