'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const PUEDEN_GENERAR = ['Administrador', 'Operador'];

function minutosRestantes(expiraEn) {
  return Math.max(0, Math.ceil((new Date(expiraEn) - Date.now()) / 60000));
}

/**
 * Lista de repartidores con el botón para generar su PIN de WhatsApp.
 * El PIN se muestra una sola vez: si se cierra el aviso, hay que generar otro.
 */
export default function PinRepartidores() {
  const { usuario } = useAuth();
  const [repartidores, setRepartidores] = useState([]);
  const [generado, setGenerado] = useState(null);
  const [error, setError] = useState('');
  const [cargandoId, setCargandoId] = useState(null);
  const [, refrescar] = useState(0);

  useEffect(() => {
    api.get('/usuarios')
      .then((us) => setRepartidores(us.filter((u) => u.rol === 'Repartidor')))
      .catch((e) => setError(e.message));
  }, []);

  // Actualiza la cuenta regresiva mientras el PIN está en pantalla.
  useEffect(() => {
    if (!generado) return undefined;
    const t = setInterval(() => refrescar((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [generado]);

  const puedeGenerar = PUEDEN_GENERAR.includes(usuario?.rol);

  const generar = async (r) => {
    setError('');
    setCargandoId(r.id);
    try {
      setGenerado(await api.post(`/usuarios/${r.id}/pin`, {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoId(null);
    }
  };

  return (
    <section className="bg-surface border border-border rounded-card shadow-card p-5">
      <h2 className="m-0 mb-1 text-[15px]">PIN de repartidores</h2>
      <p className="m-0 mb-4 text-text-secondary text-xs leading-relaxed">
        El repartidor escribe este PIN en el chat de WhatsApp para ver su ruta y confirmar entregas.
        Vale 10 minutos, sirve una sola vez y al generar uno nuevo el anterior deja de funcionar.
      </p>

      {error && <p role="alert" className="m-0 mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {generado && (
        <div className="mb-4 rounded-[10px] border border-[var(--accent)] bg-surface-2 p-4 text-center">
          <div className="text-xs text-text-secondary mb-1">PIN para <b className="text-text-primary">{generado.usuario.nombre}</b></div>
          <div className="font-mono text-[34px] font-bold tracking-[0.3em] text-text-primary select-all" aria-label="PIN generado">
            {generado.pin}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {minutosRestantes(generado.expiraEn) > 0
              ? `Vence en ${minutosRestantes(generado.expiraEn)} min · No se volverá a mostrar`
              : 'Este PIN ya venció. Genera uno nuevo.'}
          </div>
          <button
            type="button"
            onClick={() => setGenerado(null)}
            className="mt-3 border border-border bg-surface text-text-secondary rounded-[8px] px-3 py-1.5 text-[11px] cursor-pointer hover:bg-surface-2"
          >
            Ya lo entregué, ocultar
          </button>
        </div>
      )}

      {repartidores.length === 0 ? (
        <p className="m-0 text-xs text-text-muted">No hay usuarios con rol Repartidor.</p>
      ) : (
        <ul className="m-0 p-0 list-none">
          {repartidores.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3 border-t border-border first:border-t-0">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{r.nombre}</div>
                <div className="text-[11px] text-text-muted">{r.telefono ? `WhatsApp +${r.telefono}` : 'Sin teléfono: agrégalo en Gestión de datos → Usuarios'}</div>
              </div>
              {puedeGenerar && (
                <button
                  type="button"
                  disabled={!r.telefono || cargandoId === r.id}
                  onClick={() => generar(r)}
                  className="shrink-0 border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-3.5 py-2 font-semibold cursor-pointer hover:brightness-95 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargandoId === r.id ? 'Generando…' : 'Generar PIN'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!puedeGenerar && (
        <p className="m-0 mt-3 text-[11px] text-text-muted">Solo un Administrador o un Operador puede generar PINs.</p>
      )}
    </section>
  );
}
