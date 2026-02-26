'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Loader2, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export function RegistrosView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ numero: '', direccion: '', estado: 'Activo', localidad: '' });

  const fetchRegistros = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/registros');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setRegistros(data);
    } catch (error) {
      toast({ title: "Error", description: "Error cargando registros", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRegistros(); }, []);
  
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (item) setFormData({ numero: item.numero, direccion: item.direccion, estado: item.estado, localidad: item.localidad || '' });
    else setFormData({ numero: '', direccion: '', estado: 'Activo', localidad: '' });
    setIsModalOpen(true);
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem ? { ...formData, id: editingItem.id } : formData;
      const res = await fetch('/api/registros', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast({ title: "Éxito", description: "Operación exitosa" });
      setIsModalOpen(false);
      fetchRegistros();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    try {
      const res = await fetch(`/api/registros?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Error al eliminar');
      }
      toast({ title: "Eliminado", description: "Registro eliminado" });
      fetchRegistros();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // AQUÍ SE APLICA EL ORDENAMIENTO POR NÚMERO DE REGISTRO
  const filteredRegistros = registros
    .filter(r => r.numero.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' }));
  
  const totalPages = Math.max(1, Math.ceil(filteredRegistros.length / itemsPerPage));
  const currentRegistros = filteredRegistros.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <DashboardLayout role={role} title="Gestión de Registros">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Buscar por número..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={fetchRegistros}><RefreshCcw className="w-4 h-4" /></Button>
                <Button onClick={() => handleOpenModal()} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Nuevo Registro</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                  <TableRow className="bg-gray-50/50">
                      <TableHead>Número de Registro</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Localidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {currentRegistros.map(item => (
                      <TableRow key={item.id}>
                      <TableCell className="font-medium text-gray-900">{item.numero}</TableCell>
                      <TableCell className="text-gray-600">{item.direccion}</TableCell>
                      <TableCell className="text-gray-600">{item.localidad}</TableCell>
                      <TableCell>{item.estado === 'Activo' ? <Badge className="bg-green-600">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </TableCell>
                      </TableRow>
                  ))}
                  {currentRegistros.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">No se encontraron registros</TableCell></TableRow>
                  )}
                  </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {!isLoading && filteredRegistros.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-xl">
            <span className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredRegistros.length)} de {filteredRegistros.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-sm font-medium mx-2 whitespace-nowrap">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <span className="hidden sm:inline">Siguiente</span> <ChevronRight className="w-4 h-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Registro' : 'Nuevo Registro'}</DialogTitle>
            <DialogDescription>Administra los detalles del registro notarial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Registro</Label>
                <Input value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(val) => setFormData({...formData, estado: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección Física</Label>
              <Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Localidad</Label>
                <Select value={formData.localidad} onValueChange={(val) => setFormData({...formData, localidad: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Salta Capital">Salta Capital</SelectItem><SelectItem value="Tartagal">Tartagal</SelectItem><SelectItem value="Cerrillos">Cerrillos</SelectItem><SelectItem value="Oran">Oran</SelectItem><SelectItem value="Chicoana">Chicoana</SelectItem><SelectItem value="Rosario de la Frontera">Rosario de la Frontera</SelectItem><SelectItem value="Metán">Metán</SelectItem><SelectItem value="Embarcación">Embarcación</SelectItem><SelectItem value="General Guemes">General Guemes</SelectItem><SelectItem value="Joaquí V. Gonzalez ">J. V. Gonzalez</SelectItem><SelectItem value="Colonia Santa Rosa">Colonia Santa Rosa</SelectItem><SelectItem value="Hipolito Yrigoyen">Hipolito Yrigoyen</SelectItem><SelectItem value="Rosario de Lerma">Rosario de Lerma</SelectItem><SelectItem value="Cafayate">Cafayate</SelectItem></SelectContent>
                </Select>            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                 {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}