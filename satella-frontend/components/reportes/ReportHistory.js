const history = [
  { title: 'Ventas — Agosto 2026', meta: 'PDF · hace 2 h', endpoint: '/reportes/ventas' },
  { title: 'Inventario — Agosto 2026', meta: 'PDF · ayer', endpoint: '/reportes/inventario' },
  { title: 'Envíos — Semana 34', meta: 'PDF · hace 2 días', endpoint: '/reportes/envios' },
];

import { getPdfUrl } from '../../lib/api';

export default function ReportHistory() {
  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="flex justify-between items-center mb-[18px]">
        <div>
          <b className="block text-sm">Reportes recientes</b>
          <span className="block text-text-muted text-[11px] mt-1">Historial de documentos generados</span>
        </div>
      </div>
      {history.map((h, i) => (
        <div
          key={i}
          className="grid items-center py-[14px] border-t border-border text-xs"
          style={{ gridTemplateColumns: '1fr 160px 90px' }}
        >
          <span>{h.title}</span>
          <small className="text-text-muted">{h.meta}</small>
          <a
            href={getPdfUrl(h.endpoint)}
            target="_blank"
            rel="noopener noreferrer"
            className="justify-self-end border border-border bg-surface rounded-[7px] px-[9px] py-[6px] text-[10px] text-text-secondary no-underline hover:bg-surface-2"
          >
            Descargar
          </a>
        </div>
      ))}
    </div>
  );
}
