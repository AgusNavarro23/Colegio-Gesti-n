'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';
import { 
  LogOut, Menu, Scale,
  Users, BookOpen, DollarSign,
  LayoutDashboard, BarChart3, AlertTriangle, Monitor, Settings,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'ADMIN' | 'EMPLOYEE';
  title: string;
}

export function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const adminMenu = [
    { icon: Monitor, label: 'Tablero Comando', href: '/admin/comando' },
    { icon: DollarSign, label: 'Control de Aportes', href: '/admin/aportes' },
    { icon: Settings, label: 'Config. Aportes', href: '/admin/config-aportes' },
    { icon: LayoutDashboard, label: 'Usuarios', href: '/admin' },
    { icon: Users, label: 'Escribanos', href: '/admin/escribanos' },
    { icon: BookOpen, label: 'Registros', href: '/admin/registros' },
    { icon: DollarSign, label: 'Aranceles', href: '/admin/aranceles' },
    { icon: BarChart3, label: 'Informes', href: '/admin/informes' },
  ];

  const employeeMenu = [
    { icon: AlertTriangle, label: 'Auditoria', href: '/employee/auditoria' },
    { icon: Users, label: 'Escribanos', href: '/employee/escribanos' },
    { icon: BookOpen, label: 'Registros', href: '/employee/registros' },
    { icon: DollarSign, label: 'Aranceles', href: '/employee/aranceles' },
    { icon: BookOpen, label: 'Declaraciones', href: '/employee/declaraciones' },
  ];

  const menuItems = role === 'ADMIN' ? adminMenu : employeeMenu;

  const handleLogout = async () => {
    logout();
    await Swal.fire({
      icon: 'success',
      title: 'Sesion cerrada',
      text: 'Redirigiendo al inicio...',
      timer: 1200,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/40 to-rose-50/40 flex">
      {/* Overlay when sidebar is open */}
      <div
        className={cn(
          "fixed inset-0 bg-black/30 z-40 transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={cn(
          "h-screen z-50 bg-white border-r border-amber-100 shadow-xl flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          isMobile 
            ? cn("fixed inset-y-0 left-0", sidebarOpen ? "w-64" : "w-0")
            : cn("sticky top-0", sidebarOpen ? "w-64" : "w-0")
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-amber-100 bg-gradient-to-r from-primary to-primary/90 text-white shrink-0 min-w-64">
          <div className="flex items-center gap-2 overflow-hidden">
            <Scale className="w-6 h-6 shrink-0" />
            <span className="text-lg font-bold truncate">Notaria Digital</span>
          </div>
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 min-w-64">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-gray-600 hover:bg-amber-50 hover:text-primary"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-white")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-amber-100 bg-amber-50/50 p-3 shrink-0 min-w-64">
          {user && (
            <div className="px-3 py-2 mb-2 rounded-lg bg-white/60">
              <p className="text-sm font-medium text-gray-800 truncate">{user.name || user.email}</p>
              <p className="text-xs text-gray-500">{user.role === 'ADMIN' ? 'Administrador' : 'Empleado'}</p>
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white/95 backdrop-blur border-b border-amber-100 h-16 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(true)}
                className="hover:bg-amber-50"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </Button>
            )}
            <h1 className="text-lg font-semibold text-primary truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">
              {user?.role === 'ADMIN' ? 'Panel Administrativo' : 'Panel Operativo'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
