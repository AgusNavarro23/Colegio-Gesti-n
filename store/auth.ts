import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // Importar createJSONStorage

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthState {
  setAuth: any;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user: User, token: string) => set({ user, token, isAuthenticated: true }),
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        // Solo limpiamos sesión; la redirección queda a cargo de la UI que llama logout.
        sessionStorage.clear();
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
          // Evitamos romper UX si la limpieza de cookie falla.
        });
      },
    }),
    {
      name: 'auth-storage',
      // CAMBIO IMPORTANTE: Usar sessionStorage en lugar de localStorage (default)
      // Esto hace que la sesión muera al cerrar la pestaña.
      storage: createJSONStorage(() => sessionStorage), 
    }
  )
);