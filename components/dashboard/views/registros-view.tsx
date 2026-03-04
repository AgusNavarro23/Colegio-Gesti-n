'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Search, Plus, Edit, Trash2, Loader2, RefreshCcw, ChevronLeft, ChevronRight, FileText, Printer, Eye, AlertCircle, X, Building2, CreditCard } from 'lucide-react';

export function RegistrosView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const router = useRouter();
  const [registros, setRegistros] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ numero: '', direccion: '', estado: 'Activo', localidad: '' });

  // Estados Modal de Año
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [pendingEntity, setPendingEntity] = useState<any>(null);

  // Estados para el Listado de DJ
  const [isDjListModalOpen, setIsDjListModalOpen] = useState(false);
  const [selectedEntityDjs, setSelectedEntityDjs] = useState<any[]>([]);
  const [entityName, setEntityName] = useState('');
  const [djsLoading, setDjsLoading] = useState(false);

  // Estados para Ver DJ individual
  const [viewingDj, setViewingDj] = useState<any>(null);
  const [isViewDjModalOpen, setIsViewDjModalOpen] = useState(false);

  const fetchRegistros = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/registros');
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

  const handleInitialOpenDjList = (item: any) => {
    setPendingEntity(item);
    setSelectedYear(new Date().getFullYear().toString());
    setIsYearModalOpen(true);
  };

  const handleConfirmYear = async () => {
    setIsYearModalOpen(false);
    setEntityName(`Registro Notarial Nº ${pendingEntity.numero} - Año ${selectedYear}`);
    setIsDjListModalOpen(true);
    setDjsLoading(true);
    try {
      const res = await fetch('/api/declaraciones');
      const data = await res.json();
      const filtered = data.filter((d: any) => d.registroId === pendingEntity.numero && d.anio === parseInt(selectedYear));
      setSelectedEntityDjs(filtered);
    } catch (error) {
      toast({ title: "Error", description: "Error al cargar las declaraciones", variant: "destructive" });
    } finally {
      setDjsLoading(false);
    }
  };

  const getMissingDjs = () => {
    const nums = selectedEntityDjs.map(d => parseInt(d.numerodj, 10)).filter(n => !isNaN(n) && n > 0);
    if (nums.length === 0) return [];
    const max = Math.max(...nums);
    const missing = [];
    for (let i = 1; i < max; i++) {
      if (!nums.includes(i)) missing.push(i);
    }
    return missing;
  };

  const missingDjs = getMissingDjs();

  const handlePrintReport = () => {
    const printContent = document.getElementById("informe-declaraciones");
    if (!printContent) return;
    const windowPrint = window.open('', '', 'width=900,height=650');
    if (!windowPrint) return;
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Informe de Declaraciones - ${entityName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .text-right { text-align: right; }
            .missing-box { padding: 15px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; color: #856404; font-weight: bold; margin-top: 20px; }
            .no-print { display: none; }
          </style>
        </head>
        <body>
          <h2>Informe de Declaraciones Juradas<br><small style="color:#666; font-size: 16px;">${entityName}</small></h2>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => { windowPrint.print(); windowPrint.close(); }, 250);
  };

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
      const res = await fetch('/api/registros', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast({ title: "Éxito", description: "Operación exitosa" });
      setIsModalOpen(false); fetchRegistros();
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
      if (!res.ok) throw new Error('Error al eliminar');
      toast({ title: "Eliminado", description: "Registro eliminado" });
      fetchRegistros();
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const formatMoney = (val: number) => `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredRegistros = registros
    .filter(r => r.numero.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' }));
  
  const totalPages = Math.max(1, Math.ceil(filteredRegistros.length / itemsPerPage));
  const currentRegistros = filteredRegistros.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <DashboardLayout role={role} title="Gestión de Registros">
      <Card className="border-0 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader className="px-6 py-4 border-b border-gray-100 flex-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Buscar por número..." className="pl-9 focus-visible:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={fetchRegistros}><RefreshCcw className="w-4 h-4" /></Button>
                <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"><Plus className="w-4 h-4" /> Nuevo Registro</Button>
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
                      <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{item.numero}</TableCell>
                      <TableCell className="text-gray-600">{item.direccion}</TableCell>
                      <TableCell className="text-gray-600">{item.localidad}</TableCell>
                      <TableCell>{item.estado === 'Activo' ? <Badge className="bg-green-600">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                          {/* Botón que ahora abre Modal de Año */}
                          <Button variant="ghost" size="icon" onClick={() => handleInitialOpenDjList(item)} title="Ver Listado de Declaraciones">
                              <FileText className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </TableCell>
                      </TableRow>
                  ))}
                  {currentRegistros.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No se encontraron registros</TableCell></TableRow>
                  )}
                  </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {!isLoading && filteredRegistros.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-xl flex-none">
            <span className="text-sm text-gray-500">Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredRegistros.length)} de {filteredRegistros.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Anterior</span></Button>
              <span className="text-sm font-medium mx-2 whitespace-nowrap">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><span className="hidden sm:inline">Siguiente</span> <ChevronRight className="w-4 h-4 sm:ml-1" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL 0: SELECCIONAR AÑO */}
      <Dialog open={isYearModalOpen} onOpenChange={setIsYearModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Año</DialogTitle>
            <DialogDescription>
              Ingrese el año para consultar las Declaraciones Juradas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Año de las Declaraciones</Label>
              <Input 
                type="number" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)} 
                placeholder="Ej. 2025" 
                className="focus-visible:ring-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsYearModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmYear} className="bg-primary hover:bg-primary/90 text-white">Ver Declaraciones</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 1: LISTADO DE DECLARACIONES */}
      <Dialog open={isDjListModalOpen} onOpenChange={setIsDjListModalOpen}>
        <DialogTitle className="sr-only">Listado de Declaraciones</DialogTitle>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-5xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Historial de Declaraciones</h2>
            <button onClick={() => setIsDjListModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            {djsLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
            ) : (
              <div className="space-y-6">
                <div id="informe-declaraciones">
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead>Nº DJ</TableHead>
                          <TableHead>Escribano</TableHead>
                          <TableHead>Fecha Acto</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead className="text-right">Total Liquidado</TableHead>
                          <TableHead className="text-right no-print">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEntityDjs.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No hay declaraciones registradas para este registro en el año {selectedYear}.</TableCell></TableRow>
                        ) : (
                          selectedEntityDjs.map((dj) => (
                            <TableRow key={dj.id}>
                              <TableCell className="font-medium">{dj.numerodj}</TableCell>
                              <TableCell>
                                <div className="text-sm font-medium text-gray-900">{dj.escribano?.nombre}</div>
                                <div className="text-xs text-gray-500">Mat. {dj.escribano?.matricula}</div>
                              </TableCell>
                              <TableCell>{new Date(dj.fecha_acto).toLocaleDateString('es-AR')}</TableCell>
                              <TableCell className="text-orange-600">{new Date(dj.fecha_vto).toLocaleDateString('es-AR')}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(dj.total)}</TableCell>
                              <TableCell className="text-right whitespace-nowrap no-print">
                                <Button variant="ghost" size="icon" onClick={() => { setViewingDj(dj); setIsViewDjModalOpen(true); }} title="Ver Detalle"><Eye className="w-4 h-4 text-gray-500" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  toast({ title: "Redirigiendo", description: "Abriendo el módulo de Declaraciones para edición..." });
                                  router.push(`/${role.toLowerCase()}/declaraciones?registroId=${dj.registroId}`);
                                }} title="Editar DJ (Redirige al módulo)"><Edit className="w-4 h-4 text-blue-600" /></Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedEntityDjs.length > 0 && (
                    <div className="mt-6 bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3 missing-box">
                      <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-800">Análisis de Secuencia (DJ Faltantes Año {selectedYear})</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          {missingDjs.length > 0 
                            ? `Faltan cargar las siguientes declaraciones: ${missingDjs.join(', ')}` 
                            : 'La secuencia está completa. No se detectaron saltos de numeración.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white flex-none">
            <Button variant="outline" onClick={() => setIsDjListModalOpen(false)}>Cerrar</Button>
            <Button onClick={handlePrintReport} disabled={djsLoading || selectedEntityDjs.length === 0} className="gap-2 bg-primary text-white hover:bg-primary/90">
              <Printer className="w-4 h-4" /> Imprimir Informe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: VER DJ INDIVIDUAL (DISEÑO PREMIUM) */}
      <Dialog open={isViewDjModalOpen} onOpenChange={setIsViewDjModalOpen}>
        <DialogTitle className="sr-only">Ver Declaración Jurada</DialogTitle>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-5xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
          
          <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
            <h2 className="text-2xl font-semibold text-gray-900">Detalle de Declaración Jurada</h2>
            <button onClick={() => setIsViewDjModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {viewingDj && (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="shadow-sm border-gray-200 col-span-2"><CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full"><Building2 className="w-6 h-6 text-primary"/></div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Escribanía y Registro</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{viewingDj.escribano?.nombre}</p>
                      <p className="text-sm text-gray-600">Registro N° {viewingDj.registro?.numero} - Matrícula: {viewingDj.escribano?.matricula}</p>
                    </div>
                  </div>
                </CardContent></Card>
                <Card className="shadow-sm border-gray-200"><CardContent className="p-5 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">DJ Número</p>
                      <p className="text-2xl font-black text-primary mt-1">{viewingDj.numerodj}</p>
                      <p className="text-sm text-gray-600 mt-1">Cód: {viewingDj.codigodj || '-'}</p>
                    </div>
                    {viewingDj.fecha_pago ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 font-bold px-3 py-1">PAGADA</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 font-bold px-3 py-1">PENDIENTE</Badge>
                    )}
                  </div>
                </CardContent></Card>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                  <span className="text-sm text-gray-500 font-medium">Fecha de Acto</span>
                  <span className="font-semibold text-gray-900">{new Date(viewingDj.fecha_acto).toLocaleDateString('es-AR')}</span>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex justify-between items-center shadow-sm">
                  <span className="text-sm text-orange-600 font-medium">Fecha de Vencimiento</span>
                  <span className="font-semibold text-orange-700">{new Date(viewingDj.fecha_vto).toLocaleDateString('es-AR')}</span>
                </div>
              </div>

              {viewingDj.fecha_pago && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex justify-between items-center shadow-sm mb-6">
                  <span className="text-sm text-green-700 font-medium flex items-center gap-2"><CreditCard className="w-4 h-4"/> Fecha de Pago Acreditado</span>
                  <span className="font-bold text-green-800">{new Date(viewingDj.fecha_pago).toLocaleDateString('es-AR')}</span>
                </div>
              )}

              {/* Tabla de Actos (Read Only) */}
              <Card className="shadow-sm border-gray-200 mb-6"><CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-100"><TableRow>
                    <TableHead>Código</TableHead><TableHead>Descripción del Trámite</TableHead>
                    <TableHead className="text-right">Monto Declarado</TableHead>
                    <TableHead className="text-right">Honorario Calc.</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {viewingDj.detalles?.map((d: any, index: number) => (
                      <TableRow key={index} className="bg-white">
                        <TableCell className="font-medium">{d.arancel?.codigo}</TableCell>
                        <TableCell>{d.arancel?.descripcion}</TableCell>
                        <TableCell className="text-right text-gray-600">{formatMoney(d.monto)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatMoney(d.arancelCalculado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>

              {/* Liquidación Final (Read Only) */}
              <div className="flex flex-col md:flex-row justify-end gap-6">
                <Card className="shadow-sm border-gray-200 md:w-96"><CardContent className="p-5 space-y-3">
                  <h4 className="font-semibold text-gray-900 border-b pb-2 mb-3">Resumen de Liquidación</h4>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Arancel Tipificado:</span><span className="font-medium text-gray-900">{formatMoney(viewingDj.aranceltip)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Total Rubro A:</span><span className="font-medium text-gray-900">{formatMoney(viewingDj.rubroA)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Aporte Col. (Rubro B 12%):</span><span className="font-medium text-gray-900">{formatMoney(viewingDj.rubroB)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Caja Jubilación (Rubro C 7%):</span><span className="font-medium text-gray-900">{formatMoney(viewingDj.rubroC)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Fijo (Rubro D):</span><span className="font-medium text-gray-900">{formatMoney(viewingDj.rubroD)}</span></div>
                  <div className="h-px bg-gray-200 my-3"></div>
                  <div className="flex justify-between items-center"><span className="text-lg font-bold text-gray-900">Total:</span><span className="text-2xl font-black text-primary">{formatMoney(viewingDj.total)}</span></div>
                </CardContent></Card>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR/CREAR REGISTRO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Registro' : 'Nuevo Registro'}</DialogTitle>
            <DialogDescription>Administra los detalles del registro notarial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Número de Registro</Label><Input value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} /></div>
              <div className="space-y-2"><Label>Estado</Label><Select value={formData.estado} onValueChange={(val) => setFormData({...formData, estado: val})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Dirección Física</Label><Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Localidad</Label>
              <Select value={formData.localidad} onValueChange={(val) => setFormData({...formData, localidad: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Salta Capital">Salta Capital</SelectItem><SelectItem value="Tartagal">Tartagal</SelectItem><SelectItem value="Cerrillos">Cerrillos</SelectItem><SelectItem value="Oran">Oran</SelectItem><SelectItem value="Chicoana">Chicoana</SelectItem><SelectItem value="Rosario de la Frontera">Rosario de la Frontera</SelectItem><SelectItem value="Metán">Metán</SelectItem><SelectItem value="Embarcación">Embarcación</SelectItem><SelectItem value="General Guemes">General Guemes</SelectItem><SelectItem value="Joaquí V. Gonzalez ">J. V. Gonzalez</SelectItem><SelectItem value="Colonia Santa Rosa">Colonia Santa Rosa</SelectItem><SelectItem value="Hipolito Yrigoyen">Hipolito Yrigoyen</SelectItem><SelectItem value="Rosario de Lerma">Rosario de Lerma</SelectItem><SelectItem value="Cafayate">Cafayate</SelectItem></SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}