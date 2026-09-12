'use client';

import StatusBadge from '../ui/StatusBadge';

const columnConfig = {
  productos: [
    { key: 'nombre', label: 'Nombre', render: (v) => <b className="text-text-primary">{v}</b> },
    { key: 'categoria', label: 'Categoría', render: (v) => v?.nombre || '—' },
    { key: 'precio', label: 'Precio', render: (v) => `$${v?.toLocaleString()}` },
    { key: 'stockActual', label: 'Stock' },
    {
      key: 'stockEstado',
      label: 'Estado',
      render: (_v, item) => (
        <StatusBadge estado={item.stockActual <= item.stockMinimo ? 'Stock bajo' : 'Activo'} />
      ),
    },
  ],
  clientes: [
    { key: 'nombre', label: 'Nombre', render: (v) => <b className="text-text-primary">{v}</b> },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'direccion', label: 'Dirección' },
  ],
  pedidos: [
    { key: 'id', label: 'Pedido', render: (v) => <b className="text-text-primary">#{v}</b> },
    { key: 'cliente', label: 'Cliente', render: (v) => v?.nombre || '—' },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge estado={v} /> },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (v) => new Date(v).toLocaleDateString('es-CO'),
    },
  ],
  envios: [
    { key: 'id', label: 'Envío', render: (v) => <b className="text-text-primary">#{v}</b> },
    { key: 'pedido', label: 'Pedido', render: (v) => `#${v?.id || '—'}` },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge estado={v} /> },
    {
      key: 'fechaProgramada',
      label: 'Fecha',
      render: (v, item) => (
        <>
          {new Date(v).toLocaleDateString('es-CO')}
          {item.ventanaHoraria ? ` · ${item.ventanaHoraria}` : ''}
        </>
      ),
    },
  ],
  usuarios: [
    { key: 'nombre', label: 'Nombre', render: (v) => <b className="text-text-primary">{v}</b> },
    { key: 'rol', label: 'Rol' },
    { key: 'email', label: 'Email' },
  ],
  categorias: [
    { key: 'nombre', label: 'Nombre', render: (v) => <b className="text-text-primary">{v}</b> },
    { key: 'descripcion', label: 'Descripción' },
  ],
  proveedores: [
    { key: 'nombre', label: 'Nombre', render: (v) => <b className="text-text-primary">{v}</b> },
    { key: 'contacto', label: 'Contacto' },
    { key: 'telefono', label: 'Teléfono' },
  ],
};

export default function EntityTable({ entity, data, loading, page, pageSize, total, onPageChange, onEdit, onDelete }) {
  const cols = columnConfig[entity.key] || [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {cols.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-[18px] py-[15px] text-[10px] uppercase tracking-widest text-text-muted font-bold bg-surface-2 border-b border-border"
                >
                  {col.label}
                </th>
              ))}
              <th className="text-left px-[18px] py-[15px] bg-surface-2 border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-8 text-text-muted text-xs">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-8 text-text-muted text-xs">
                  No hay registros.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  {cols.map((col) => (
                    <td key={col.key} className="px-[18px] py-[15px] text-text-secondary">
                      {col.render ? col.render(item[col.key], item) : (item[col.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-[18px] py-[15px]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEdit(item)}
                        title="Editar"
                        className="text-text-secondary hover:text-text-primary cursor-pointer bg-transparent border-0 text-sm"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        title="Eliminar"
                        className="text-text-secondary hover:text-red-500 cursor-pointer bg-transparent border-0 text-sm"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 justify-between items-center px-[18px] py-[13px] border-t border-border text-[11px] text-text-muted">
        <span>
          {total} registro{total === 1 ? '' : 's'} · página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="border border-border bg-surface text-text-secondary rounded-[7px] px-3 py-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2"
          >
            ‹ Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="border border-border bg-surface text-text-secondary rounded-[7px] px-3 py-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2"
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </>
  );
}
