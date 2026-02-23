'use client';

import { useState,useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Scale, UserPlus, LogOut, Loader2, Shield, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
  createdAt: string;
}

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'EMPLOYEE' | 'CLIENT',
  });

useEffect(() => {
  fetchUsers();
}, []);

  const fetchUsers = async () => {
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar usuarios');

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al crear usuario');

      toast({
        title: 'Usuario creado',
        description: 'El usuario ha sido creado correctamente',
      });

      setFormData({ name: '', email: '', password: '', role: 'EMPLOYEE' });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el usuario',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      ADMIN: { variant: 'default', icon: Shield, label: 'Admin' },
      EMPLOYEE: { variant: 'outline', icon: Users, label: 'Empleado' },
      CLIENT: { variant: 'secondary', icon: UserPlus, label: 'Cliente' },
    };

    const config = variants[role] || variants.CLIENT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary">
                <Scale className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Notaría Digital</h1>
                <p className="text-xs text-gray-600">Panel de Administración</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = '/';
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Usuarios</CardTitle>
              <Users className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Empleados</CardTitle>
              <UserPlus className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter(u => u.role === 'EMPLOYEE').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Clientes</CardTitle>
              <Shield className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter(u => u.role === 'CLIENT').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>
                  Administra los usuarios del sistema (empleados y clientes)
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Crear Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Crea un nuevo empleado o cliente en el sistema
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                            <SelectItem value="CLIENT">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input
                          id="name"
                          placeholder="Juan Pérez"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="nombre@ejemplo.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          'Crear Usuario'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No hay usuarios registrados</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Usuario
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userItem) => (
                      <TableRow key={userItem.id}>
                        <TableCell className="font-medium">
                          {userItem.name || 'Sin nombre'}
                        </TableCell>
                        <TableCell>{userItem.email}</TableCell>
                        <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                        <TableCell>
                          {new Date(userItem.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>© 2024 Notaría Digital. Sistema de Gestión de Trámites Notariales</p>
        </div>
      </footer>
    </div>
  );
}