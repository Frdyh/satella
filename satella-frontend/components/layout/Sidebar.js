'use client';

import Link from 'next/link';

const navItems = [
  { label: 'Inicio', href: '/', icon: HomeIcon },
];

const sectionLabel = 'Módulos';

const moduleItems = [
  { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { label: 'Envíos', href: '/envios', icon: EnviosIcon },
  { label: 'CRUD', href: '/datos', icon: CrudIcon },
  { label: 'Reportes PDF', href: '/reportes', icon: ReportesIcon },
];

function NavLink({ href, label, icon: Icon, active }) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-[var(--radius-ctrl)] text-sm font-medium transition-all duration-150 ${
        active ? 'bg-white/10 text-white' : 'text-white/72 hover:bg-white/6 hover:text-white/95'
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[var(--accent)] transition-all duration-150 ${
          active ? 'h-5 opacity-100' : 'h-0 opacity-0'
        }`}
      />
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-[9px] transition-colors duration-150 ${
          active ? 'bg-[var(--accent)]/18 text-[var(--accent)]' : 'text-white/60 group-hover:text-white/90'
        }`}
      >
        <Icon />
      </span>
      {label}
    </Link>
  );
}

export default function Sidebar({ open, pathname }) {
  return (
    <aside
      className={`fixed top-0 left-0 z-20 h-screen overflow-hidden text-white p-5 flex flex-col gap-1.5 transition-all duration-300 whitespace-nowrap ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none -translate-x-full'
      }`}
      style={{
        width: open ? 248 : 0,
        background: 'linear-gradient(175deg, var(--primary-strong), var(--sidebar-grad-end))',
      }}
    >
      <div
        className="absolute -top-16 -left-10 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.16 }}
      />

      <div className="relative flex items-center gap-2.5 px-2.5 pb-5 mb-1 border-b border-white/10">
        <div className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-white/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15.6 3.6a8.4 8.4 0 1 0 5.2 13.5A9.4 9.4 0 0 1 15.6 3.6Z" fill="var(--accent)" />
            <path d="M19.6 3.2l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Z" fill="var(--accent)" />
          </svg>
        </div>
        <div>
          <div className="font-display font-semibold text-[17px] tracking-wide leading-tight">Satella</div>
          <div className="text-[11px] opacity-60 font-normal">Panel interno</div>
        </div>
      </div>

      <nav className="relative flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="text-[10.5px] uppercase tracking-[0.14em] text-white/40 font-bold px-3 pt-5 pb-2">
        {sectionLabel}
      </div>

      <nav className="relative flex flex-col gap-1">
        {moduleItems.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="mt-auto pt-3">
        <div className="flex items-center gap-2.5 p-2.5 rounded-[10px] bg-white/6">
          <div className="relative w-8 h-8 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center text-xs font-bold text-[#1A1533]">
              JV
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--primary-strong)]" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">Juan</div>
            <div className="text-[11px] text-[var(--accent)]/90 truncate">Administrador</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function EnviosIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="1" y="7" width="14" height="10" rx="1" /><path d="M15 10h4l3 3v4h-7z" />
      <circle cx="6" cy="19" r="1.6" /><circle cx="17.5" cy="19" r="1.6" />
    </svg>
  );
}

function CrudIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function ReportesIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" />
    </svg>
  );
}
