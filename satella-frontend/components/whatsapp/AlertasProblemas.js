'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const TIPOS = {
  cliente_ausente: 'Cliente ausente',
  direccion_erronea: 'Dirección errónea',
  producto_danado: 'Producto dañado',
  otro: 'Otro problema',
};
const PUEDEN_ATENDER = ['Administrador', 'Operador'];
const REFRESCO_MS = 30000;

function hace(fecha) {
  const min = Math.round((Date.now() - new Date(fecha)) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : new Date(fecha).toLocaleDateString('es-CO');
}

/**
 * Problemas que reportan los repartidores desde WhatsApp. Se actualiza solo
 * cada 30 s; las abiertas se pueden marcar como atendidas.
 */
export default function AlertasProblemas() {
  const { usuario } = useAuth();
  const [vista, setVista] = useState('abierto');
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState('');
  const [atendiendo, setAtendiendo] = useState(null);

  const cargar = useCallback(() => {
    api.get(`/alertas?estado=${vista}`)
      .then((a) => { setAlertas(a); setError(''); })
      .catch((e) => setError(e.message));
  }, [vista]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const atender = async (a) => {
    setAtendiendo(a.id);
    try {
      await api.put(`/alertas/${a.id}/atender`, {});
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setAtendiendo(null);
    }
  };

  const puedeAtender = PUEDEN_ATENDER.includes(usuario?.rol);

  return (
    <section className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="m-0 text-[15px]">
          Alertas de repartidores
          {vista === 'abierto' && alertas.length > 0 && (
            <span className="ml-2 inline-block rounded-full bg-[var(--accent)] text-[#1A1533] text-[10px] font-bold px-2 py-0.5 align-middle">
              {alertas.length}
            </span>
          )}
        </h2>
        <div className="flex gap-1.5">
          {[['abierto', 'Abiertas'], ['atendido', 'Atendidas']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setVista(k)}
              className={`border border-border rounded-[8px] px-2.5 py-1 text-[11px] cursor-pointer ${vista === k ? 'bg-surface-2 text-text-primary font-bold' : 'bg-surface text-text-secondary hover:bg-surface-2'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="m-0 mb-4 text-text-secondary text-xs leading-relaxed">
        Lo que reportan los repartidores desde WhatsApp. Los operarios que le escribieron al bot en las últimas 24 h también reciben el aviso en su chat.
      </p>

      {error && <p role="alert" className="m-0 mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {alertas.length === 0 ? (
        <p className="m-0 text-xs text-text-muted">{vista === 'abierto' ? 'No hay problemas abiertos. 🎉' : 'Todavía no hay alertas atendidas.'}</p>
      ) : (
        <ul className="m-0 p-0 list-none">
          {alertas.map((a) => (
            <li key={a.id} className="py-3 border-t border-border first:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {vista === 'abierto' ? '⚠️ ' : '✅ '}{TIPOS[a.tipo] || a.tipo} · Envío #{a.envio?.id}
                  </div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    {a.envio?.pedido?.cliente?.nombre || 'Cliente'}{a.envio?.ventanaHoraria ? ` · ${a.envio.ventanaHoraria}` : ''}
                    {' · '}Reportó {a.usuario?.nombre} {hace(a.creadoEn)}
                  </div>
                  {a.detalle && <div className="text-xs text-text-primary mt-1.5 italic">“{a.detalle}”</div>}
                  {a.atendidoPor && <div className="text-[11px] text-text-muted mt-1">Atendida por {a.atendidoPor.nombre}</div>}
                </div>
                {vista === 'abierto' && puedeAtender && (
                  <button
                    type="button"
                    disabled={atendiendo === a.id}
                    onClick={() => atender(a)}
                    className="shrink-0 border border-border bg-surface text-text-primary rounded-[8px] px-3 py-1.5 text-[11px] font-semibold cursor-pointer hover:bg-surface-2 disabled:opacity-50"
                  >
                    {atendiendo === a.id ? 'Guardando…' : 'Marcar atendida'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
