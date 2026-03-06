'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Search, Plus, Edit, Trash2, Loader2, RefreshCcw, CheckCircle2, ChevronLeft, ChevronRight, UploadCloud, FileText, Printer, Eye, AlertCircle, X, Building2, Calculator, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

export function EscribanosView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const router = useRouter();
  const [escribanos, setEscribanos] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [declaraciones, setDeclaraciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados Base
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [registroSearch, setRegistroSearch] = useState('');
  const [isRegistroDropdownOpen, setIsRegistroDropdownOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '', matricula: '', condicion: 'Titular', estado: 'Activo', registroId: ''
  });

  // Estados para Modal de Selección de Año
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

  // Estados para el Modal de Intereses
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [interestEntity, setInterestEntity] = useState<any>(null);
  const [interestDate, setInterestDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedInterestDjs, setSelectedInterestDjs] = useState<Set<string>>(new Set());

  const fetchEscribanos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/escribanos');
      setEscribanos(await res.json());
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los escribanos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistros = async () => {
    try {
      const res = await fetch('/api/registros');
      setRegistros(await res.json());
    } catch (error) {
      console.error("Error al cargar registros", error);
    }
  };

  const fetchDeclaraciones = async () => {
    try {
      const res = await fetch('/api/declaraciones');
      setDeclaraciones(await res.json());
    } catch (error) {
      console.error("Error al cargar declaraciones", error);
    }
  };

  useEffect(() => {
    fetchEscribanos();
    fetchRegistros();
    fetchDeclaraciones();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- LÓGICA DE FALTANTES ---
  const handleInitialOpenDjList = (item: any) => {
    setPendingEntity(item);
    setSelectedYear(new Date().getFullYear().toString());
    setIsYearModalOpen(true);
  };

  const handleConfirmYear = async () => {
    setIsYearModalOpen(false);
    setEntityName(`Escribano: ${pendingEntity.nombre} - Año ${selectedYear}`);
    setIsDjListModalOpen(true);
    setDjsLoading(true);
    try {
      const res = await fetch('/api/declaraciones');
      const data = await res.json();
      setDeclaraciones(data); 
      const filtered = data.filter((d: any) => d.escribanoId === pendingEntity.id && d.anio === parseInt(selectedYear));
      setSelectedEntityDjs(filtered);
    } catch (error) {
      toast({ title: "Error", description: "Error al cargar las declaraciones", variant: "destructive" });
    } finally {
      setDjsLoading(false);
    }
  };

  const getMissingDjs = () => {
    const regId = pendingEntity?.registroId || pendingEntity?.registro?.numero;
    const djsDelRegistro = regId ? declaraciones.filter(d => d.registroId === regId && d.anio === parseInt(selectedYear)) : selectedEntityDjs;
    const nums = djsDelRegistro.map(d => parseInt(d.numerodj, 10)).filter(n => !isNaN(n) && n > 0);
    if (nums.length === 0) return [];
    
    const max = Math.max(...nums);
    const missing = [];
    for (let i = 1; i < max; i++) {
      if (!nums.includes(i)) missing.push(i);
    }
    return missing;
  };

  const missingDjs = getMissingDjs();

  // --- LÓGICA DE INTERESES ESCALONADOS ---
  const handleOpenInterestModal = (item: any) => {
    setInterestEntity(item);
    setInterestDate(new Date().toISOString().split('T')[0]);
    setSelectedInterestDjs(new Set());
    setIsInterestModalOpen(true);
  };

  const overdueDjs = useMemo(() => {
    if (!interestEntity) return [];
    return declaraciones.filter(dj => {
      const isOwner = dj.escribanoId === interestEntity.id;
      
      const vtoDate = new Date(dj.fecha_vto);
      vtoDate.setHours(0,0,0,0);
      
      // Si está pagada, verificamos si se pagó tarde. Si no está pagada, verificamos según la fecha de cálculo
      const calcDate = dj.fecha_pago ? new Date(dj.fecha_pago) : new Date(interestDate + 'T00:00:00');
      calcDate.setHours(0,0,0,0);
      
      const isOverdue = calcDate.getTime() > vtoDate.getTime();
      return isOwner && isOverdue;
    });
  }, [declaraciones, interestEntity, interestDate]);

  const toggleInterestDj = (id: string) => {
    const newSet = new Set(selectedInterestDjs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedInterestDjs(newSet);
  };

  const toggleAllInterestDjs = () => {
    if (selectedInterestDjs.size === overdueDjs.length) setSelectedInterestDjs(new Set());
    else setSelectedInterestDjs(new Set(overdueDjs.map(dj => dj.id)));
  };

  const getDjInterestData = (dj: any) => {
    const baseMonto = (dj.rubroB || 0) + (dj.rubroC || 0) + (dj.rubroD || 0);
    
    const vtoDate = new Date(dj.fecha_vto);
    vtoDate.setHours(0,0,0,0);
    
    const calcDate = dj.fecha_pago ? new Date(dj.fecha_pago) : new Date(interestDate + 'T00:00:00');
    calcDate.setHours(0,0,0,0);
    
    const diffTime = calcDate.getTime() - vtoDate.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    let rate = 0;
    if (daysOverdue > 0 && daysOverdue <= 30) rate = 0.10;
    else if (daysOverdue >= 31 && daysOverdue <= 60) rate = 0.20;
    else if (daysOverdue >= 61 && daysOverdue <= 90) rate = 0.30;
    else if (daysOverdue >= 91 && daysOverdue <= 120) rate = 0.40;
    else if (daysOverdue > 120) rate = 0.50;

    const interes = baseMonto * rate;
    
    return { 
      baseMonto, 
      daysOverdue, 
      interes, 
      ratePercentage: rate * 100,
      fechaCalculoUsada: calcDate
    };
  };

  // El total a pagar es EXCLUSIVAMENTE la suma de los intereses
  const totalInteresSeleccionado = overdueDjs
    .filter(dj => selectedInterestDjs.has(dj.id))
    .reduce((sum, dj) => sum + getDjInterestData(dj).interes, 0);

  const handlePrintInterestReport = () => {
    if (selectedInterestDjs.size === 0) {
      toast({ title: "Atención", description: "Seleccione al menos una DJ para imprimir.", variant: "destructive" });
      return;
    }

    const selectedDjsList = overdueDjs.filter(dj => selectedInterestDjs.has(dj.id));
    let totalIntereses = 0;
    let totalBase = 0;

    const tableRows = selectedDjsList.map(dj => {
      const { baseMonto, daysOverdue, interes, ratePercentage, fechaCalculoUsada } = getDjInterestData(dj);
      totalBase += baseMonto;
      totalIntereses += interes;
      
      const paymentInfo = dj.fecha_pago 
        ? `<br><small style="color:#16a34a">Pagada el: ${fechaCalculoUsada.toLocaleDateString('es-AR')}</small>`
        : '';
      
      return `
        <tr>
          <td><strong>${dj.numerodj}</strong> <br><small>Cód: ${dj.codigodj}</small></td>
          <td>${new Date(dj.fecha_vto).toLocaleDateString('es-AR')} ${paymentInfo}</td>
          <td class="text-right">${formatMoney(baseMonto)}</td>
          <td class="text-center">${daysOverdue} días<br><small>(${ratePercentage}%)</small></td>
          <td class="text-right font-bold text-orange-600">${formatMoney(interes)}</td>
        </tr>
      `;
    }).join('');

    const printContent = `
      <html>
        <head>
          <title>Liquidación de Intereses - ${interestEntity.nombre}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5; }
            .header { border-bottom: 2px solid #ea580c; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; color: #ea580c; font-size: 24px; }
            .escribano-info { background: #fff7ed; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffedd5; }
            .escribano-info h3 { margin-top: 0; color: #9a3412; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #fdba74; padding-bottom: 8px;}
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .text-orange-600 { color: #ea580c; }
            .summary { width: 350px; float: right; background: #f8fafc; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; }
            .summary-total { font-size: 20px; font-weight: bold; border-top: 2px solid #ea580c; padding-top: 15px; margin-top: 15px; color: #ea580c; }
            .clear { clear: both; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Liquidación de Intereses por Mora</h1>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Emisión del reporte de deuda</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0;">Fecha cálculo: <strong>${new Date(interestDate + 'T00:00:00').toLocaleDateString('es-AR')}</strong></p>
              <p style="margin: 5px 0 0 0;">Tasa Aplicada: <strong>Escala por Tramos (Max 50%)</strong></p>
            </div>
          </div>
          
          <div class="escribano-info">
            <h3>Datos del Escribano Titular</h3>
            <div class="info-grid">
              <div><strong>Nombre Completo:</strong> ${interestEntity.nombre}</div>
              <div><strong>Matrícula:</strong> ${interestEntity.matricula}</div>
              <div><strong>Registro Notarial:</strong> Nº ${interestEntity.registro?.numero || 'Sin asignar'}</div>
              <div><strong>Condición:</strong> ${interestEntity.condicion}</div>
            </div>
          </div>

          <h3 style="margin-bottom: 10px; color: #374151;">Detalle de Declaraciones</h3>
          <table>
            <thead>
              <tr>
                <th>Nº DJ</th>
                <th>Vencimiento</th>
                <th class="text-right">Monto Base<br><small>(Rubros B+C+D)</small></th>
                <th class="text-center">Días Atraso / Tasa</th>
                <th class="text-right">Total a Pagar<br><small>(Solo Interés)</small></th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="summary">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #374151;">Resumen de Liquidación</h3>
            <div class="summary-row"><span style="color: #6b7280;">Declaraciones procesadas:</span> <strong>${selectedDjsList.length}</strong></div>
            <div class="summary-row"><span style="color: #6b7280;">Total Base Calculado:</span> <strong>${formatMoney(totalBase)}</strong></div>
            <div class="summary-row summary-total"><span>Total Intereses a Pagar:</span> <span>${formatMoney(totalIntereses)}</span></div>
          </div>
          <div class="clear"></div>
        </body>
      </html>
    `;
    
    const windowPrint = window.open('', '', 'width=900,height=700');
    if (windowPrint) {
      windowPrint.document.write(printContent);
      windowPrint.document.close();
      windowPrint.focus();
      setTimeout(() => {
        windowPrint.print();
        windowPrint.close();
      }, 250);
    }
  };

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
    if (item) {
      const regId = item.registro ? item.registro.numero : '';
      setFormData({ nombre: item.nombre, matricula: item.matricula, condicion: item.condicion, estado: item.estado, registroId: regId });
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
      const res = await fetch('/api/escribanos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast({ title: "Éxito", description: editingItem ? "Escribano actualizado" : "Escribano creado" });
      setIsModalOpen(false); fetchEscribanos();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        const formattedData = rawData.map((row: any) => {
          const findCol = (keywords: string[]) => {
            const keys = Object.keys(row);
            const foundKey = keys.find(k => keywords.some(kw => k.toLowerCase().replace(/[\s\r\n]/g, '').includes(kw.toLowerCase())));
            return foundKey ? row[foundKey] : '';
          };
          return {
            nombre: findCol(['nombre', 'apellido']) ? findCol(['nombre', 'apellido']).toString().trim() : 'Sin Nombre',
            dni: findCol(['dni', 'documento']) ? findCol(['dni', 'documento']).toString().trim() : '', 
            matricula: findCol(['matricula', 'matrícula']) ? findCol(['matricula', 'matrícula']).toString().trim() : '',
            registroId: findCol(['registro', 'reg']) ? findCol(['registro', 'reg']).toString().trim() : null,
            condicion: findCol(['cargo', 'condicion']) ? findCol(['cargo', 'condicion']).toString().trim() : 'Titular',
            estado: 'Activo',
          };
        }).filter(esc => esc.matricula !== ''); 

        if (formattedData.length === 0) {
          toast({ title: "Error", description: "No se encontraron datos válidos.", variant: "destructive" }); setIsUploading(false); return;
        }

        const res = await fetch('/api/escribanos/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formattedData) });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al importar');
        toast({ title: "Importación Finalizada", description: `Agregados ${result.agregados}. Omitidos ${result.omitidos}.` });
        setIsUploadModalOpen(false); fetchEscribanos();
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Error", variant: "destructive" });
      } finally { setIsUploading(false); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Activo': return <Badge className="bg-green-600">Activo</Badge>;
      case 'Licencia': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Licencia</Badge>;
      case 'Jubilado': return <Badge variant="secondary">Jubilado</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const formatMoney = (val: number) => `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredEscribanos = escribanos
    .filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || e.matricula.includes(searchTerm))
    .sort((a, b) => {
      const numA = a.registroId || ''; const numB = b.registroId || '';
      if (!numA && numB) return 1; if (numA && !numB) return -1;
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const totalPages = Math.max(1, Math.ceil(filteredEscribanos.length / itemsPerPage));
  const currentEscribanos = filteredEscribanos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <DashboardLayout role={role} title="Gestión de Escribanos">
      <Card className="border-0 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader className="px-6 py-4 border-b border-gray-100 flex-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Buscar por nombre o matrícula..." className="pl-9 focus-visible:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={fetchEscribanos} title="Recargar"><RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
                <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)} className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 w-full sm:w-auto"><UploadCloud className="w-4 h-4" /> Importar Excel</Button>
                <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"><Plus className="w-4 h-4" /> Nuevo</Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader className="bg-gray-50/50">
                  <TableRow>
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
                      <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      <TableCell>{item.matricula}</TableCell>
                      <TableCell>{item.registro ? <Badge variant="outline" className="font-mono bg-white">{item.registro.numero}</Badge> : <span className="text-gray-400 text-xs">Sin asignar</span>}</TableCell>
                      <TableCell>{item.condicion}</TableCell>
                      <TableCell>{getEstadoBadge(item.estado)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenInterestModal(item)} title="Calcular Intereses por Mora">
                              <Calculator className="w-4 h-4 text-orange-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleInitialOpenDjList(item)} title="Ver Listado de Declaraciones">
                              <FileText className="w-4 h-4 text-primary" />
                          </Button>
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
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-xl flex-none">
            <span className="text-sm text-gray-500">Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredEscribanos.length)} de {filteredEscribanos.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Anterior</span></Button>
              <span className="text-sm font-medium mx-2 whitespace-nowrap">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><span className="hidden sm:inline">Siguiente</span> <ChevronRight className="w-4 h-4 sm:ml-1" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL 0: SELECCIONAR AÑO (Para historial) */}
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
              <Input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} placeholder="Ej. 2025" className="focus-visible:ring-primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsYearModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmYear} className="bg-primary hover:bg-primary/90 text-white">Ver Declaraciones</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NUEVO MODAL: CÁLCULO DE INTERESES POR MORA ESCALONADOS */}
      <Dialog open={isInterestModalOpen} onOpenChange={setIsInterestModalOpen}>
        <DialogTitle className="sr-only">Cálculo de Intereses</DialogTitle>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-5xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
          
          <div className="flex justify-between items-center px-6 py-4 border-b bg-orange-600">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Calculator className="w-5 h-5"/> Cálculo de Intereses por Mora</h2>
            <button onClick={() => setIsInterestModalOpen(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            
            {/* Cabecera de configuración */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="space-y-2">
                <Label>Fecha de Cálculo (Para DJ no pagadas)</Label>
                <Input type="date" value={interestDate} onChange={e => setInterestDate(e.target.value)} className="focus-visible:ring-orange-600" />
                <p className="text-[11px] text-gray-500 mt-1">Si la DJ fue pagada fuera de término, se usará su fecha de pago original.</p>
              </div>
              <div className="flex flex-col justify-center bg-orange-50/50 p-3 rounded-md border border-orange-100">
                 <p className="text-sm font-semibold text-orange-800 flex items-center gap-1 mb-1"><Info className="w-4 h-4"/> Escala de Intereses Aplicada</p>
                 <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs text-orange-900 mt-1">
                   <span>1 a 30 días: <strong>10%</strong></span>
                   <span>31 a 60 días: <strong>20%</strong></span>
                   <span>61 a 90 días: <strong>30%</strong></span>
                   <span>91 a 120 días: <strong>40%</strong></span>
                   <span className="col-span-2">Más de 120 días: <strong>50% (Máximo)</strong></span>
                 </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <input type="checkbox" className="w-4 h-4 cursor-pointer rounded border-gray-300 accent-orange-600"
                        checked={overdueDjs.length > 0 && selectedInterestDjs.size === overdueDjs.length}
                        onChange={toggleAllInterestDjs}
                      />
                    </TableHead>
                    <TableHead>Nº DJ</TableHead>
                    <TableHead>Vencimiento / Pago</TableHead>
                    <TableHead className="text-center">Atraso / Tasa</TableHead>
                    <TableHead className="text-right">Monto Base (B+C+D)</TableHead>
                    <TableHead className="text-right text-orange-700">Interés a Pagar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueDjs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No se encontraron declaraciones con mora para este escribano.</TableCell></TableRow>
                  ) : (
                    overdueDjs.map((dj) => {
                      const { baseMonto, daysOverdue, interes, ratePercentage, fechaCalculoUsada } = getDjInterestData(dj);
                      return (
                        <TableRow key={dj.id} className={selectedInterestDjs.has(dj.id) ? "bg-orange-50/50" : ""}>
                          <TableCell className="text-center">
                            <input type="checkbox" className="w-4 h-4 cursor-pointer rounded border-gray-300 accent-orange-600"
                              checked={selectedInterestDjs.has(dj.id)}
                              onChange={() => toggleInterestDj(dj.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{dj.numerodj}</TableCell>
                          <TableCell>
                            <div className="text-red-600 font-medium">Vto: {new Date(dj.fecha_vto).toLocaleDateString('es-AR')}</div>
                            {dj.fecha_pago && <div className="text-xs text-green-700 mt-0.5">Pagada: {fechaCalculoUsada.toLocaleDateString('es-AR')}</div>}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-medium">{daysOverdue} días</div>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px] mt-1 hover:bg-orange-100">{ratePercentage}%</Badge>
                          </TableCell>
                          <TableCell className="text-right text-gray-600">{formatMoney(baseMonto)}</TableCell>
                          <TableCell className="text-right font-bold text-orange-600">{formatMoney(interes)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="flex justify-between items-center px-6 py-4 border-t bg-white flex-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="text-sm font-medium text-gray-600 flex items-center gap-4">
              <span><span className="text-orange-600 font-bold">{selectedInterestDjs.size}</span> DJ seleccionadas</span>
              {selectedInterestDjs.size > 0 && (
                <span className="bg-orange-50 text-orange-800 px-4 py-2 rounded-md border border-orange-200">
                  Total a Pagar (Solo Intereses): <strong className="text-lg ml-1">{formatMoney(totalInteresSeleccionado)}</strong>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsInterestModalOpen(false)}>Cancelar</Button>
              <Button onClick={handlePrintInterestReport} disabled={selectedInterestDjs.size === 0} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                <Printer className="w-4 h-4" /> Imprimir Liquidación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 1: LISTADO DE DECLARACIONES (HISTORIAL Y FALTANTES) */}
      <Dialog open={isDjListModalOpen} onOpenChange={setIsDjListModalOpen}>
        <DialogTitle className="sr-only">Listado de Declaraciones</DialogTitle>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-4xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
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
                          <TableHead>Fecha Acto</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead className="text-right">Total Liquidado</TableHead>
                          <TableHead className="text-right no-print">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEntityDjs.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay declaraciones registradas para este escribano en el año {selectedYear}.</TableCell></TableRow>
                        ) : (
                          selectedEntityDjs.map((dj) => (
                            <TableRow key={dj.id}>
                              <TableCell className="font-medium">{dj.numerodj}</TableCell>
                              <TableCell>{new Date(dj.fecha_acto).toLocaleDateString('es-AR')}</TableCell>
                              <TableCell className="text-orange-600">{new Date(dj.fecha_vto).toLocaleDateString('es-AR')}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(dj.total)}</TableCell>
                              <TableCell className="text-right whitespace-nowrap no-print">
                                <Button variant="ghost" size="icon" onClick={() => { setViewingDj(dj); setIsViewDjModalOpen(true); }} title="Ver Detalle"><Eye className="w-4 h-4 text-gray-500" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  toast({ title: "Redirigiendo", description: "Abriendo el módulo de Declaraciones para edición..." });
                                  router.push(`/${role.toLowerCase()}/declaraciones?escribanoId=${dj.escribanoId}`);
                                }} title="Editar DJ"><Edit className="w-4 h-4 text-blue-600" /></Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedEntityDjs.length > 0 && (
                    <div className="mt-6 bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3 missing-box">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-800">Análisis de Secuencia (DJ Faltantes Año {selectedYear})</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          {missingDjs.length > 0 
                            ? `Faltan cargar las siguientes declaraciones en este Registro Notarial: ${missingDjs.join(', ')}` 
                            : 'La secuencia del Registro está completa. No se detectaron saltos.'}
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
                  <span className="text-sm text-green-700 font-medium flex items-center gap-2">Fecha de Pago Acreditado</span>
                  <span className="font-bold text-green-800">{new Date(viewingDj.fecha_pago).toLocaleDateString('es-AR')}</span>
                </div>
              )}

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

      {/* MODALES EDITAR/CREAR Y CARGA EXCEL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
         <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Escribano' : 'Nuevo Escribano'}</DialogTitle>
            <DialogDescription>Completa los datos a continuación.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2"><Label>Nombre Completo</Label><Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} /></div>
               <div className="space-y-2"><Label>Matrícula</Label><Input value={formData.matricula} onChange={(e) => setFormData({...formData, matricula: e.target.value})} /></div>
            </div>
            <div className="space-y-2 relative">
              <Label>Registro Asignado (Opcional)</Label>
              <div className="relative">
                <Input value={registroSearch} onChange={(e) => { setRegistroSearch(e.target.value); setIsRegistroDropdownOpen(true); if (e.target.value === '') setFormData({...formData, registroId: ''}); }} onFocus={() => setIsRegistroDropdownOpen(true)} onBlur={() => setTimeout(() => setIsRegistroDropdownOpen(false), 200)} placeholder="Buscar por número o dirección..." />
                {formData.registroId && registroSearch === formData.registroId && (<div className="absolute right-3 top-2.5 text-green-600"><CheckCircle2 className="w-5 h-5" /></div>)}
              </div>
              {isRegistroDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {registros.filter(r => r.numero.toLowerCase().includes(registroSearch.toLowerCase()) || r.direccion.toLowerCase().includes(registroSearch.toLowerCase())).map(reg => (
                      <div key={reg.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex flex-col border-b border-gray-50" onClick={() => { setFormData({...formData, registroId: reg.numero}); setRegistroSearch(reg.numero); setIsRegistroDropdownOpen(false); }}>
                        <span className="text-sm font-semibold">{reg.numero}</span><span className="text-xs text-gray-500 line-clamp-1">{reg.direccion}</span>
                      </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Condición</Label><Select value={formData.condicion} onValueChange={(val) => setFormData({...formData, condicion: val})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Titular">Titular</SelectItem><SelectItem value="Adjunto">Adjunto</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label><Select value={formData.estado} onValueChange={(val) => setFormData({...formData, estado: val})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Licencia">Licencia</SelectItem><SelectItem value="Jubilado">Jubilado</SelectItem></SelectContent></Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importar Lista de Escribanos</DialogTitle><DialogDescription>Sube un archivo Excel (.xlsx o .xls) con el listado de escribanos.</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
              <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">Haz clic abajo para seleccionar tu archivo Excel</p>
              <div className="mt-4"><Input id="excel-upload" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={isUploading} className="cursor-pointer" /></div>
            </div>
            <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>Cancelar</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}