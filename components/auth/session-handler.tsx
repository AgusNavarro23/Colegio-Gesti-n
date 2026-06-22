'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import Swal from 'sweetalert2';

const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 Minutos en milisegundos

export function SessionHandler() {
  const { isAuthenticated, logout } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (isAuthenticated) {
      timerRef.current = setTimeout(async () => {
        logout();
        await Swal.fire({
          icon: 'warning',
          title: 'Sesion expirada',
          text: 'Se cerro la sesion por inactividad.',
          confirmButtonText: 'Ir al inicio',
          allowOutsideClick: false,
          allowEscapeKey: false,
        });
        window.location.href = '/';
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