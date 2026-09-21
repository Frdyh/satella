'use client';

import { useMemo } from 'react';

function timeAgo(date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'hace instantes';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default function RecentActivity({ pedidos, envios }) {
  const activities = useMemo(() => {
    const fromPedidos = pedidos.map((p) => ({
      title: `Pedido #${p.id}`,
      subtitle: `${p.cliente?.nombre || 'Cliente'} · ${p.estado}`,
      date: new Date(p.fecha),
    }));
    const fromEnvios = envios.map((e) => ({
      title: `Envío #${e.id}`,
      subtitle: `${e.pedido?.cliente?.nombre || 'Cliente'} · ${e.estado}`,
      date: new Date(e.fechaProgramada),
    }));
    return [...fromPedidos, ...fromEnvios]
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);
  }, [pedidos, envios]);

  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="flex justify-between items-center mb-[18px]">
        <div>
          <b className="block text-sm">Actividad reciente</b>
          <span className="block text-text-muted text-[11px] mt-1">Últimas operaciones</span>
        </div>
      </div>
      {activities.length === 0 && (
        <p className="text-text-muted text-xs py-4 text-center">Aún no hay actividad registrada.</p>
      )}
      {activities.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-[13px] px-2.5 -mx-2.5 rounded-[8px] border-b border-border last:border-b-0 transition-colors cursor-default hover:bg-surface-2"
        >
          <div>
            <b className="block text-xs">{a.title}</b>
            <span className="block text-[11px] text-text-muted mt-0.5 capitalize">
              {a.subtitle} · {timeAgo(a.date)}
            </span>
          </div>
          <em className="not-italic text-[var(--accent)] text-xs">●</em>
        </div>
      ))}
    </div>
  );
}
