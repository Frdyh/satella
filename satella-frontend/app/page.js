'use client';

import Link from 'next/link';
import Stars from '../components/ui/Stars';

const quickOptions = [
  {
    label: 'Envíos',
    href: '/envios',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="7" width="14" height="10" rx="1" /><path d="M15 10h4l3 3v4h-7z" />
        <circle cx="6" cy="19" r="1.6" /><circle cx="17.5" cy="19" r="1.6" />
      </svg>
    ),
  },
  {
    label: 'Gestión de datos',
    href: '/datos',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: 'Reportes PDF',
    href: '/reportes',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <>
      <Stars />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] py-10 px-10 text-center relative z-1">
        <h1 className="font-display text-6xl font-semibold m-0 mb-4 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] dark:from-[var(--accent)] dark:to-white bg-clip-text text-transparent">
          Satella
        </h1>
        <p className="text-lg text-text-secondary m-0 mb-12 max-w-[500px] leading-relaxed">
          Elige un módulo para empezar a trabajar, o revisa el Dashboard para ver el estado general de la operación.
        </p>
        <div className="flex gap-4 flex-wrap justify-center max-w-[800px]">
          {quickOptions.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              className="bg-surface border border-border rounded-2xl px-6 py-[18px] text-[15px] font-medium text-text-primary cursor-pointer flex flex-col items-center gap-3 transition-all shadow-card min-w-[140px] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(30,24,60,.08)] hover:border-[var(--primary)] dark:hover:border-[var(--accent)] no-underline"
            >
              <span className="text-[var(--primary)] dark:text-[var(--accent)]">{opt.icon}</span>
              {opt.label}
            </Link>
          ))}
        </div>
        <p className="mt-[30px] text-xs text-text-muted">
          También puedes navegar desde el menú lateral.
        </p>
      </div>
    </>
  );
}
