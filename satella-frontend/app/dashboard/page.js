'use client';

import Link from 'next/link';
import PageHeading from '../../components/ui/PageHeading';
import StatsGrid from '../../components/dashboard/StatsGrid';
import OrdersChart from '../../components/dashboard/OrdersChart';
import RecentActivity from '../../components/dashboard/RecentActivity';

export default function DashboardPage() {
  return (
    <>
      <PageHeading
        eyebrow="Satella · Módulos"
        title="Dashboard"
        subtitle="Una vista general de lo que está ocurriendo en Satella."
        action={
          <Link
            href="/datos?entity=pedidos&create=1"
            className="inline-block border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95 no-underline"
          >
            + Nueva operación
          </Link>
        }
      />
      <StatsGrid />
      <div className="grid grid-cols-[1.5fr_1fr] gap-[18px] mt-4">
        <OrdersChart />
        <RecentActivity />
      </div>
    </>
  );
}
