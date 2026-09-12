'use client';

import Link from 'next/link';

export default function StatsGrid() {
  const stats = [
    { label: 'Pedidos hoy', value: '48', detail: '↑ 12% vs. ayer', href: '/datos?entity=pedidos' },
    { label: 'Ventas del mes', value: '$8.4M', detail: '↑ 8.7% este mes', href: '/reportes' },
    { label: 'Productos activos', value: '126', detail: '4 con stock bajo', href: '/datos?entity=productos' },
    { label: 'Envíos pendientes', value: '17', detail: '3 requieren atención', href: '/envios' },
  ];

  return (
    <div className="grid grid-cols-4 gap-[15px] mb-[18px]">
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="block bg-surface border border-border rounded-card shadow-card p-[19px] no-underline text-inherit transition-all duration-150 cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(30,24,60,.1)] hover:border-[var(--primary)] dark:hover:border-[var(--accent)]"
        >
          <span className="block text-text-secondary text-xs">{s.label}</span>
          <strong className="block text-[27px] my-[9px] mb-[5px]">{s.value}</strong>
          <small className="block text-xs text-[#7a8f72]">{s.detail}</small>
        </Link>
      ))}
    </div>
  );
}
