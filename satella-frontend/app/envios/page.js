'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeading from '../../components/ui/PageHeading';
import StatusBadge from '../../components/ui/StatusBadge';
import { api } from '../../lib/api';

const filterTabs = [
  { key: 'todos', label: 'Todos' },
  { key: 'en cola', label: 'Preparando' },
  { key: 'en ruta', label: 'En camino' },
  { key: 'entregado', label: 'Entregado' },
];

export default function EnviosPage() {
  const [envios, setEnvios] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/envios').then(setEnvios).catch(console.error);
  }, []);

  const filtered = envios.filter((e) => {
    if (filter !== 'todos' && e.estado !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      const cliente = e.pedido?.cliente?.nombre?.toLowerCase() || '';
      const notas = e.notas?.toLowerCase() || '';
      if (!cliente.includes(s) && !notas.includes(s)) return false;
    }
    return true;
  });

  const counts = {
    todos: envios.length,
    'en cola': envios.filter((e) => e.estado === 'en cola').length,
    'en ruta': envios.filter((e) => e.estado === 'en ruta').length,
    entregado: envios.filter((e) => e.estado === 'entregado').length,
  };

  return (
    <>
      <PageHeading
        eyebrow="Satella · Operaciones"
        title="Envíos"
        subtitle="Controla el estado de cada pedido desde un solo lugar. Para crear o editar envíos, usa la base de datos."
        action={
          <Link
            href="/datos?entity=envios&create=1"
            className="inline-block border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95 no-underline"
          >
            + Crear envío
          </Link>
        }
      />

      <div className="flex gap-2 items-center mb-4 flex-wrap">
        <input
          placeholder="Buscar pedido, cliente o guía..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-border bg-surface rounded-[8px] px-3 py-2.5 text-text-primary outline-none min-w-[250px] flex-1 text-xs"
        />
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`border border-border bg-surface text-text-secondary px-3 py-2 rounded-[8px] cursor-pointer text-xs ${
              filter === tab.key ? 'bg-surface-2 text-text-primary font-bold' : ''
            } hover:bg-surface-2`}
          >
            {tab.label} <b className="ml-1 text-[10px]">{counts[tab.key]}</b>
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="text-left px-[18px] py-[15px] text-[10px] uppercase tracking-widest text-text-muted font-bold bg-surface-2 border-b border-border">
                Pedido
              </th>
              <th className="text-left px-[18px] py-[15px] text-[10px] uppercase tracking-widest text-text-muted font-bold bg-surface-2 border-b border-border">
                Cliente
              </th>
              <th className="text-left px-[18px] py-[15px] text-[10px] uppercase tracking-widest text-text-muted font-bold bg-surface-2 border-b border-border">
                Destino
              </th>
              <th className="text-left px-[18px] py-[15px] text-[10px] uppercase tracking-widest text-text-muted font-bold bg-surface-2 border-b border-border">
                Estado
              </th>
              <th className="text-left px-[18px] py-[15px] text-[10px] uppercase tracking-widest text-text-muted font-bold bg-surface-2 border-b border-border">
                Fecha
              </th>
              <th className="text-left px-[18px] py-[15px] text-[10px] uppercase tracking-widest text-text-muted font-bold bg-surface-2 border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-b-0">
                <td className="px-[18px] py-[15px] text-text-secondary">
                  <b className="text-text-primary">#{e.pedidoId}</b>
                </td>
                <td className="px-[18px] py-[15px] text-text-secondary">
                  {e.pedido?.cliente?.nombre || '—'}
                </td>
                <td className="px-[18px] py-[15px] text-text-secondary">
                  {e.pedido?.cliente?.ciudad || '—'}
                </td>
                <td className="px-[18px] py-[15px]">
                  <StatusBadge estado={e.estado} />
                </td>
                <td className="px-[18px] py-[15px] text-text-secondary">
                  {new Date(e.fechaProgramada).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  {e.ventanaHoraria ? ` · ${e.ventanaHoraria}` : ''}
                </td>
                <td className="px-[18px] py-[15px] text-text-secondary">⋯</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-[18px] py-[30px] text-center text-text-muted text-xs">
                  No se encontraron envíos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
