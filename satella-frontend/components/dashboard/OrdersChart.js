'use client';

import Link from 'next/link';

export default function OrdersChart() {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const heights = [42, 61, 48, 76, 58, 88, 70];
  const pedidos = [18, 26, 21, 33, 25, 38, 30];

  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="flex justify-between items-center mb-[18px]">
        <div>
          <b className="block text-sm">Actividad de pedidos</b>
          <span className="block text-text-muted text-[11px] mt-1">Últimos 7 días</span>
        </div>
        <Link
          href="/reportes"
          className="inline-block border border-border bg-surface text-text-secondary px-3 py-2 rounded-[8px] cursor-pointer hover:bg-surface-2 hover:text-text-primary transition-colors text-xs no-underline"
        >
          Ver reporte
        </Link>
      </div>
      <div className="h-[245px] pt-6 px-3 pb-1">
        <div className="h-[190px] flex items-end gap-3 border-b border-border">
          {heights.map((h, i) => (
            <div key={i} className="group relative flex-1 h-full flex items-end justify-center cursor-pointer">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-[var(--bg)] text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 whitespace-nowrap pointer-events-none">
                {pedidos[i]} pedidos
              </div>
              <div
                className="w-full rounded-t-[5px] opacity-80 transition-all duration-150 group-hover:opacity-100 group-hover:brightness-110 group-hover:shadow-[0_0_14px_rgba(126,111,191,0.45)]"
                style={{
                  height: `${h}%`,
                  background: 'linear-gradient(to top, var(--primary), var(--secondary))',
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-around pt-2 text-text-muted text-[10px]">
          {days.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
