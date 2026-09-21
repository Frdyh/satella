'use client';

import { isSameDay } from '../../lib/useDashboardData';

const COLOR_MAP = {
  'en cola': 'var(--accent)',
  'en ruta': 'var(--secondary)',
  entregado: '#5c9c6a',
  retraso: '#c56b6b',
};
const FALLBACK_COLOR = '#9795A8';

export default function ShipmentsDonut({ envios }) {
  const today = new Date();
  const todays = envios.filter((e) => isSameDay(new Date(e.fechaProgramada), today));

  const counts = {};
  todays.forEach((e) => {
    counts[e.estado] = (counts[e.estado] || 0) + 1;
  });
  const estados = Object.keys(counts);
  const total = todays.length;

  const r = 44;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {total === 0 ? (
        <p className="text-text-muted text-xs py-6 text-center w-full">No hay envíos programados para hoy.</p>
      ) : (
        <>
          <svg viewBox="0 0 110 110" className="w-[130px] h-[130px] shrink-0 -rotate-90">
            <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
            {estados.map((estado) => {
              const count = counts[estado];
              const len = (count / total) * circumference;
              const circle = (
                <circle
                  key={estado}
                  cx="55"
                  cy="55"
                  r={r}
                  fill="none"
                  stroke={COLOR_MAP[estado] || FALLBACK_COLOR}
                  strokeWidth="14"
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return circle;
            })}
          </svg>
          <div className="flex flex-col gap-2">
            {estados.map((estado) => (
              <div key={estado} className="flex items-center gap-2 text-xs">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR_MAP[estado] || FALLBACK_COLOR }} />
                <span className="capitalize text-text-secondary">{estado}</span>
                <b className="text-text-primary">{counts[estado]}</b>
                <span className="text-text-muted">({Math.round((counts[estado] / total) * 100)}%)</span>
              </div>
            ))}
            <span className="text-text-muted text-[11px] mt-1">{total} envíos programados hoy</span>
          </div>
        </>
      )}
    </div>
  );
}
