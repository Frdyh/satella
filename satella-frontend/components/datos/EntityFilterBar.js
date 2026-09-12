'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const filterConfigs = {
  productos: [
    { key: 'categoriaId', label: 'Categoría', entity: 'categorias' },
    { key: 'proveedorId', label: 'Proveedor', entity: 'proveedores' },
  ],
  pedidos: [
    { key: 'estado', label: 'Estado', options: ['pendiente', 'confirmado', 'cancelado'] },
  ],
  envios: [
    { key: 'estado', label: 'Estado', options: ['en cola', 'en ruta', 'entregado', 'retraso'] },
  ],
};

export default function EntityFilterBar({ entityKey, search, onSearchChange, filters, onFilterChange }) {
  const [refOptions, setRefOptions] = useState({});
  const config = filterConfigs[entityKey] || [];

  useEffect(() => {
    config.forEach((f) => {
      if (f.entity) {
        api.get(`/${f.entity}`)
          .then((data) => setRefOptions((prev) => ({ ...prev, [f.entity]: data })))
          .catch(console.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey]);

  return (
    <div className="flex flex-wrap gap-2 items-center px-[18px] py-3 border-b border-border bg-surface-2/40">
      <input
        className="border border-border bg-surface rounded-[8px] px-3 py-2 text-xs text-text-primary outline-none flex-1 min-w-[180px]"
        placeholder="Buscar..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {config.map((f) => {
        const options = f.options || refOptions[f.entity] || [];
        return (
          <select
            key={f.key}
            value={filters[f.key] || ''}
            onChange={(e) => onFilterChange(f.key, e.target.value)}
            className="border border-border bg-surface rounded-[8px] px-3 py-2 text-xs text-text-primary outline-none"
          >
            <option value="">{f.label}: todos</option>
            {options.map((opt) => (
              typeof opt === 'string'
                ? <option key={opt} value={opt}>{opt}</option>
                : <option key={opt.id} value={opt.id}>{opt.nombre}</option>
            ))}
          </select>
        );
      })}
    </div>
  );
}
