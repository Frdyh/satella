'use client';

import { getPdfUrl } from '../../lib/api';

const reports = [
  {
    key: 'ventas',
    title: 'Ventas',
    description: 'Resumen de ventas, ingresos y productos vendidos.',
    icon: '▤',
    endpoint: '/reportes/ventas',
  },
  {
    key: 'inventario',
    title: 'Inventario',
    description: 'Existencias, movimientos y productos con stock bajo.',
    icon: '◫',
    endpoint: '/reportes/inventario',
  },
  {
    key: 'clientes',
    title: 'Clientes',
    description: 'Altas, actividad y comportamiento de clientes.',
    icon: '♧',
    endpoint: '/reportes/clientes',
  },
  {
    key: 'envios',
    title: 'Envíos',
    description: 'Estado de entregas, tiempos y pedidos pendientes.',
    icon: '◇',
    endpoint: '/reportes/envios',
  },
];

export default function ReportGrid() {
  return (
    <div className="grid grid-cols-4 gap-[15px] mb-[18px]">
      {reports.map((r) => (
        <div key={r.key} className="bg-surface border border-border rounded-card shadow-card p-5">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-surface-2 flex items-center justify-center text-[var(--accent)] text-[19px] mb-4">
            {r.icon}
          </div>
          <h3 className="m-0 mb-[7px] text-[15px]">{r.title}</h3>
          <p className="m-0 mb-5 text-text-secondary text-[11px] leading-relaxed min-h-[50px]">
            {r.description}
          </p>
          <a
            href={getPdfUrl(r.endpoint)}
            target="_blank"
            rel="noopener noreferrer"
            className="border-0 bg-none text-[var(--primary)] font-bold text-[11px] p-0 cursor-pointer hover:underline"
          >
            Generar PDF →
          </a>
        </div>
      ))}
    </div>
  );
}
