'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeading from '../../components/ui/PageHeading';
import EntityWheelModal from '../../components/datos/EntityWheelModal';
import EntityFilterBar from '../../components/datos/EntityFilterBar';
import EntityTable from '../../components/datos/EntityTable';
import EntityForm from '../../components/datos/EntityForm';
import { ENTITY_ICONS } from '../../components/datos/entityIcons';
import { api } from '../../lib/api';

const entities = [
  { key: 'productos', label: 'Productos', endpoint: '/productos' },
  { key: 'clientes', label: 'Clientes', endpoint: '/clientes' },
  { key: 'pedidos', label: 'Pedidos', endpoint: '/pedidos' },
  { key: 'envios', label: 'Envíos', endpoint: '/envios' },
  { key: 'usuarios', label: 'Usuarios', endpoint: '/usuarios' },
  { key: 'categorias', label: 'Categorías', endpoint: '/categorias' },
  { key: 'proveedores', label: 'Proveedores', endpoint: '/proveedores' },
];

const PAGE_SIZE = 8;

export default function DatosPage() {
  return (
    <Suspense fallback={null}>
      <DatosPageContent />
    </Suspense>
  );
}

function DatosPageContent() {
  const searchParams = useSearchParams();
  const requestedEntity = searchParams.get('entity');
  const shouldCreate = searchParams.get('create') === '1';

  const [activeEntity, setActiveEntity] = useState(
    entities.some((e) => e.key === requestedEntity) ? requestedEntity : 'productos'
  );
  const [wheelOpen, setWheelOpen] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [counts, setCounts] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const current = entities.find((e) => e.key === activeEntity);
  const hasActiveQuery = Boolean(search) || Object.values(filters).some(Boolean);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search) params.set('search', search);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    return params.toString();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, total: resultTotal } = await api.getPaged(`${current.endpoint}?${buildQuery()}`);
      setData(result);
      setTotal(resultTotal);
      // El conteo que alimenta la rueda debe ser el total real, no el de una
      // búsqueda/filtro en curso.
      if (!hasActiveQuery) {
        setCounts((prev) => ({ ...prev, [activeEntity]: resultTotal }));
      }
    } catch (err) {
      console.error(err);
      setData([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity, page, search, filters]);

  // Precarga (liviana, 1 registro por entidad) el total real de cada módulo
  // para poder mostrar la cantidad de registros al pasar el mouse por la
  // rueda, incluso antes de haber visitado ese módulo.
  useEffect(() => {
    entities.forEach((e) => {
      api.getPaged(`${e.endpoint}?page=1&limit=1`)
        .then(({ total: t }) => setCounts((prev) => (prev[e.key] !== undefined ? prev : { ...prev, [e.key]: t })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shouldCreate) {
      setEditingItem(null);
      setShowForm(true);
    }
    // Solo se evalúa al entrar a la página con ?create=1, no en cada cambio de entidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectEntity = (key) => {
    setActiveEntity(key);
    setShowForm(false);
    setSearch('');
    setFilters({});
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingItem) {
        await api.put(`${current.endpoint}/${editingItem.id}`, formData);
      } else {
        await api.post(current.endpoint, formData);
      }
      setShowForm(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await api.delete(`${current.endpoint}/${item.id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Satella · Base de datos"
        title="Gestión de datos"
        subtitle="Un único centro para consultar y administrar toda la información."
        action={
          <button
            onClick={handleCreate}
            className="border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95"
          >
            + Nuevo registro
          </button>
        }
      />

      <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
        {showForm ? (
          <EntityForm
            entity={current}
            item={editingItem}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
          />
        ) : (
          <>
            <div className="flex justify-between items-center px-[18px] py-[15px]">
              <button
                type="button"
                onClick={() => setWheelOpen(true)}
                className="flex items-center gap-2.5 rounded-full border border-border bg-surface-2 pl-2 pr-3.5 py-1.5 cursor-pointer hover:brightness-95"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    {ENTITY_ICONS[activeEntity]}
                  </svg>
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-text-primary leading-tight">{current.label}</span>
                  <span className="block text-[11px] text-text-muted leading-tight">{total} registros</span>
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted ml-1">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
            <EntityFilterBar
              entityKey={activeEntity}
              search={search}
              onSearchChange={handleSearchChange}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
            <EntityTable
              entity={current}
              data={data}
              loading={loading}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>

      <EntityWheelModal
        open={wheelOpen}
        entities={entities}
        counts={counts}
        activeKey={activeEntity}
        onSelect={(key) => { handleSelectEntity(key); setWheelOpen(false); }}
        onClose={() => setWheelOpen(false)}
      />
    </>
  );
}
