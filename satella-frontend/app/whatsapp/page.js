'use client';

import Link from 'next/link';
import PageHeading from '../../components/ui/PageHeading';
import PinRepartidores from '../../components/whatsapp/PinRepartidores';
import AlertasProblemas from '../../components/whatsapp/AlertasProblemas';

export default function WhatsappPage() {
  return (
    <>
      <PageHeading
        eyebrow="Satella · Canal de WhatsApp"
        title="WhatsApp"
        subtitle="Herramientas del personal para el canal de WhatsApp: PIN de repartidores y alertas."
        action={
          <Link
            href="/whatsapp/simulador"
            className="inline-block border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95 no-underline"
          >
            Abrir simulador
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <AlertasProblemas />
        <PinRepartidores />
      </div>
    </>
  );
}
