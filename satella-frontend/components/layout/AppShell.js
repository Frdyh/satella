'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

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
