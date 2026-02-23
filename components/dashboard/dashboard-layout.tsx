// components/dashboard/dashboard-layout.tsx
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  icon: any;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'ADMIN' | 'EMPLOYEE';
  title: string;
  menuItems: SidebarItem[]; // <-- Ahora lo recibimos como prop
}

export function DashboardLayout({ children, role, title, menuItems }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop & Mobile */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <Scale className="w-6 h-6 text-primary mr-2" />
            <span className="text-lg font-bold text-gray-900">Notaría Digital</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className={cn(
                  "w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  item.isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-700 hover:bg-gray-100 hover:text-primary"
                )}
                onClick={item.onClick}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Footer (se mantiene igual) */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <span className="font-semibold text-gray-900">Notaría Digital</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
            {children}
          </div>
        </main>
      </div>
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}