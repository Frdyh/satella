'use client';

import Link from 'next/link';
import PageHeading from '../../components/ui/PageHeading';
import StatsGrid from '../../components/dashboard/StatsGrid';
import OrdersChart from '../../components/dashboard/OrdersChart';
import RecentActivity from '../../components/dashboard/RecentActivity';
import { useDashboardData } from '../../lib/useDashboardData';

export default function DashboardPage() {
  const { pedidos, productos, envios, loading, refresh } = useDashboardData();

  return (
    <>
      <PageHeading
        eyebrow="Satella · Módulos"
        title="Dashboard"
        subtitle="Una vista general de lo que está ocurriendo en Satella."
        action={
          <div className="flex gap-2 items-center">
            <button
              onClick={refresh}
              disabled={loading}
              className="border border-border bg-surface text-text-secondary rounded-[9px] px-3 py-[11px] cursor-pointer hover:bg-surface-2 hover:text-text-primary transition-colors disabled:opacity-50"
              title="Actualizar datos"
            >
              {loading ? '⟳ Actualizando…' : '⟳ Actualizar'}
            </button>
            <Link
              href="/datos?entity=pedidos&create=1"
              className="inline-block border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95 no-underline"
            >
              + Nueva operación
            </Link>
          </div>
        }
      />
      <StatsGrid pedidos={pedidos} productos={productos} envios={envios} />
      <div className="grid grid-cols-[1.5fr_1fr] gap-[18px] mt-4">
        <OrdersChart pedidos={pedidos} />
        <RecentActivity pedidos={pedidos} envios={envios} />
      </div>
    </>
  );
}
