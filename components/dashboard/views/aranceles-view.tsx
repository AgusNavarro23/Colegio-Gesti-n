'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea'; // Asegúrate de tener este componente
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Loader2, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export function ArancelesView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [aranceles, setAranceles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Estado del formulario actualizado
  const [formData, setFormData] = useState({ 
    codigo: '', descripcion: '', minimo: '', maximo: '', 
    porcentaje1: '', porcentaje2: '', adicional: '', observaciones: '' 
  });

  const fetchAranceles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/aranceles');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setAranceles(data);
    } catch (error) {
      toast({ title: "Error", description: "Error cargando aranceles", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAranceles(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({ 
        codigo: item.codigo || '', 
        descripcion: item.descripcion || '', 
        minimo: item.minimo !== null ? item.minimo.toString() : '', 
        maximo: item.maximo !== null ? item.maximo.toString() : '', 
        porcentaje1: item.porcentaje1 !== null ? item.porcentaje1.toString() : '', 
        porcentaje2: item.porcentaje2 !== null ? item.porcentaje2.toString() : '', 
        porcentaje3: item.porcentaje3 !== null ? item.porcentaje3.toString() : '',
        adicional: item.adicional !== null ? item.adicional.toString() : '', 
        observaciones: item.observaciones || '' 
      });
    } else {
      setFormData({ 
        codigo: '', descripcion: '', minimo: '', maximo: '', 
        porcentaje1: '', porcentaje2: '', adicional: '', porcentaje3: '', observaciones: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem ? { ...formData, id: editingItem.id } : formData;
      const res = await fetch('/api/aranceles', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast({ title: "Éxito", description: "Arancel guardado correctamente" });
      setIsModalOpen(false);
      fetchAranceles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este arancel?')) return;
    try {
      const res = await fetch(`/api/aranceles?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast({ title: "Eliminado", description: "Arancel eliminado" });
      fetchAranceles();
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const filteredAranceles = aranceles.filter(a => 
    (a.descripcion && a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (a.codigoRenta && a.codigoRenta.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredAranceles.length / itemsPerPage));
  const currentAranceles = filteredAranceles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helper para formatear moneda
  const formatMoney = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return `$${val.toLocaleString('es-AR')}`;
  };

  // Helper para formatear porcentaje
  const formatPercent = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return `${val}%`;
  };

  return (
    <DashboardLayout role={role} title="Gestión de Aranceles">
      <Card className="border-0 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader className="px-6 py-4 border-b border-gray-100 flex-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Buscar por código o descripción..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={fetchAranceles}><RefreshCcw className="w-4 h-4" /></Button>
                <Button onClick={() => handleOpenModal()} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Nuevo Arancel</Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead className="min-w-50">Descripción</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Máximo</TableHead>
                  <TableHead>Base / Exc.</TableHead>
                  <TableHead>Adicional</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAranceles.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium"><Badge variant="outline">{item.codigoRenta}</Badge></TableCell>
                    <TableCell className="text-gray-900">
                      <div className="font-medium">{item.descripcion}</div>
                      {item.observaciones && <div className="text-xs text-gray-500 line-clamp-1">{item.observaciones}</div>}
                    </TableCell>
                    <TableCell className="text-gray-600">{formatMoney(item.minimo)}</TableCell>
                    <TableCell className="text-gray-600">{formatMoney(item.maximo)}</TableCell>
                    <TableCell className="text-gray-600">
                      <div className="flex flex-col text-xs">
                        {item.porcentaje1 !== null && <span>Base: {formatPercent(item.porcentaje1)}</span>}
                        {item.porcentaje2 !== null && <span className="text-orange-600">Exc: {formatPercent(item.porcentaje2)}</span>}
                        {item.porcentaje3 !== null && <span className="text-green-600">Adic: {formatPercent(item.porcentaje3)}</span>}
                        {item.porcentaje1 === null && item.porcentaje2 === null && item.porcentaje3 === null && '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{formatMoney(item.adicional)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {currentAranceles.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No se encontraron aranceles</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* CONTROLES DE PAGINACIÓN */}
        {!isLoading && filteredAranceles.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-none rounded-b-xl">
            <span className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredAranceles.length)} de {filteredAranceles.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm font-medium mx-2">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL AMPLIADO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Arancel' : 'Nuevo Arancel'}</DialogTitle>
            <DialogDescription>Configura los parámetros de cálculo para este trámite.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-2">
                <Label>Código *</Label>
                <Input value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} placeholder="Ej. 1.A" />
              </div>
              <div className="col-span-3 space-y-2">
                <Label>Descripción del Trámite *</Label>
                <Input value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} placeholder="Ej. Escritura Pública..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="space-y-2">
                <Label>Monto Mínimo ($)</Label>
                <Input type="number" step="0.01" value={formData.minimo} onChange={(e) => setFormData({...formData, minimo: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Monto Máximo o Tope ($)</Label>
                <Input type="number" step="0.01" value={formData.maximo} onChange={(e) => setFormData({...formData, maximo: e.target.value})} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Porcentaje Base (%)</Label>
                <Input type="number" step="0.01" value={formData.porcentaje1} onChange={(e) => setFormData({...formData, porcentaje1: e.target.value})} placeholder="Ej. 2.5" />
              </div>
              <div className="space-y-2">
                <Label>Porc. Excedente (%)</Label>
                <Input type="number" step="0.01" value={formData.porcentaje2} onChange={(e) => setFormData({...formData, porcentaje2: e.target.value})} placeholder="Ej. 1.5" />
              </div>
                <div className="space-y-2">
                <Label>Porc. Adicional (%)</Label>
                <Input type="number" step="0.01" value={formData.porcentaje3} onChange={(e) => setFormData({...formData, porcentaje3: e.target.value})} placeholder="Ej. 1.5" />
              </div>
            </div>

              <div className="space-y-2">
                <Label>Adicional Fijo ($)</Label>
                <Input type="number" step="0.01" value={formData.adicional} onChange={(e) => setFormData({...formData, adicional: e.target.value})} placeholder="0.00" />
              </div>

            <DialogFooter className="mt-4 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                 {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Arancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}