'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { LoginForm } from '@/components/auth/login-form';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'ADMIN':
          router.push('/admin');
          break;
        case 'EMPLOYEE':
          router.push('/employee');
          break;
        case 'CLIENT':
        default:
          router.push('/client');
          break;
      }
    }
  }, [isAuthenticated, user, router]);

  // Si no está autenticado, mostramos el Login
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Mientras redirige, mostramos un spinner para evitar parpadeos
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}