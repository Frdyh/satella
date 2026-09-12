const activities = [
  { title: 'Pedido #1048', subtitle: 'Nuevo pedido · hace 4 min' },
  { title: 'Producto actualizado', subtitle: 'Yogur natural · hace 18 min' },
  { title: 'Envío despachado', subtitle: '#E-309 · hace 31 min' },
  { title: 'Cliente registrado', subtitle: 'Laura Gómez · hace 1 h' },
];

export default function RecentActivity() {
  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="flex justify-between items-center mb-[18px]">
        <div>
          <b className="block text-sm">Actividad reciente</b>
          <span className="block text-text-muted text-[11px] mt-1">Últimas operaciones</span>
        </div>
      </div>
      {activities.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-[13px] px-2.5 -mx-2.5 rounded-[8px] border-b border-border last:border-b-0 transition-colors cursor-default hover:bg-surface-2"
        >
          <div>
            <b className="block text-xs">{a.title}</b>
            <span className="block text-[11px] text-text-muted mt-0.5">{a.subtitle}</span>
          </div>
          <em className="not-italic text-[var(--accent)] text-xs">●</em>
        </div>
      ))}
    </div>
  );
}
