'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, RefreshCcw, DollarSign, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';

const formatMoney = (val: number) =>
  `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORIAS = ['A', 'B', 'C', 'D'] as const;
const COLOR_CAT: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-amber-100 text-amber-800 border-amber-200',
  D: 'bg-red-100 text-red-800 border-red-200',
};

export function ConfigAportesView({ role }: { role: 'ADMIN' }) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fechaInicio: '',
    fechaFin: '',
    montoA: '',
    montoB: '',
    montoC: '',
    montoD: '',
  });

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/config-aportes');
      if (res.ok) setConfigs(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleOpenModal = (config: any = null) => {
    setEditingConfig(config);
    if (config) {
      setFormData({
        fechaInicio: config.fechaInicio.split('T')[0],
        fechaFin: config.fechaFin.split('T')[0],
        montoA: config.montoA.toString(),
        montoB: config.montoB.toString(),
        montoC: config.montoC.toString(),
        montoD: config.montoD.toString(),
      });
    } else {
      setFormData({ fechaInicio: '', fechaFin: '', montoA: '', montoB: '', montoC: '', montoD: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.fechaInicio || !formData.fechaFin || !formData.montoA || !formData.montoB || !formData.montoC || !formData.montoD) {
      Swal.fire({ icon: 'warning', title: 'Atencion', text: 'Completa todos los campos', confirmButtonText: 'Aceptar' });
      return;
    }

    setIsSaving(true);
    try {
      const method = editingConfig ? 'PUT' : 'POST';
      const body = editingConfig ? { ...formData, id: editingConfig.id } : formData;
      const res = await fetch('/api/config-aportes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      Swal.fire({ icon: 'success', title: 'Exito', text: editingConfig ? 'Configuracion actualizada' : 'Configuracion creada', timer: 2000, showConfirmButton: false });
      setIsModalOpen(false);
      fetchConfigs();
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonText: 'Aceptar' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar configuracion?',
      text: 'Esta accion no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/config-aportes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      Swal.fire({ icon: 'success', title: 'Eliminada', text: 'Configuracion eliminada', timer: 2000, showConfirmButton: false });
      fetchConfigs();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar', confirmButtonText: 'Aceptar' });
    }
  };

  return (
    <DashboardLayout role={role} title="Configuracion de Aportes por Categoria">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Historial de Configuraciones</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Define los montos minimos de aporte por categoria y periodo</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchConfigs} title="Recargar">
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4" /> Nueva Configuracion
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    {CATEGORIAS.map(cat => (
                      <TableHead key={cat} className="text-center">
                        <Badge className={`${COLOR_CAT[cat]} border`}>{cat}</Badge>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No hay configuraciones registradas</p>
                        <p className="text-sm">Crea la primera configuracion para comenzar</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    configs.map(config => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">
                                {new Date(config.fechaInicio).toLocaleDateString('es-AR')} - {new Date(config.fechaFin).toLocaleDateString('es-AR')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        {CATEGORIAS.map(cat => (
                          <TableCell key={cat} className="text-center font-medium text-sm">
                            {formatMoney(config[`monto${cat}` as keyof typeof config])}
                          </TableCell>
                        ))}
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(config)}>
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Editar Configuracion' : 'Nueva Configuracion de Aportes'}</DialogTitle>
            <DialogDescription>
              Define el periodo y los montos minimos de aporte para cada categoria de escribano.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input type="date" value={formData.fechaInicio} onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input type="date" value={formData.fechaFin} onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })} />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Montos Minimos por Categoria</p>
              <div className="grid grid-cols-2 gap-4">
                {CATEGORIAS.map(cat => (
                  <div key={cat} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge className={`${COLOR_CAT[cat]} border text-xs`}>{cat}</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData[`monto${cat}` as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [`monto${cat}`]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingConfig ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
