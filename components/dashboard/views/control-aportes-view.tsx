'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, CheckCircle, XCircle, Search, ChevronDown, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

interface AporteEscribano {
  id: string;
  nombre: string;
  matricula: string;
  cuit: string | null;
  dni: string;
  estado: string;
  totalDeclaraciones: number;
  totalAportado: number;
  totalGeneral: number;
  diferencia: number;
  cumpleMinimo: boolean;
  declaraciones: Array<{
    id: string;
    numerodj: string;
    fecha_acto: string;
    fecha_pago: string | null;
    rubroA: number;
    rubroB: number;
    rubroC: number;
    rubroD: number;
    total: number;
  }>;
}

const formatMoney = (val: number) =>
  `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ControlAportesView({ role }: { role: 'ADMIN' }) {
  const [escribanos, setEscribanos] = useState<any[]>([]);
  const [aporteData, setAporteData] = useState<AporteEscribano[]>([]);
  const [isLoadingAportes, setIsLoadingAportes] = useState(false);
  const [selectedEscribanoId, setSelectedEscribanoId] = useState('todos');
  const [aporteMinimo, setAporteMinimo] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [searchEscribano, setSearchEscribano] = useState('');
  const [isEscribanoDropdownOpen, setIsEscribanoDropdownOpen] = useState(false);
  const [aporteProgress, setAporteProgress] = useState<{ isOpen: boolean; current: number; total: number; stage: string }>({ isOpen: false, current: 0, total: 0, stage: '' });
  const [aportePage, setAportePage] = useState(1);
  const APORTES_PER_PAGE = 10;

  useEffect(() => {
    fetch('/api/escribanos')
      .then(res => res.json())
      .then(data => setEscribanos(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-escribano-dropdown]')) {
        setIsEscribanoDropdownOpen(false);
      }
    };
    if (isEscribanoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEscribanoDropdownOpen]);

  const fetchAportes = async () => {
    if (!periodoInicio || !periodoFin || !aporteMinimo) {
      Swal.fire({ icon: 'warning', title: 'Atencion', text: 'Completa todos los campos (periodo y monto minimo)', confirmButtonText: 'Aceptar' });
      return;
    }

    const res = await fetch(`/api/escribanos`);
    if (!res.ok) throw new Error('Error');
    const allEscribanos = await res.json();

    const escribanosFiltrados = selectedEscribanoId === 'todos'
      ? allEscribanos.filter((e: any) => e.estado === 'Activo')
      : allEscribanos.filter((e: any) => e.id === selectedEscribanoId);

    setIsLoadingAportes(true);
    setAporteProgress({ isOpen: true, current: 0, total: escribanosFiltrados.length, stage: 'Iniciando...' });

    try {
      const resultados: AporteEscribano[] = [];
      const minimoEsperado = parseFloat(aporteMinimo);

      for (let i = 0; i < escribanosFiltrados.length; i++) {
        const esc = escribanosFiltrados[i];
        setAporteProgress({ isOpen: true, current: i + 1, total: escribanosFiltrados.length, stage: `Procesando ${esc.nombre}...` });

        const resDJ = await fetch(`/api/declaraciones`);
        const djs = resDJ.ok ? await resDJ.json() : [];
        const djsEscribano = djs.filter((dj: any) =>
          dj.escribanoId === esc.id &&
          dj.fecha_pago !== null &&
          new Date(dj.fecha_acto) >= new Date(periodoInicio) &&
          new Date(dj.fecha_acto) <= new Date(periodoFin)
        );

        const totalAportado = djsEscribano.reduce((s: number, d: any) => s + d.rubroB + d.rubroC + d.rubroD, 0);
        const totalGeneral = djsEscribano.reduce((s: number, d: any) => s + d.total, 0);
        const diferencia = totalAportado - minimoEsperado;
        const cumpleMinimo = diferencia >= 0;

        resultados.push({
          id: esc.id,
          nombre: esc.nombre,
          matricula: esc.matricula,
          cuit: esc.cuit,
          dni: esc.dni,
          estado: esc.estado,
          totalDeclaraciones: djsEscribano.length,
          totalAportado,
          totalGeneral,
          diferencia,
          cumpleMinimo,
          declaraciones: djsEscribano,
        });
      }

      setAporteProgress({ isOpen: true, current: escribanosFiltrados.length, total: escribanosFiltrados.length, stage: 'Finalizando...' });
      setAporteData(resultados);
      setAportePage(1);

      setTimeout(() => {
        setAporteProgress({ isOpen: false, current: 0, total: 0, stage: '' });
      }, 500);
    } catch (e) {
      setAporteProgress({ isOpen: false, current: 0, total: 0, stage: '' });
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el informe', confirmButtonText: 'Aceptar' });
    } finally {
      setIsLoadingAportes(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Caja de Previsión de Caja de Escribanos de Salta', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const fechaHora = `Generado el: ${now.toLocaleDateString('es-AR')} a las ${now.toLocaleTimeString('es-AR')}`;
    doc.text(fechaHora, pageWidth / 2, 28, { align: 'center' });

    const tableData = aporteData.map(a => [
      a.nombre,
      a.matricula,
      a.totalDeclaraciones.toString(),
      formatMoney(a.totalAportado),
      formatMoney(a.diferencia),
      a.cumpleMinimo ? 'Cumple' : 'No Cumple'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Escribano', 'Matrícula', 'Declaraciones', 'Total Aportado', 'Diferencia', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [88, 28, 28], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const value = data.cell.raw;
          if (value === 'No Cumple') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index === 4) {
          const rawValue = aporteData[data.row.index].diferencia;
          if (rawValue < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      }
    });

    doc.save(`Control_Aportes_${now.toISOString().split('T')[0]}.pdf`);
  };

  const filteredEscribanos = escribanos.filter(e =>
    e.nombre.toLowerCase().includes(searchEscribano.toLowerCase()) ||
    e.matricula.includes(searchEscribano) ||
    (e.cuit && e.cuit.includes(searchEscribano))
  );

  return (
    <DashboardLayout role={role} title="Control de Aportes">
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-lg">Generar Informe de Control de Aportes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label>Fecha Inicio</Label>
                <Input type="date" className="mt-1" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
              </div>
              <div>
                <Label>Fecha Fin</Label>
                <Input type="date" className="mt-1" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} />
              </div>
              <div>
                <Label>Monto Minimo de Aporte ($)</Label>
                <Input type="number" className="mt-1" placeholder="Ej: 50000" value={aporteMinimo} onChange={(e) => setAporteMinimo(e.target.value)} />
              </div>
              <div>
                <Label>Escribano</Label>
                <div className="relative mt-1" data-escribano-dropdown>
                  <button
                    type="button"
                    onClick={() => setIsEscribanoDropdownOpen(!isEscribanoDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span className="truncate">
                      {selectedEscribanoId === 'todos'
                        ? 'Todos los activos'
                        : escribanos.find(e => e.id === selectedEscribanoId)?.nombre || 'Seleccionar...'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {isEscribanoDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar escribano..."
                            className="pl-8 h-8 text-sm"
                            value={searchEscribano}
                            onChange={(e) => setSearchEscribano(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setSelectedEscribanoId('todos'); setIsEscribanoDropdownOpen(false); setSearchEscribano(''); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${selectedEscribanoId === 'todos' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        >
                          Todos los activos
                        </button>
                        {filteredEscribanos.filter(e => e.estado === 'Activo').map(e => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => { setSelectedEscribanoId(e.id); setIsEscribanoDropdownOpen(false); setSearchEscribano(''); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${selectedEscribanoId === e.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
                          >
                            {e.nombre} (Mat. {e.matricula})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchAportes} disabled={isLoadingAportes} className="flex-1">
                  {isLoadingAportes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Generar Informe
                </Button>
                {aporteData.length > 0 && (
                  <Button variant="outline" onClick={handleDownloadPDF} title="Descargar PDF">
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {aporteData.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-sm"><CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Escribanos Analizados</p>
                <p className="text-3xl font-bold text-gray-900">{aporteData.length}</p>
              </CardContent></Card>
              <Card className="shadow-sm border-green-200 bg-green-50/30"><CardContent className="p-4 text-center">
                <p className="text-sm text-green-600">Cumplen Minimo</p>
                <p className="text-3xl font-bold text-green-700">{aporteData.filter(a => a.cumpleMinimo).length}</p>
              </CardContent></Card>
              <Card className="shadow-sm border-red-200 bg-red-50/30"><CardContent className="p-4 text-center">
                <p className="text-sm text-red-600">No Cumplen</p>
                <p className="text-3xl font-bold text-red-700">{aporteData.filter(a => !a.cumpleMinimo).length}</p>
              </CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Total Aportado</p>
                <p className="text-3xl font-bold text-purple-700">{formatMoney(aporteData.reduce((s, a) => s + a.totalAportado, 0))}</p>
              </CardContent></Card>
            </div>

            <Card className="shadow-sm">
              <CardHeader><CardTitle>Detalle por Escribano</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Escribano</TableHead>
                        <TableHead>Matricula</TableHead>
                        <TableHead className="text-right">Declaraciones</TableHead>
                        <TableHead className="text-right">Total Aportado (B+C+D)</TableHead>
                        <TableHead className="text-right">Diferencia vs Minimo</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aporteData
                        .slice((aportePage - 1) * APORTES_PER_PAGE, aportePage * APORTES_PER_PAGE)
                        .map(a => (
                          <TableRow key={a.id} className={!a.cumpleMinimo ? 'bg-red-50/30' : ''}>
                            <TableCell className="font-medium">{a.nombre}</TableCell>
                            <TableCell className="text-sm">{a.matricula}</TableCell>
                            <TableCell className="text-right">{a.totalDeclaraciones}</TableCell>
                            <TableCell className="text-right font-medium">{formatMoney(a.totalAportado)}</TableCell>
                            <TableCell className="text-right">
                              <span className={`font-bold ${a.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatMoney(a.diferencia)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {a.cumpleMinimo
                                ? <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Cumple</Badge>
                                : <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" /> No Cumple</Badge>
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {aporteData.length > APORTES_PER_PAGE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-gray-500">
                      Mostrando {(aportePage - 1) * APORTES_PER_PAGE + 1} a {Math.min(aportePage * APORTES_PER_PAGE, aporteData.length)} de {aporteData.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={aportePage === 1}
                        onClick={() => setAportePage(p => p - 1)}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-gray-600">
                        Pagina {aportePage} de {Math.ceil(aporteData.length / APORTES_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={aportePage >= Math.ceil(aporteData.length / APORTES_PER_PAGE)}
                        onClick={() => setAportePage(p => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ===== MODAL PROGRESO APORTES ===== */}
      {aporteProgress.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-amber-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando Informe de Aportes
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{aporteProgress.stage}</span>
                  <span className="text-gray-500">{aporteProgress.current} / {aporteProgress.total}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-amber-500 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${aporteProgress.total > 0 ? (aporteProgress.current / aporteProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Procesando escribanos... por favor espera
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
