'use client';

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
      />
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <AlertasProblemas />
        <PinRepartidores />
      </div>
    </>
  );
}
