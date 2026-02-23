'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/hooks/use-toast';

const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 Minutos en milisegundos

export function SessionHandler() {
  const { isAuthenticated, logout } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (isAuthenticated) {
      timerRef.current = setTimeout(() => {
        toast({
            title: "Sesión Expirada",
            description: "Se ha cerrado la sesión por inactividad.",
            variant: "destructive"
        });
        logout();
      }, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Eventos que consideramos "actividad"
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    // Iniciar timer
    resetTimer();

    // Escuchar eventos
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Limpiar listeners al desmontar
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  return null; // Este componente no renderiza nada visualmente
}