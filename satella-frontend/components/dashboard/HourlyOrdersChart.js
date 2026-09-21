'use client';

import { isSameDay } from '../../lib/useDashboardData';

export default function HourlyOrdersChart({ pedidos }) {
  const today = new Date();
  const todays = pedidos.filter((p) => isSameDay(new Date(p.fecha), today));

  const counts = Array(24).fill(0);
  todays.forEach((p) => {
    counts[new Date(p.fecha).getHours()] += 1;
  });

  let firstHour = counts.findIndex((c) => c > 0);
  let lastHour = counts.length - 1 - [...counts].reverse().findIndex((c) => c > 0);
  if (firstHour === -1) {
    firstHour = 8;
    lastHour = 20;
  } else {
    firstHour = Math.max(0, firstHour - 1);
    lastHour = Math.min(23, lastHour + 1);
  }

  const hours = [];
  for (let h = firstHour; h <= lastHour; h++) hours.push(h);
  const max = Math.max(1, ...hours.map((h) => counts[h]));

  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-text-secondary text-[11px]">
          {todays.length} pedido{todays.length === 1 ? '' : 's'} hoy · por hora
        </span>
      </div>
      {todays.length === 0 ? (
        <p className="text-text-muted text-xs py-6 text-center">Aún no hay pedidos registrados hoy.</p>
      ) : (
        <div className="h-[150px] flex items-end gap-[3px] border-b border-border">
          {hours.map((h) => (
            <div key={h} className="group relative flex-1 h-full flex items-end justify-center cursor-pointer">
              {counts[h] > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-[var(--bg)] text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 whitespace-nowrap pointer-events-none">
                  {counts[h]}
                </div>
              )}
              <div
                className="w-full rounded-t-[4px] opacity-80 transition-all duration-150 group-hover:opacity-100 group-hover:brightness-110"
                style={{
                  height: `${Math.max(3, (counts[h] / max) * 100)}%`,
                  background: 'linear-gradient(to top, var(--primary), var(--secondary))',
                }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-[3px] pt-2">
        {hours.map((h) => (
          <span key={h} className="flex-1 text-center text-text-muted text-[9px]">
            {h % 2 === 0 ? `${h}h` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
