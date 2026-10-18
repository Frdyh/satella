'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Rutas que se muestran sin sidebar/topbar y sin exigir sesión.
const PUBLIC_ROUTES = ['/login'];

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, loading } = useAuth();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && !usuario && !isPublic) router.replace('/login');
  }, [loading, usuario, isPublic, router]);

  if (isPublic) return children;

  // Mientras se valida la sesión (o se redirige al login) no se muestra el panel.
  if (loading || !usuario) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-sm text-text-muted">
        Cargando…
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen">
      <Sidebar open={sidebarOpen} pathname={pathname} />
      <div
        className="transition-[margin-left] duration-300"
        style={{ marginLeft: sidebarOpen ? 248 : 0 }}
      >
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="min-h-[calc(100vh-60px)] bg-bg p-[34px_38px]">
          <div className="max-w-[1240px] mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
