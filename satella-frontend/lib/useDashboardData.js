'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useDashboardData() {
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      api.get('/pedidos').catch((err) => { console.error(err); return []; }),
      api.get('/productos').catch((err) => { console.error(err); return []; }),
      api.get('/envios').catch((err) => { console.error(err); return []; }),
    ]).then(([p, pr, e]) => {
      setPedidos(p || []);
      setProductos(pr || []);
      setEnvios(e || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { pedidos, productos, envios, loading, refresh: load };
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
