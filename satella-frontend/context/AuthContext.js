'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // true mientras se valida el token guardado al cargar la app.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(setUsuario)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, usuario: u } = await api.post('/auth/login', { email, password });
    setToken(token);
    setUsuario(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
