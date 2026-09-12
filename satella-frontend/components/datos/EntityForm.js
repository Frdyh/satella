'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const fieldConfigs = {
  productos: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'unidad', label: 'Unidad', type: 'text', required: true },
    { key: 'precio', label: 'Precio', type: 'number', required: true },
    { key: 'stockActual', label: 'Stock actual', type: 'number', required: true },
    { key: 'stockMinimo', label: 'Stock mínimo', type: 'number', required: true },
    { key: 'lote', label: 'Lote', type: 'text' },
    { key: 'fechaVencimiento', label: 'Fecha vencimiento', type: 'date' },
    { key: 'categoriaId', label: 'Categoría', type: 'select', entity: 'categorias' },
    { key: 'proveedorId', label: 'Proveedor', type: 'select', entity: 'proveedores' },
  ],
  clientes: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'telefono', label: 'Teléfono', type: 'text' },
    { key: 'direccion', label: 'Dirección', type: 'text' },
    { key: 'ciudad', label: 'Ciudad', type: 'text' },
  ],
  pedidos: [
    { key: 'clienteId', label: 'Cliente', type: 'select', entity: 'clientes', required: true },
    { key: 'estado', label: 'Estado', type: 'select', options: ['pendiente', 'confirmado', 'cancelado'] },
  ],
  envios: [
    { key: 'pedidoId', label: 'Pedido', type: 'select', entity: 'pedidos', required: true },
    { key: 'fechaProgramada', label: 'Fecha de entrega', type: 'date', required: true },
    {
      key: 'ventanaHoraria',
      label: 'Ventana horaria',
      type: 'select',
      required: true,
      options: ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'],
    },
    { key: 'estado', label: 'Estado', type: 'select', options: ['en cola', 'en ruta', 'entregado', 'retraso'] },
    { key: 'notas', label: 'Notas', type: 'text' },
  ],
  usuarios: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'rol', label: 'Rol', type: 'select', options: ['Administrador', 'Operador', 'Despachador'] },
  ],
  categorias: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'descripcion', label: 'Descripción', type: 'text' },
  ],
  proveedores: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'contacto', label: 'Contacto', type: 'text' },
    { key: 'telefono', label: 'Teléfono', type: 'text' },
  ],
};

const optionLabelResolvers = {
  pedidos: (opt) => `Pedido #${opt.id} — ${opt.cliente?.nombre || 'Cliente sin nombre'}`,
};

function getOptionLabel(entityKey, opt) {
  const resolver = optionLabelResolvers[entityKey];
  return resolver ? resolver(opt) : opt.nombre;
}

export default function EntityForm({ entity, item, onSave, onCancel }) {
  const [formData, setFormData] = useState({});
  const [selectOptions, setSelectOptions] = useState({});
  const fields = fieldConfigs[entity.key] || [];

  useEffect(() => {
    if (item) {
      const initial = {};
      fields.forEach((f) => {
        if (f.type === 'select' && f.entity) {
          initial[f.key] = item[f.key] || item[f.key.replace('Id', '')]?.id || '';
        } else {
          initial[f.key] = item[f.key] ?? '';
        }
      });
      setFormData(initial);
    } else {
      const initial = {};
      fields.forEach((f) => { initial[f.key] = ''; });
      setFormData(initial);
    }
  }, [item, entity.key]);

  useEffect(() => {
    const entitiesToLoad = fields.filter((f) => f.entity);
    entitiesToLoad.forEach((f) => {
      if (!selectOptions[f.entity]) {
        api.get(`/${f.entity}`)
          .then((data) => setSelectOptions((prev) => ({ ...prev, [f.entity]: data })))
          .catch(console.error);
      }
    });
  }, [entity.key]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const processed = { ...formData };
    fields.forEach((f) => {
      if (f.type === 'number' && processed[f.key] !== '') {
        processed[f.key] = Number(processed[f.key]);
      }
    });
    onSave(processed);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h3 className="font-display text-lg mb-4">
        {item ? `Editar ${entity.label}` : `Nuevo ${entity.label.replace(/s$/, '')}`}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              {field.label}
            </label>
            {field.type === 'select' && field.entity ? (
              <select
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                required={field.required}
                className="border border-border bg-surface rounded-[8px] px-3 py-2.5 text-xs text-text-primary outline-none"
              >
                <option value="">Seleccionar...</option>
                {(selectOptions[field.entity] || []).map((opt) => (
                  <option key={opt.id} value={opt.id}>{getOptionLabel(field.entity, opt)}</option>
                ))}
              </select>
            ) : field.type === 'select' && field.options ? (
              <select
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                required={field.required}
                className="border border-border bg-surface rounded-[8px] px-3 py-2.5 text-xs text-text-primary outline-none"
              >
                <option value="">Seleccionar...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                required={field.required}
                className="border border-border bg-surface rounded-[8px] px-3 py-2.5 text-xs text-text-primary outline-none"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          className="border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95 text-xs"
        >
          {item ? 'Guardar cambios' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-border bg-surface text-text-secondary rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:bg-surface-2 text-xs"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
