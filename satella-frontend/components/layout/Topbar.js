'use client';

import { useRouter } from 'next/navigation';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../lib/initials';

export default function Topbar({ sidebarOpen, onToggleSidebar }) {
  const router = useRouter();
  const { usuario, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="h-[60px] border-b border-border flex items-center justify-between px-6 bg-surface">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="w-9 h-9 rounded-full border border-border bg-transparent flex items-center justify-center cursor-pointer text-text-secondary hover:bg-surface-2 transition-colors"
          aria-label="Alternar Menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="text-[13px] text-text-secondary">
          <b className="text-text-primary">Satella</b> · Interfaz de Comandos
        </div>
      </div>
      <div className="flex items-center gap-3.5">
        <ThemeToggle />
        <div className="flex items-center gap-2.5" title={usuario?.email}>
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-[12px] font-semibold text-text-primary">{usuario?.nombre}</div>
            <div className="text-[10.5px] text-text-muted">{usuario?.rol}</div>
          </div>
          <div className="w-[30px] h-[30px] rounded-full bg-[var(--secondary)] flex items-center justify-center text-[11px] font-bold text-[#1A1533]">
            {initials(usuario?.nombre)}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full border border-border bg-transparent flex items-center justify-center cursor-pointer text-text-secondary hover:bg-surface-2 transition-colors"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
