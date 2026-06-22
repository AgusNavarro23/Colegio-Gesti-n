'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Swal from 'sweetalert2';
import { Loader2, Scale, Shield } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      setAuth(data.user, data.token);
      await Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Has iniciado sesión correctamente.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      // Recargar la página para redirigir al dashboard correspondiente
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error instanceof Error ? error.message : 'Error al iniciar sesión',
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo y encabezado */}
        <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="Logo" width={250} height={250}/>
        </div>
    
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
              <div className="text-center text-sm">
                <span className="text-gray-600">¿No tienes cuenta? </span>
                <a
                  href="/register"
                  className="text-primary font-semibold hover:underline"
                >
                  Regístrate aquí
                </a>
              </div>
              <div className="text-center text-sm">
                <a
                  href="/forgot-password"
                  className="text-gray-500 hover:text-primary font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer institucional */}
        <div className="mt-8 text-center text-xs text-gray-500 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-3 h-3" />
            <span>Seguridad garantizada con encriptación SSL</span>
          </div>
          <p>© 2026 Colegio de Escribanos de Salta. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}