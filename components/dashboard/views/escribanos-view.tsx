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
import { Search, Plus, Edit, Trash2, Loader2, RefreshCcw, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export function EscribanosView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [escribanos, setEscribanos] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [registroSearch, setRegistroSearch] = useState('');
  const [isRegistroDropdownOpen, setIsRegistroDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '', matricula: '', condicion: 'Titular', estado: 'Activo', registroId: ''
  });

  const fetchEscribanos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/escribanos');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setEscribanos(data);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los escribanos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistros = async () => {
    try {
      const res = await fetch('/api/registros');
      if (res.ok) {
        const data = await res.json();
        setRegistros(data);
      }
    } catch (error) {
      console.error("Error al cargar registros", error);
    }
  };

  useEffect(() => {
    fetchEscribanos();
    fetchRegistros();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      const regId = item.registro ? item.registro.numero : '';
      setFormData({
        nombre: item.nombre, matricula: item.matricula, condicion: item.condicion, estado: item.estado, registroId: regId
      });
      setRegistroSearch(regId);
    } else {
      setFormData({ nombre: '', matricula: '', condicion: 'Titular', estado: 'Activo', registroId: '' });
      setRegistroSearch('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem ? { ...formData, id: editingItem.id } : formData;
      const res = await fetch('/api/escribanos', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast({ title: "Éxito", description: editingItem ? "Escribano actualizado" : "Escribano creado" });
      setIsModalOpen(false);
      fetchEscribanos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este escribano?')) return;
    try {
      const res = await fetch(`/api/escribanos?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast({ title: "Eliminado", description: "Registro eliminado correctamente" });
      fetchEscribanos();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Activo': return <Badge className="bg-green-600">Activo</Badge>;
      case 'Licencia': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Licencia</Badge>;
      case 'Jubilado': return <Badge variant="secondary">Jubilado</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const filteredEscribanos = escribanos.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.matricula.includes(searchTerm)
  );

  const totalPages = Math.max(1, Math.ceil(filteredEscribanos.length / itemsPerPage));
  const currentEscribanos = filteredEscribanos.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout role={role} title="Gestión de Escribanos">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por nombre o matrícula..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={fetchEscribanos} title="Recargar">
                    <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button onClick={() => handleOpenModal()} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Nuevo</Button>
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Condición</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {currentEscribanos.map(item => (
                      <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      <TableCell>{item.matricula}</TableCell>
                      <TableCell>
                          {item.registro ? <Badge variant="outline" className="font-mono">{item.registro.numero}</Badge> : <span className="text-gray-400 text-xs">Sin asignar</span>}
                      </TableCell>
                      <TableCell>{item.condicion}</TableCell>
                      <TableCell>{getEstadoBadge(item.estado)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </TableCell>
                      </TableRow>
                  ))}
                  {currentEscribanos.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No se encontraron datos</TableCell></TableRow>
                  )}
                  </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {!isLoading && filteredEscribanos.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-xl">
            <span className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredEscribanos.length)} de {filteredEscribanos.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-sm font-medium mx-2 whitespace-nowrap">
                Página {currentPage} de {totalPages}
              </span>
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
            <DialogTitle>{editingItem ? 'Editar Escribano' : 'Nuevo Escribano'}</DialogTitle>
            <DialogDescription>Completa los datos a continuación.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Nombre Completo</Label>
                 <Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Matrícula</Label>
                 <Input value={formData.matricula} onChange={(e) => setFormData({...formData, matricula: e.target.value})} />
               </div>
            </div>

            <div className="space-y-2 relative">
              <Label>Registro Asignado (Opcional)</Label>
              <div className="relative">
                <Input 
                  value={registroSearch} 
                  onChange={(e) => {
                    setRegistroSearch(e.target.value);
                    setIsRegistroDropdownOpen(true);
                    if (e.target.value === '') setFormData({...formData, registroId: ''});
                  }} 
                  onFocus={() => setIsRegistroDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsRegistroDropdownOpen(false), 200)}
                  placeholder="Buscar por número o dirección..." 
                />
                {formData.registroId && registroSearch === formData.registroId && (
                  <div className="absolute right-3 top-2.5 text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
                )}
              </div>
              
              {isRegistroDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {registros.filter(r => r.numero.toLowerCase().includes(registroSearch.toLowerCase()) || r.direccion.toLowerCase().includes(registroSearch.toLowerCase())).length > 0 ? (
                    registros.filter(r => r.numero.toLowerCase().includes(registroSearch.toLowerCase()) || r.direccion.toLowerCase().includes(registroSearch.toLowerCase())).map(reg => (
                      <div 
                        key={reg.id} 
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex flex-col border-b border-gray-50"
                        onClick={() => {
                          setFormData({...formData, registroId: reg.numero});
                          setRegistroSearch(reg.numero);
                          setIsRegistroDropdownOpen(false);
                        }}
                      >
                        <span className="text-sm font-semibold">{reg.numero}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">{reg.direccion}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-sm text-gray-500 text-center">No se encontraron registros</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Condición</Label>
                <Select value={formData.condicion} onValueChange={(val) => setFormData({...formData, condicion: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Titular">Titular</SelectItem><SelectItem value="Adjunto">Adjunto</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(val) => setFormData({...formData, estado: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Licencia">Licencia</SelectItem><SelectItem value="Jubilado">Jubilado</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

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