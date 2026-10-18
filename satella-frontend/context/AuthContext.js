'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // true mientras se valida el token guardado al cargar la app.
  const [loading, setLoading] = useState(true);
  // true cuando el usuario cerró sesión a propósito: en ese caso el login no
  // debe recordar la página anterior (?next=), porque quien entre después
  // podría ser otra persona.
  const [loggedOut, setLoggedOut] = useState(false);

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
    setLoggedOut(false);
    return u;
  }, []);

  // Solo limpia la sesión; AppShell se encarga de llevar al login.
  const logout = useCallback(() => {
    setToken(null);
    setUsuario(null);
    setLoggedOut(true);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, loading, loggedOut, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
