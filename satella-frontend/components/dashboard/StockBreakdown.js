'use client';

export default function StockBreakdown({ productos }) {
  const sinStock = productos.filter((p) => p.stockActual <= 0);
  const stockBajo = productos.filter((p) => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
  const stockOk = productos.filter((p) => p.stockActual > p.stockMinimo);
  const total = Math.max(1, productos.length);

  const segments = [
    { label: 'Con stock', count: stockOk.length, color: '#5c9c6a' },
    { label: 'Stock bajo', count: stockBajo.length, color: 'var(--accent)' },
    { label: 'Sin stock', count: sinStock.length, color: '#c56b6b' },
  ];

  const criticos = [...sinStock, ...stockBajo].slice(0, 5);

  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden mb-3 border border-border">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.count / total) * 100}%`, background: s.color }}
            className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="flex gap-4 flex-wrap mb-4">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            {s.label} <b className="text-text-primary">{s.count}</b>
          </div>
        ))}
      </div>
      {criticos.length > 0 ? (
        <div>
          <span className="block text-text-muted text-[10px] uppercase tracking-widest font-bold mb-2">
            Requieren atención
          </span>
          <div className="flex flex-col gap-1.5">
            {criticos.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs py-1">
                <span className="text-text-secondary">{p.nombre}</span>
                <span className={p.stockActual <= 0 ? 'text-[#c56b6b] font-semibold' : 'text-[var(--accent)] font-semibold'}>
                  {p.stockActual} {p.unidad}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-text-muted text-xs py-2">Todos los productos tienen stock saludable.</p>
      )}
    </div>
  );
}
