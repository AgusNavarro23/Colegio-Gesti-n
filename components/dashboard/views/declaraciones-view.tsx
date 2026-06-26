'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/dashboard/shared/pagination-controls';
import Swal from 'sweetalert2';
import { Search, Plus, Minus, Trash2, Loader2, RefreshCcw, User, CheckCircle2, X, Edit, Eye, FilterX, CreditCard, Building2, Printer, CalendarDays, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { feriados } from '@/lib/feriados';
import * as XLSX from 'xlsx';

const addBusinessDays = (startDate: Date, daysToAdd: number) => {
  let currentDate = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    // Sumamos un día
    currentDate.setDate(currentDate.getDate() + 1);

    // Formateamos la fecha actual a "dd-mm-yyyy" para comparar
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    // Verificamos si es fin de semana (0 = Domingo, 6 = Sábado)
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    
    // Verificamos si la fecha actual está en nuestro arreglo de feriados
    const isHoliday = feriados.includes(formattedDate);

    // Solo sumamos el día si NO es fin de semana Y NO es feriado
    if (!isWeekend && !isHoliday) {
      addedDays++;
    }
  }

  // Devolvemos en formato YYYY-MM-DD para los inputs tipo date
  return currentDate.toISOString().split('T')[0];
};

const formatDateForInput = (isoString: string) => {
  if (!isoString) return '';
  return new Date(isoString).toISOString().split('T')[0];
};

const seleccionarRegla = (arancel: any, monto: number, cantidadActos: number) => {
  const reglas = arancel?.reglas || [];
  if (reglas.length === 0) return null;

  if (monto === 0) {
    const r = reglas.find((r: any) => r.tipo === 'EXENTO');
    if (r) return r;
  }
  if (cantidadActos > 1) {
    const r = reglas.find((r: any) => r.tipo === 'COMBINADO');
    if (r) return r;
  }
  const r = reglas.find((r: any) => r.tipo === 'INDIVIDUAL');
  return r || null;
};

const calcularHonorario = (monto: number, arancel: any, cantidadAdicionales: number = 0, cantidadActos: number = 1) => {
  if (!arancel) return 0;

  const regla = seleccionarRegla(arancel, monto, cantidadActos);
  const params = regla || arancel;
  const tc = params.tipoCalculo || 'NORMAL';

  if (tc === 'PORCENTAJE_SOBRE_TOTAL') return 0;

  let honorario = 0;

  if (params.maximo && monto > params.maximo) {
    const baseFija = params.porcentaje1 
      ? (params.maximo * (params.porcentaje1 / 100)) 
      : (params.minimo || 0);
    const excedente = monto - params.maximo;
    const calculoExcedente = params.porcentaje2 ? (excedente * (params.porcentaje2 / 100)) : 0;
    honorario = baseFija + calculoExcedente;
  } else {
    honorario = params.porcentaje1 ? monto * (params.porcentaje1 / 100) : 0;
  }

  if (params.minimo && honorario < params.minimo) {
    honorario = params.minimo;
  }

  if (cantidadAdicionales > 0) {
    honorario += (params.adicional || 0) * cantidadAdicionales;
  }

  if (params.porcentaje3) {
    honorario += (params.porcentaje3 / 100) * honorario;
  }

  return honorario;
};

const calcularTotalConPorcentaje = (detalles: any[], subtotalNormal: number) => {
  let total = subtotalNormal;
  for (const d of detalles) {
    const regla = d.arancel?.reglas?.find((r: any) => {
      if (d.monto === 0) return r.tipo === 'EXENTO';
      if (detalles.length > 1) return r.tipo === 'COMBINADO';
      return r.tipo === 'INDIVIDUAL';
    });
    const params = regla || d.arancel;
    if (params?.tipoCalculo === 'PORCENTAJE_SOBRE_TOTAL') {
      const porcentaje3 = params.porcentaje3 || 0;
      const honorario = subtotalNormal * (porcentaje3 / 100);
      d.arancelCalculado = honorario;
      total += honorario;
    }
  }
  return total;
};

export function DeclaracionesView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [declaraciones, setDeclaraciones] = useState<any[]>([]);
  const [aranceles, setAranceles] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [escribanos, setEscribanos] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Estados para Pago de DJ
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payDate, setPayDate] = useState('');
  const [selectedDjsToPay, setSelectedDjsToPay] = useState<any[]>([]);
  const [djSearchToPay, setDjSearchToPay] = useState('');
  const [isDjPayDropdownOpen, setIsDjPayDropdownOpen] = useState(false);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Estados para el Reporte Diario
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [dailyReportDate, setDailyReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados para Descarga Excel
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelDate, setExcelDate] = useState(new Date().toISOString().split('T')[0]);

  // Filtros URL
  const [urlFilterRegistro, setUrlFilterRegistro] = useState('');
  const [urlFilterEscribano, setUrlFilterEscribano] = useState('');

  // Estados Formulario Identificación
  const [numerodj, setNumerodj] = useState('');
  const [codigodj, setCodigodj] = useState('');
  const [fechaActo, setFechaActo] = useState('');
  const [fechaVto, setFechaVto] = useState('');
  
  // Estados Rubros
  const [aranceltip, setAranceltip] = useState<number | ''>(0); // Ahora es un ESTADO editable
  const [inscripcion, setInscripcion] = useState<number>(0);
  const [impuesto, setImpuesto] = useState<number>(0);
  const [recargoSellos, setRecargoSellos] = useState<number>(0);
  const [actividadesEconomicas, setActividadesEconomicas] = useState<number>(0);

  // Estados Notaría
  const [registroId, setRegistroId] = useState('');
  const [escribanoId, setEscribanoId] = useState('');
  const [registroSearch, setRegistroSearch] = useState('');
  const [isRegistroDropdownOpen, setIsRegistroDropdownOpen] = useState(false);

  // Estados Tabla Actos
  const [detalles, setDetalles] = useState<any[]>([]);
  const [currentArancelId, setCurrentArancelId] = useState('');
  const [currentMonto, setCurrentMonto] = useState('');
  const [arancelSearch, setArancelSearch] = useState('');
  const [isArancelDropdownOpen, setIsArancelDropdownOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resDJ, resAranceles, resReg, resEsc] = await Promise.all([
        fetch('/api/declaraciones'), fetch('/api/aranceles'),
        fetch('/api/registros'), fetch('/api/escribanos')
      ]);
      
      const djData = await resDJ.json();
      const arancelesData = await resAranceles.json();
      const regData = await resReg.json();
      const escData = await resEsc.json();
      
      setDeclaraciones(Array.isArray(djData) ? djData : []);
      setAranceles(Array.isArray(arancelesData) ? arancelesData : []);
      setRegistros(Array.isArray(regData) ? regData : []);
      setEscribanos(Array.isArray(escData) ? escData : []);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error cargando datos', confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if(params.get('registroId')) setUrlFilterRegistro(params.get('registroId') || '');
      if(params.get('escribanoId')) setUrlFilterEscribano(params.get('escribanoId') || '');
    }
  }, []);

  useEffect(() => {
    if (fechaActo && !editingItem) setFechaVto(addBusinessDays(new Date(fechaActo + 'T00:00:00'), 15));
  }, [fechaActo, editingItem]);

  useEffect(() => {
    if(!editingItem) setEscribanoId('');
  }, [registroId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, urlFilterRegistro, urlFilterEscribano]);

  // CÁLCULOS QUE RESPONDEN AL ARANCEL TIPIFICADO (AHORA EDITABLE)
  const numArancelTip = typeof aranceltip === 'number' ? aranceltip : 0;
  const rubroA = (inscripcion || 0) + (impuesto || 0) + (recargoSellos || 0) + (actividadesEconomicas || 0);
  const rubroB = numArancelTip * 0.12;
  const rubroC = numArancelTip * 0.07;
  const rubroD = 10000;
  const totalDJ = rubroA + rubroB + rubroC + rubroD;

  const registrosActivos = registros.filter(r => r.estado === 'Activo');
  const escribanosFiltrados = escribanos.filter(e => e.registroId === registroId);
  const escribanoSeleccionado = escribanos.find(e => e.id === escribanoId);

  const handleAddDetalle = () => {
    if (!currentArancelId || !currentMonto) return;
    const a = aranceles.find(a => a.id === currentArancelId);
    const m = parseFloat(currentMonto);
    const nuevosDetalles = [...detalles, { 
      arancel: a, arancelId: a.id, codigo: a.codigoRenta, descripcion: a.descripcion, 
      monto: m, cantidadAdicionales: 0, arancelCalculado: 0 
    }];
    
    // Calcular subtotal de actos normales
    const subtotalNormal = nuevosDetalles.reduce((sum, d) => {
      const tc = d.arancel?.tipoCalculo || 'NORMAL';
      if (tc === 'PORCENTAJE_SOBRE_TOTAL') return sum;
      return sum + calcularHonorario(d.monto, d.arancel, d.cantidadAdicionales || 0, nuevosDetalles.length);
    }, 0);
    
    // Aplicar porcentajes sobre total y calcular total
    const total = calcularTotalConPorcentaje(nuevosDetalles, subtotalNormal);
    
    // Asignar honorarios calculados
    nuevosDetalles.forEach(d => {
      const tc = d.arancel?.tipoCalculo || 'NORMAL';
      if (tc !== 'PORCENTAJE_SOBRE_TOTAL') {
        d.arancelCalculado = calcularHonorario(d.monto, d.arancel, d.cantidadAdicionales || 0, nuevosDetalles.length);
      }
    });
    
    setDetalles(nuevosDetalles);
    setAranceltip(total);
    
    setCurrentArancelId(''); setCurrentMonto(''); setArancelSearch('');
  };

  const handleUpdateAdicionales = (index: number, delta: number) => {
    const newDetalles = [...detalles];
    const current = newDetalles[index];
    const newCount = Math.max(0, (current.cantidadAdicionales || 0) + delta);
    current.cantidadAdicionales = newCount;
    
    const subtotalNormal = newDetalles.reduce((sum, d) => {
      const tc = d.arancel?.tipoCalculo || 'NORMAL';
      if (tc === 'PORCENTAJE_SOBRE_TOTAL') return sum;
      return sum + calcularHonorario(d.monto, d.arancel, d.cantidadAdicionales || 0, newDetalles.length);
    }, 0);
    
    newDetalles.forEach(d => {
      const tc = d.arancel?.tipoCalculo || 'NORMAL';
      if (tc !== 'PORCENTAJE_SOBRE_TOTAL') {
        d.arancelCalculado = calcularHonorario(d.monto, d.arancel, d.cantidadAdicionales || 0, newDetalles.length);
      }
    });
    
    const total = calcularTotalConPorcentaje(newDetalles, subtotalNormal);
    setDetalles(newDetalles);
    setAranceltip(total);
  };

  const handleRemoveDetalle = (index: number) => {
    const newDetalles = detalles.filter((_, i) => i !== index);
    
    const subtotalNormal = newDetalles.reduce((sum, d) => {
      const tc = d.arancel?.tipoCalculo || 'NORMAL';
      if (tc === 'PORCENTAJE_SOBRE_TOTAL') return sum;
      return sum + calcularHonorario(d.monto, d.arancel, d.cantidadAdicionales || 0, newDetalles.length);
    }, 0);
    
    newDetalles.forEach(d => {
      const tc = d.arancel?.tipoCalculo || 'NORMAL';
      if (tc !== 'PORCENTAJE_SOBRE_TOTAL') {
        d.arancelCalculado = calcularHonorario(d.monto, d.arancel, d.cantidadAdicionales || 0, newDetalles.length);
      }
    });
    
    const total = calcularTotalConPorcentaje(newDetalles, subtotalNormal);
    setDetalles(newDetalles);
    setAranceltip(total);
  };

  const handleOpenModal = () => {
    setEditingItem(null);
    setNumerodj(''); setCodigodj(''); setFechaActo(''); setFechaVto('');
    setInscripcion(0); setImpuesto(0); setRecargoSellos(0); setActividadesEconomicas(0);
    setRegistroId(''); setRegistroSearch(''); setEscribanoId(''); setDetalles([]);
    setAranceltip(0); // Limpia el arancel tipificado
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setNumerodj(item.numerodj); setCodigodj(item.codigodj || '');
    setFechaActo(formatDateForInput(item.fecha_acto)); setFechaVto(formatDateForInput(item.fecha_vto));
    setRegistroId(item.registroId); setRegistroSearch(item.registroId); setEscribanoId(item.escribanoId);
    setInscripcion(item.rubroA || 0); setImpuesto(0); setRecargoSellos(0); setActividadesEconomicas(0);
    
    setDetalles(item.detalles.map((d: any) => ({
      arancel: d.arancel, arancelId: d.arancelId, codigo: d.arancel?.codigoRenta, descripcion: d.arancel?.descripcion,
      monto: d.monto, cantidadAdicionales: 0, arancelCalculado: d.arancelCalculado
    })));
    
    // Carga el arancel tipificado que se guardo
    setAranceltip(item.aranceltip || 0);
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Estás seguro de eliminar esta Declaración Jurada?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/declaraciones?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Declaración eliminada correctamente', timer: 2000, showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false });
      fetchData();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar', confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
    }
  };

  const handleSave = async () => {
    if (!numerodj || !registroId || !escribanoId || detalles.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Completa los datos obligatorios y agrega al menos un acto.', confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
      return;
    }
    setIsSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = { 
        id: editingItem?.id, 
        numerodj, 
        codigodj, 
        fecha_acto: fechaActo, 
        fecha_vto: fechaVto, 
        registroId, 
        escribanoId, 
        aranceltip: numArancelTip, // Se envía el valor (ya sea manual o auto)
        rubroA, 
        rubroB, 
        rubroC, 
        rubroD, 
        total: totalDJ, 
        detalles 
      };
      const res = await fetch('/api/declaraciones', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar');
      }
      Swal.fire({ icon: 'success', title: 'Éxito', text: editingItem ? 'Declaración actualizada' : 'Declaración registrada', timer: 2000, showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false });
      setIsModalOpen(false); fetchData();
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
    } finally {
      setIsSaving(false);
    }
  };

  // --- LÓGICA PARA MODAL DE PAGO ---
  const handleOpenPayModal = () => {
    setPayDate(new Date().toISOString().split('T')[0]);
    setSelectedDjsToPay([]);
    setDjSearchToPay('');
    setIsPayModalOpen(true);
  };

  const handlePayDjs = async () => {
    if (selectedDjsToPay.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Selecciona al menos una DJ para registrar el pago.', confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
      return;
    }
    if (!payDate) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'La fecha de pago es obligatoria.', confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
      return;
    }

    setIsProcessingPay(true);
    try {
      const djIds = selectedDjsToPay.map(dj => dj.id);
      const res = await fetch('/api/declaraciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ djIds, fecha_pago: payDate }),
      });
      
      if (!res.ok) throw new Error('Error al procesar el pago');
      
      Swal.fire({ icon: 'success', title: 'Pagos Registrados', text: 'Se actualizaron las fechas de pago correctamente.', timer: 2000, showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false });
      setIsPayModalOpen(false);
      fetchData(); 
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
    } finally {
      setIsProcessingPay(false);
    }
  };

  const unpaidDjs = declaraciones.filter(d => !d.fecha_pago);
  const filteredUnpaidDjs = unpaidDjs.filter(d => 
    d.numerodj.toLowerCase().includes(djSearchToPay.toLowerCase()) && 
    !selectedDjsToPay.find(selected => selected.id === d.id)
  );
  const totalToPay = selectedDjsToPay.reduce((sum, dj) => sum + dj.total, 0);

  // --- LÓGICA PARA DESCARGA DE EXCEL ---
  const handleDownloadExcel = () => {
    if (!excelDate) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione una fecha.', confirmButtonText: 'Aceptar' });
      return;
    }

    const targetDate = new Date(excelDate + 'T00:00:00').getTime();
    const djsDelDia = declaraciones.filter(dj => {
      if (!dj.fecha_pago) return false;
      const payDate = new Date(dj.fecha_pago);
      payDate.setHours(0, 0, 0, 0);
      return payDate.getTime() === targetDate;
    });

    if (djsDelDia.length === 0) {
      Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay declaraciones pagadas en esta fecha.', confirmButtonText: 'Aceptar' });
      return;
    }

    // Construir filas del Excel
    const excelRows: any[] = [];

    djsDelDia.forEach(dj => {
      const detallesStr = dj.detalles?.map((d: any) => `${d.arancel?.codigo || ''} - ${d.arancel?.descripcion || ''}`).join(' | ') || '';

      excelRows.push({
        'Registro': dj.registro?.numero || dj.registroId || '',
        'Escribano': dj.escribano?.nombre || '',
        'N° Escritura': dj.numerodj || '',
        'Detalle Declaración': detallesStr,
        'Rubro A': dj.rubroA || 0,
        'Rubro B': dj.rubroB || 0,
        'Rubro C': dj.rubroC || 0,
        'Rubro D': dj.rubroD || 0,
        'Total': dj.total || 0,
        'Fecha DJ': new Date(dj.fecha_acto).toLocaleDateString('es-AR'),
        'Fecha Vto': new Date(dj.fecha_vto).toLocaleDateString('es-AR'),
        'Fecha Pago': dj.fecha_pago ? new Date(dj.fecha_pago).toLocaleDateString('es-AR') : '',
      });
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 },  // Registro
      { wch: 30 },  // Escribano
      { wch: 14 },  // N° Escritura
      { wch: 50 },  // Detalle
      { wch: 14 },  // Rubro A
      { wch: 14 },  // Rubro B
      { wch: 14 },  // Rubro C
      { wch: 14 },  // Rubro D
      { wch: 14 },  // Total
      { wch: 14 },  // Fecha DJ
      { wch: 14 },  // Fecha Vto
      { wch: 14 },  // Fecha Pago
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Declaraciones');

    const fileName = `Declaraciones_${excelDate.replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    Swal.fire({ icon: 'success', title: 'Descargado', text: `${djsDelDia.length} declaraciones exportadas.`, timer: 2000, showConfirmButton: false });
    setIsExcelModalOpen(false);
  };
  const dailyPaidDjs = useMemo(() => {
    if (!dailyReportDate) return [];
    const targetDate = new Date(dailyReportDate + 'T00:00:00').getTime();
    
    return declaraciones.filter(dj => {
      if (!dj.fecha_pago) return false;
      const payDate = new Date(dj.fecha_pago);
      payDate.setHours(0,0,0,0);
      return payDate.getTime() === targetDate;
    });
  }, [declaraciones, dailyReportDate]);

  const dailyTotalLiquidado = dailyPaidDjs.reduce((sum, dj) => sum + dj.total, 0);
  const dailyTotalColegio = dailyPaidDjs.reduce((sum, dj) => sum + ((dj.rubroB || 0) + (dj.rubroC || 0) + (dj.rubroD || 0)), 0);

  const handlePrintDailyReport = () => {
    if (dailyPaidDjs.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'No hay declaraciones pagadas en esta fecha para imprimir.', confirmButtonText: 'Aceptar', allowOutsideClick: false, allowEscapeKey: false });
      return;
    }

    const tableRows = dailyPaidDjs.map(dj => {
      const colegio = (dj.rubroB || 0) + (dj.rubroC || 0) + (dj.rubroD || 0);
      return `
        <tr>
          <td><strong>${dj.numerodj}</strong></td>
          <td>Reg. ${dj.registroId}</td>
          <td>${dj.escribano?.nombre || ''}</td>
          <td class="text-right">${formatMoney(colegio)}</td>
          <td class="text-right font-bold text-green-700">${formatMoney(dj.total)}</td>
        </tr>
      `;
    }).join('');

    const printContent = `
      <html>
        <head>
          <title>Reporte de Recaudación Diaria</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; color: #2563eb; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-green-700 { color: #15803d; }
            .summary { width: 350px; float: right; background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; }
            .summary-total { font-size: 18px; font-weight: bold; border-top: 2px solid #93c5fd; padding-top: 15px; margin-top: 15px; color: #1e3a8a; }
            .clear { clear: both; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Reporte de Recaudación Diaria</h1>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Detalle de Declaraciones Juradas Pagadas</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 18px;">Fecha: <strong>${new Date(dailyReportDate + 'T00:00:00').toLocaleDateString('es-AR')}</strong></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nº DJ</th>
                <th>Registro</th>
                <th>Escribano</th>
                <th class="text-right">Recaudación Colegio<br><small>(Rubros B+C+D)</small></th>
                <th class="text-right">Total Liquidado</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="summary">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #1e3a8a;">Resumen del Día</h3>
            <div class="summary-row"><span style="color: #1e40af;">DJ Pagadas:</span> <strong>${dailyPaidDjs.length}</strong></div>
            <div class="summary-row"><span style="color: #1e40af;">Total Recaudado (Colegio):</span> <strong>${formatMoney(dailyTotalColegio)}</strong></div>
            <div class="summary-row summary-total"><span>Total Ingresos Generales:</span> <span>${formatMoney(dailyTotalLiquidado)}</span></div>
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

  const clearFilters = () => {
    setUrlFilterRegistro(''); setUrlFilterEscribano('');
    window.history.replaceState({}, '', window.location.pathname);
  };

  const formatMoney = (val: number) => `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const declaracionesFiltradas = declaraciones.filter(d => {
    const matchSearch = (d.numerodj || '').includes(searchTerm);
    const matchReg = urlFilterRegistro ? d.registroId === urlFilterRegistro : true;
    const matchEsc = urlFilterEscribano ? d.escribanoId === urlFilterEscribano : true;
    return matchSearch && matchReg && matchEsc;
  });
  const currentDeclaraciones = declaracionesFiltradas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <DashboardLayout role={role} title="Declaraciones Juradas">
      <Card className="border-0 shadow-sm flex flex-col min-h-[60vh] lg:h-[calc(100vh-12rem)]">
        <CardHeader className="px-4 sm:px-6 py-4 border-b border-gray-100 flex-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto min-w-0">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input placeholder="Buscar por Nº DJ..." className="pl-9 focus-visible:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              {(urlFilterRegistro || urlFilterEscribano) && (
                <Badge variant="secondary" className="bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 flex items-center gap-1" onClick={clearFilters} title="Limpiar Filtro">
                  Filtrado <FilterX className="w-3 h-3 ml-1" />
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" className="shrink-0" onClick={fetchData}><RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
                
                <Button onClick={() => setIsExcelModalOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto">
                  <Download className="w-4 h-4" /> Descargar Excel
                </Button>

                <Button onClick={() => setIsDailyReportModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                  <CalendarDays className="w-4 h-4" /> Reporte Diario
                </Button>

                <Button onClick={handleOpenPayModal} className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                  <CreditCard className="w-4 h-4" /> Pagar DJ
                </Button>
                
                <Button onClick={handleOpenModal} className="gap-2 bg-primary hover:bg-primary/90 text-white w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Nueva DJ
                </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Nº DJ</TableHead>
                  <TableHead>Registro / Escribano</TableHead>
                  <TableHead>Fecha Acto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentDeclaraciones.map(item => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium"><Badge variant="outline" className="bg-white">{item.numerodj}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">Reg. {item.registro?.numero}</div>
                      <div className="text-xs text-gray-500">{item.escribano?.nombre}</div>
                    </TableCell>
                    <TableCell>{new Date(item.fecha_acto).toLocaleDateString('es-AR')}</TableCell>
                    
                    <TableCell>
                      {item.fecha_pago ? (
                         <Badge className="bg-green-100 text-green-800 border-green-200 shadow-none font-medium">Pagada</Badge>
                      ) : (
                         <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 shadow-none">Pendiente</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-bold text-gray-900">{formatMoney(item.total)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => {setViewingItem(item); setIsViewModalOpen(true);}} title="Ver DJ"><Eye className="w-4 h-4 text-gray-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Editar"><Edit className="w-4 h-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Eliminar"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {currentDeclaraciones.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No hay declaraciones registradas.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && declaracionesFiltradas.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalItems={declaracionesFiltradas.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      {/* MODAL DESCARGAR EXCEL */}
      <Dialog open={isExcelModalOpen} onOpenChange={setIsExcelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-amber-600" />
              Descargar Declaraciones en Excel
            </DialogTitle>
            <DialogDescription>
              Seleccione la fecha de pago para exportar las declaraciones juradas pagadas en ese día.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fecha de Pago</Label>
              <Input type="date" value={excelDate} onChange={(e) => setExcelDate(e.target.value)} className="focus-visible:ring-amber-600" />
            </div>
            {excelDate && (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                Se exportarán las declaraciones pagadas el: <strong>{new Date(excelDate + 'T00:00:00').toLocaleDateString('es-AR')}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExcelModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleDownloadExcel} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Download className="w-4 h-4" /> Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL REPORTE DIARIO DE RECAUDACIÓN */}
      <Dialog open={isDailyReportModalOpen} onOpenChange={setIsDailyReportModalOpen}>
        <DialogTitle className="sr-only">Reporte Diario</DialogTitle>
                  <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] lg:max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">

          <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b bg-blue-600">
            <h2 className="text-base sm:text-xl font-semibold text-white flex items-center gap-2"><CalendarDays className="w-5 h-5"/> Reporte Diario de Recaudación</h2>
            <button onClick={() => setIsDailyReportModalOpen(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label className="text-gray-700 font-semibold">Seleccione la Fecha de Pago</Label>
                <Input type="date" value={dailyReportDate} onChange={(e) => setDailyReportDate(e.target.value)} className="focus-visible:ring-blue-600 max-w-sm" />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Nº DJ</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Escribano</TableHead>
                      <TableHead className="text-right">Recaudación Colegio (B+C+D)</TableHead>
                      <TableHead className="text-right text-green-700">Total Liquidado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyPaidDjs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay declaraciones registradas como pagadas en esta fecha.</TableCell></TableRow>
                    ) : (
                      dailyPaidDjs.map((dj) => {
                        const recCol = (dj.rubroB || 0) + (dj.rubroC || 0) + (dj.rubroD || 0);
                        return (
                          <TableRow key={dj.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium text-gray-900">{dj.numerodj}</TableCell>
                            <TableCell className="text-gray-600">Reg. {dj.registroId}</TableCell>
                            <TableCell className="text-gray-600">{dj.escribano?.nombre}</TableCell>
                            <TableCell className="text-right font-medium text-gray-700">{formatMoney(recCol)}</TableCell>
                            <TableCell className="text-right font-bold text-green-700">{formatMoney(dj.total)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {dailyPaidDjs.length > 0 && (
              <div className="mt-6 flex flex-col md:flex-row justify-end gap-6">
                <Card className="shadow-sm border-blue-200 bg-blue-50 md:w-96">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="font-semibold text-blue-900 border-b border-blue-200 pb-2 mb-3">Resumen de Recaudación</h4>
                    <div className="flex justify-between text-sm"><span className="text-blue-800">Cantidad de DJ Pagadas:</span><span className="font-bold text-blue-900">{dailyPaidDjs.length}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-blue-800">Total Recaudado (Colegio):</span><span className="font-bold text-blue-900">{formatMoney(dailyTotalColegio)}</span></div>
                    <div className="h-px bg-blue-200 my-2"></div>
                    <div className="flex justify-between items-center"><span className="text-lg font-bold text-blue-900">Total General:</span><span className="text-2xl font-black text-green-700">{formatMoney(dailyTotalLiquidado)}</span></div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-4 sm:px-6 py-4 border-t bg-white flex-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDailyReportModalOpen(false)}>Cerrar</Button>
            <Button onClick={handlePrintDailyReport} disabled={dailyPaidDjs.length === 0} className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="w-4 h-4" /> Imprimir Reporte
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAR PAGO DE DJ */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogTitle className="sr-only">Registrar Pago de DJ</DialogTitle>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-2xl flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
          
          <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b bg-green-600">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2"><CreditCard className="w-5 h-5"/> Registrar Pagos</h2>
            <button onClick={() => setIsPayModalOpen(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="p-4 sm:p-6 space-y-6 bg-gray-50/50">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="space-y-2">
                <Label>Fecha del Pago</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="focus-visible:ring-green-600" />
              </div>
              
              <div className="space-y-2 relative">
                <Label>Buscar DJ (Pendientes)</Label>
                <div className="relative">
                  <Input 
                    value={djSearchToPay} 
                    onChange={(e) => { setDjSearchToPay(e.target.value); setIsDjPayDropdownOpen(true); }} 
                    onFocus={() => setIsDjPayDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDjPayDropdownOpen(false), 200)}
                    placeholder="Escriba el número de DJ..." 
                    className="focus-visible:ring-green-600"
                  />
                </div>
                {isDjPayDropdownOpen && djSearchToPay && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredUnpaidDjs.length > 0 ? (
                      filteredUnpaidDjs.map(dj => (
                        <div key={dj.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-50"
                          onClick={() => {
                            setSelectedDjsToPay([...selectedDjsToPay, dj]);
                            setDjSearchToPay('');
                            setIsDjPayDropdownOpen(false);
                          }}>
                          <div>
                            <span className="text-sm font-semibold block">DJ N° {dj.numerodj}</span>
                            <span className="text-xs text-gray-500">Reg. {dj.registroId}</span>
                          </div>
                          <span className="text-sm font-medium text-green-700">{formatMoney(dj.total)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-gray-500 text-center">No se encontraron DJs pendientes</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Declaraciones seleccionadas para pagar</h3>
              <div className="border border-gray-200 rounded-lg bg-white max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead>N° DJ</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Total Liquidado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDjsToPay.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400 text-sm">Agregue DJs usando el buscador superior</TableCell></TableRow>
                    ) : (
                      selectedDjsToPay.map(dj => (
                        <TableRow key={dj.id}>
                          <TableCell className="font-medium">{dj.numerodj}</TableCell>
                          <TableCell className="text-gray-600">Reg. {dj.registroId}</TableCell>
                          <TableCell className="text-right font-medium">{formatMoney(dj.total)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setSelectedDjsToPay(selectedDjsToPay.filter(d => d.id !== dj.id))}><Trash2 className="w-4 h-4"/></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-100">
                <span className="text-sm font-medium text-green-800">Total a procesar ({selectedDjsToPay.length} DJs):</span>
                <span className="text-xl font-bold text-green-700">{formatMoney(totalToPay)}</span>
              </div>
            </div>

          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-4 sm:px-6 py-4 border-t bg-white flex-none">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsPayModalOpen(false)}>Cancelar</Button>
            <Button onClick={handlePayDjs} disabled={isProcessingPay || selectedDjsToPay.length === 0} className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white min-w-[160px]">
              {isProcessingPay ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Pagos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR / EDITAR DJ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTitle className="sr-only">{editingItem ? 'Editar' : 'Nueva'} Declaración Jurada</DialogTitle>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] lg:max-w-6xl h-[95vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
          
          <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b bg-primary">
            <h2 className="text-lg sm:text-2xl font-semibold text-white">{editingItem ? 'Editar' : 'Crear'} Declaración Jurada</h2>
            <button onClick={() => setIsModalOpen(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Información General</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <label className="block text-sm font-medium text-gray-700">Registro Notarial *</label>
                    <div className="relative">
                      <Input value={registroSearch} onChange={(e) => { setRegistroSearch(e.target.value); setIsRegistroDropdownOpen(true); if (e.target.value === '') setRegistroId(''); }} onFocus={() => setIsRegistroDropdownOpen(true)} onBlur={() => setTimeout(() => setIsRegistroDropdownOpen(false), 200)} placeholder="Buscar registro por número..." className="bg-white focus-visible:ring-primary" />
                      {registroId && registroSearch === registroId && (<div className="absolute right-3 top-2.5 text-primary"><CheckCircle2 className="w-5 h-5" /></div>)}
                    </div>
                    {isRegistroDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {registrosActivos.filter(r => r.numero.toLowerCase().includes(registroSearch.toLowerCase())).map(reg => (
                            <div key={reg.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex flex-col border-b border-gray-50" onClick={() => { setRegistroId(reg.numero); setRegistroSearch(reg.numero); setIsRegistroDropdownOpen(false); }}>
                              <span className="text-sm font-semibold">{reg.numero}</span><span className="text-xs text-gray-500">{reg.direccion}, {reg.localidad}</span>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escribano *</label>
                    <Select value={escribanoId} onValueChange={setEscribanoId} disabled={!registroId}>
                      <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary h-auto"><SelectValue placeholder={registroId ? "Seleccionar escribano" : "Seleccione primero un registro"} /></SelectTrigger>
                      <SelectContent>{escribanosFiltrados.map(e => (<SelectItem key={e.id} value={e.id}>{e.condicion}-{e.nombre}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  {escribanoSeleccionado && (
                    <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-md flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full"><User className="w-4 h-4 text-primary"/></div>
                      <div className="text-xs text-gray-700 space-y-1"><p className="font-semibold text-gray-900">{escribanoSeleccionado.nombre}</p><p>Matrícula: <span className="font-medium text-primary">{escribanoSeleccionado.matricula}</span></p><p>DNI: <span className="font-medium text-primary">{escribanoSeleccionado.dni}</span></p></div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Número de DJ *</label><input type="text" placeholder="Ej. 123456" value={numerodj} onChange={(e) => setNumerodj(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Código DJ</label><input type="text" placeholder="Ej. A1" value={codigodj} onChange={(e) => setCodigodj(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Acto *</label><input type="date" value={fechaActo} onChange={(e) => setFechaActo(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">Vencimiento <span className="text-[10px] text-primary/70 font-normal mt-1">(+15 días)</span></label><input type="date" value={fechaVto} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 outline-none cursor-not-allowed" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Detalle de Actos (Aranceles)</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arancel</label>
                  <div className="relative">
                    <Input value={arancelSearch} onChange={(e) => { setArancelSearch(e.target.value); setIsArancelDropdownOpen(true); if (e.target.value === '') setCurrentArancelId(''); }} onFocus={() => setIsArancelDropdownOpen(true)} onBlur={() => setTimeout(() => setIsArancelDropdownOpen(false), 200)} placeholder="Buscar por código o descripción..." className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md h-[42px] focus-visible:ring-primary" />
                  </div>
                  {isArancelDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {aranceles.filter(a => a.codigoRenta.toLowerCase().includes(arancelSearch.toLowerCase()) || a.descripcion.toLowerCase().includes(arancelSearch.toLowerCase())).map(a => (
                          <div key={a.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex flex-col border-b border-gray-50" onClick={() => { setCurrentArancelId(a.id); setArancelSearch(`${a.codigoRenta} - ${a.descripcion}`); setIsArancelDropdownOpen(false); }}>
                            <span className="text-sm font-semibold">{a.codigoRenta}</span><span className="text-xs text-gray-500 line-clamp-1">{a.descripcion}</span>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-full sm:w-48"><label className="block text-sm font-medium text-gray-700 mb-1">Monto Base ($)</label><input type="number" placeholder="0.00" value={currentMonto} onChange={(e) => setCurrentMonto(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-[42px]" /></div>
                <button onClick={handleAddDetalle} className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors h-[42px]">Agregar Acto</button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100">
                    <tr><th className="px-4 py-3 text-sm font-semibold text-gray-700 w-24">Código</th><th className="px-4 py-3 text-sm font-semibold text-gray-700">Descripción</th><th className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Monto Declarado</th><th className="px-4 py-3 text-sm font-semibold text-gray-700 text-center w-32">Adicionales</th><th className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Honorario</th><th className="px-4 py-3 w-12"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {detalles.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-sm text-center text-gray-500">Aún no has agregado ningún acto.</td></tr>
                    ) : (
                      detalles.map((d, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.codigo}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.descripcion}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatMoney(d.monto)}</td>
                          <td className="px-4 py-3 text-center align-middle">
                            {d.arancel?.adicional ? (
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleUpdateAdicionales(index, -1)} disabled={!d.cantidadAdicionales} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"><Minus className="w-3 h-3" /></button>
                                <span className="text-sm font-medium w-4 text-center">{d.cantidadAdicionales || 0}</span>
                                <button onClick={() => handleUpdateAdicionales(index, 1)} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"><Plus className="w-3 h-3" /></button>
                              </div>
                            ) : (<span className="text-gray-400">-</span>)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-primary">{formatMoney(d.arancelCalculado)}</td>
                          <td className="px-4 py-3 text-right"><button onClick={() => handleRemoveDetalle(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 flex flex-col lg:flex-row gap-8 justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Cargos Adicionales (Rubro A)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Inscripción ($)</label><input type="number" value={inscripcion || ''} onChange={(e) => setInscripcion(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Impuesto ($)</label><input type="number" value={impuesto || ''} onChange={(e) => setImpuesto(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Recargo Sellos ($)</label><input type="number" value={recargoSellos || ''} onChange={(e) => setRecargoSellos(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Activ. Económicas ($)</label><input type="number" value={actividadesEconomicas || ''} onChange={(e) => setActividadesEconomicas(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary" /></div>
                </div>
              </div>
              <div className="w-full lg:w-96 space-y-3">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Desglose de Liquidación</h3>
                
                {/* ESTE ES EL NUEVO INPUT EDITABLE PARA ARANCEL TIPIFICADO */}
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-600 text-sm">Arancel Tipificado:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input 
                      type="number" 
                      value={aranceltip} 
                      onChange={(e) => setAranceltip(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                      className="w-32 pl-6 pr-3 py-1 text-right bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-medium text-gray-900 transition-shadow"
                    />
                  </div>
                </div>

                <div className="flex justify-between py-1"><span className="text-gray-600 text-sm">Total Rubro A:</span><span className="font-medium text-gray-900">{formatMoney(rubroA)}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600 text-sm">Aporte Col. (Rubro B 12%):</span><span className="font-medium text-primary">{formatMoney(rubroB)}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600 text-sm">Caja Jubilación (Rubro C 7%):</span><span className="font-medium text-primary">{formatMoney(rubroC)}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600 text-sm">Fijo (Rubro D):</span><span className="font-medium text-gray-900">{formatMoney(rubroD)}</span></div>
                <div className="h-px bg-gray-300 my-4"></div>
                <div className="flex justify-between items-center py-4 bg-primary text-white px-4 rounded-md shadow-sm">
                  <span className="text-lg font-semibold">Total a Pagar:</span><span className="text-2xl font-bold">{formatMoney(totalDJ)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 flex-none">
            <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100">Cancelar</button>
            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary/90 flex items-center justify-center min-w-[160px]">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingItem ? 'Actualizar DJ' : 'Guardar DJ')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VER DJ INDIVIDUAL (Solo Lectura) */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogTitle className="sr-only">Ver Declaración Jurada</DialogTitle>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] lg:max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
          
          <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-50">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-900">Detalle de Declaración Jurada</h2>
            <button onClick={() => setIsViewModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>

          {viewingItem && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="shadow-sm border-gray-200 col-span-2"><CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full"><Building2 className="w-6 h-6 text-primary"/></div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Escribanía y Registro</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{viewingItem.escribano?.nombre}</p>
                      <p className="text-sm text-gray-600">Registro N° {viewingItem.registro?.numero} - Matrícula: {viewingItem.escribano?.matricula}</p>
                    </div>
                  </div>
                </CardContent></Card>
                <Card className="shadow-sm border-gray-200"><CardContent className="p-5 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">DJ Número</p>
                      <p className="text-2xl font-black text-primary mt-1">{viewingItem.numerodj}</p>
                      <p className="text-sm text-gray-600 mt-1">Cód: {viewingItem.codigodj || '-'}</p>
                    </div>
                    {/* Badge de Pago en el detalle */}
                    {viewingItem.fecha_pago ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 font-bold px-3 py-1">PAGADA</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 font-bold px-3 py-1">PENDIENTE</Badge>
                    )}
                  </div>
                </CardContent></Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                  <span className="text-sm text-gray-500 font-medium">Fecha de Acto</span>
                  <span className="font-semibold text-gray-900">{new Date(viewingItem.fecha_acto).toLocaleDateString('es-AR')}</span>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex justify-between items-center shadow-sm">
                  <span className="text-sm text-orange-600 font-medium">Fecha de Vencimiento</span>
                  <span className="font-semibold text-orange-700">{new Date(viewingItem.fecha_vto).toLocaleDateString('es-AR')}</span>
                </div>
              </div>

              {/* Si está pagada, mostramos la info de pago */}
              {viewingItem.fecha_pago && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex justify-between items-center shadow-sm mb-6">
                  <span className="text-sm text-green-700 font-medium flex items-center gap-2"><CreditCard className="w-4 h-4"/> Fecha de Pago Acreditado</span>
                  <span className="font-bold text-green-800">{new Date(viewingItem.fecha_pago).toLocaleDateString('es-AR')}</span>
                </div>
              )}

              <Card className="shadow-sm border-gray-200 mb-6"><CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-100"><TableRow><TableHead>Código</TableHead><TableHead>Descripción del Trámite</TableHead><TableHead className="text-right">Monto Declarado</TableHead><TableHead className="text-right">Honorario Calc.</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewingItem.detalles?.map((d: any, index: number) => (
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
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Arancel Tipificado:</span><span className="font-medium text-gray-900">{formatMoney(viewingItem.aranceltip)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Total Rubro A:</span><span className="font-medium text-gray-900">{formatMoney(viewingItem.rubroA)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Aporte Col. (Rubro B 12%):</span><span className="font-medium text-gray-900">{formatMoney(viewingItem.rubroB)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Caja Jubilación (Rubro C 7%):</span><span className="font-medium text-gray-900">{formatMoney(viewingItem.rubroC)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Fijo (Rubro D):</span><span className="font-medium text-gray-900">{formatMoney(viewingItem.rubroD)}</span></div>
                  <div className="h-px bg-gray-200 my-3"></div>
                  <div className="flex justify-between items-center"><span className="text-lg font-bold text-gray-900">Total:</span><span className="text-2xl font-black text-primary">{formatMoney(viewingItem.total)}</span></div>
                </CardContent></Card>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}