'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { isSameDay } from '../../lib/useDashboardData';
import HourlyOrdersChart from './HourlyOrdersChart';
import StockBreakdown from './StockBreakdown';
import ShipmentsDonut from './ShipmentsDonut';

export default function StatsGrid({ pedidos, productos, envios }) {
  const [expanded, setExpanded] = useState(null);
  const [hovered, setHovered] = useState(null);

  const stats = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const pedidosHoy = pedidos.filter((p) => isSameDay(new Date(p.fecha), today));
    const pedidosAyer = pedidos.filter((p) => {
      const d = new Date(p.fecha);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return isSameDay(d, yesterday);
    });
    const variacionPedidos = pedidosAyer.length
      ? Math.round(((pedidosHoy.length - pedidosAyer.length) / pedidosAyer.length) * 100)
      : null;

    const ventasMes = pedidos
      .filter((p) => new Date(p.fecha) >= startOfMonth && p.estado !== 'cancelado')
      .reduce((sum, p) => sum + (p.items || []).reduce((s, it) => s + it.cantidad * (it.producto?.precio || 0), 0), 0);

    const stockBajoCount = productos.filter((p) => p.stockActual <= p.stockMinimo).length;

    const enviosPendientes = envios.filter((e) => e.estado !== 'entregado');
    const enviosAtencion = envios.filter((e) => e.estado === 'retraso').length;

    return [
      {
        key: 'pedidos',
        label: 'Pedidos hoy',
        value: String(pedidosHoy.length),
        detail:
          variacionPedidos === null
            ? 'Sin datos de ayer'
            : `${variacionPedidos >= 0 ? '↑' : '↓'} ${Math.abs(variacionPedidos)}% vs. ayer`,
        chart: 'pedidos',
        href: '/datos?entity=pedidos',
      },
      {
        key: 'ventas',
        label: 'Ventas del mes',
        value: ventasMes.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
        detail: 'Pedidos no cancelados',
        chart: null,
        href: '/reportes',
      },
      {
        key: 'productos',
        label: 'Productos activos',
        value: String(productos.length),
        detail: `${stockBajoCount} con stock bajo`,
        chart: 'productos',
        href: '/datos?entity=productos',
      },
      {
        key: 'envios',
        label: 'Envíos pendientes',
        value: String(enviosPendientes.length),
        detail: enviosAtencion > 0 ? `${enviosAtencion} requieren atención` : 'Todo en orden',
        chart: 'envios',
        href: '/envios',
      },
    ];
  }, [pedidos, productos, envios]);

  const activeKey = expanded || hovered;
  const activeStat = stats.find((s) => s.key === activeKey);

  return (
    <div>
      <div className="grid grid-cols-4 gap-[15px] mb-[18px]">
        {stats.map((s) => {
          const isActive = activeKey === s.key;
          const CardTag = s.chart ? 'div' : Link;
          const cardProps = s.chart
            ? {
                role: 'button',
                tabIndex: 0,
                onClick: () => setExpanded(expanded === s.key ? null : s.key),
                onMouseEnter: () => setHovered(s.key),
                onMouseLeave: () => setHovered(null),
                onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') setExpanded(expanded === s.key ? null : s.key);
                },
              }
            : { href: s.href };

          return (
            <CardTag
              key={s.key}
              {...cardProps}
              className={`block bg-surface border rounded-card shadow-card p-[19px] no-underline text-inherit transition-all duration-150 cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(30,24,60,.1)] ${
                isActive ? 'border-[var(--primary)] dark:border-[var(--accent)]' : 'border-border hover:border-[var(--primary)] dark:hover:border-[var(--accent)]'
              }`}
            >
              <span className="flex items-center justify-between text-text-secondary text-xs">
                {s.label}
                {s.chart && <em className="not-italic text-text-muted text-[10px]">{isActive ? '▲' : '▾'}</em>}
              </span>
              <strong className="block text-[27px] my-[9px] mb-[5px]">{s.value}</strong>
              <small className="block text-xs text-[#7a8f72]">{s.detail}</small>
            </CardTag>
          );
        })}
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          activeStat ? 'grid-rows-[1fr] mb-[18px]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          {activeStat && (
            <div className="bg-surface border border-border rounded-card shadow-card p-5">
              <div className="flex justify-between items-center mb-3">
                <b className="text-sm">{activeStat.label}</b>
                <Link
                  href={activeStat.href}
                  className="text-[11px] text-text-secondary hover:text-text-primary no-underline"
                >
                  Ver todo →
                </Link>
              </div>
              {activeStat.chart === 'pedidos' && <HourlyOrdersChart pedidos={pedidos} />}
              {activeStat.chart === 'productos' && <StockBreakdown productos={productos} />}
              {activeStat.chart === 'envios' && <ShipmentsDonut envios={envios} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
