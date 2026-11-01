'use client';

import Link from 'next/link';
import PageHeading from '../../../components/ui/PageHeading';
import SimuladorChat from '../../../components/whatsapp/SimuladorChat';

export default function SimuladorPage() {
  return (
    <>
      <PageHeading
        eyebrow="Satella · Canal de WhatsApp"
        title="Simulador"
        subtitle="Conversa con el bot sin WhatsApp real. Recorre exactamente el mismo camino que un mensaje de Meta."
        action={
          <Link href="/whatsapp" className="text-xs text-text-secondary no-underline hover:underline">← Volver a WhatsApp</Link>
        }
      />
      <SimuladorChat />
    </>
  );
}
