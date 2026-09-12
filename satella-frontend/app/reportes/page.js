'use client';

import PageHeading from '../../components/ui/PageHeading';
import ReportGrid from '../../components/reportes/ReportGrid';
import ReportHistory from '../../components/reportes/ReportHistory';

export default function ReportesPage() {
  return (
    <>
      <PageHeading
        eyebrow="Satella · Inteligencia"
        title="Reportes PDF"
        subtitle="Consulta, genera y descarga informes de la operación."
        action={
          <button className="border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95">
            + Crear reporte
          </button>
        }
      />
      <ReportGrid />
      <ReportHistory />
    </>
  );
}
