'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/dashboard/shared/pagination-controls';
import { VerificacionDetailDialog } from '../shared/verificacion-detail-dialog';
import { DashboardInteligenteView } from './smart-dashboard-view';
import Swal from 'sweetalert2';
import {
  Search, RefreshCcw, Loader2, Eye, CheckCircle, XCircle,
  AlertTriangle, ListChecks, UploadCloud, CheckCircle2, BarChart3, FileText
} from 'lucide-react';

interface Verificacion {
  id: string;
  archivoOrigen: string;
  nro_registro: number;
  cuit_escribano: string;
  nombre_oficial: string;
  fecha_acto: string;
  fecha_vto: string | null;
  tipo_pago: string;
  anio: number;
  nro_escritura: number;
  codigo_dj: number;
  arancel_tip: number;
  arancel_calculado: number;
  total_general: number;
  rubroA: number;
  rubroB: number;
  rubroC: number;
  rubroD: number;
  prioridad: string;
  nivelRiesgo: string;
  motivos_riesgo: string;
  estado: string;
  actos_resumen: string | null;
  detalles_arancel: string | null;
  pdfPath: string | null;
  createdAt: string;
}

type TabType = 'cargar' | 'dashboard' | 'pendientes' | 'detalle';

const ITEMS_PER_PAGE = 10;

const GaugeChart = ({ value, label, segments, subtitle }: { value: number; label: string; segments: { start: number; end: number; color: string }[]; subtitle?: string }) => {
  const minVal = segments[0].start;
  const maxVal = segments[segments.length - 1].end;
  const normalizedValue = Math.max(minVal, Math.min(maxVal, value));
  const angle = ((normalizedValue - minVal) / (maxVal - minVal)) * 180;
  const needleAngle = 180 + angle;
  const needleX = 100 + 70 * Math.cos((needleAngle * Math.PI) / 180);
  const needleY = 100 + 70 * Math.sin((needleAngle * Math.PI) / 180);

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 180) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="130" viewBox="0 0 200 130">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(100, 100, 80, ((seg.start - minVal) / (maxVal - minVal)) * 180, ((seg.end - minVal) / (maxVal - minVal)) * 180)}
            fill="none"
            stroke={seg.color}
            strokeWidth="20"
            strokeLinecap="butt"
          />
        ))}
        <circle cx="100" cy="100" r="50" fill="#f8f9fa" />
        <circle cx="100" cy="100" r="40" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <text x="100" y="96" textAnchor="middle" className="text-lg font-bold" fill="#1f2937">{value.toFixed(1)}%</text>
        <text x="100" y="112" textAnchor="middle" className="text-xs" fill="#6b7280">{label}</text>
        <line x1="100" y1="100" x2={needleX} y2={needleY} stroke="#374151" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill="#374151" />
      </svg>
      {subtitle && <span className="text-xs text-gray-500 mt-1 text-center max-w-48">{subtitle}</span>}
    </div>
  );
};

export function AuditoriaView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string | null>(null);
  const [filterNivel, setFilterNivel] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Verificacion | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPagePendientes, setCurrentPagePendientes] = useState(1);
  const [currentPageDetalle, setCurrentPageDetalle] = useState(1);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEstado) params.set('estado', filterEstado);
      if (filterNivel) params.set('nivelRiesgo', filterNivel);

      const res = await fetch(`/api/verificaciones?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVerificaciones(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error cargando verificaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterEstado, filterNivel]);

  useEffect(() => {
    setCurrentPagePendientes(1);
    setCurrentPageDetalle(1);
  }, [searchTerm, filterNivel, filterEstado]);

  const formatMoney = (val: number) =>
    `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getDiferencia = (v: Verificacion) => {
    if (v.arancel_calculado === 0) return 0;
    return ((Math.abs(v.arancel_tip - v.arancel_calculado) / v.arancel_calculado) * 100);
  };

  const getNivelBadge = (nivel: string) => {
    switch (nivel) {
      case 'ROJO': return <Badge className="bg-red-600 text-white">ROJO</Badge>;
      case 'AMARILLO': return <Badge className="bg-yellow-500 text-black">AMARILLO</Badge>;
      case 'VERDE': return <Badge className="bg-green-600 text-white">VERDE</Badge>;
      default: return <Badge variant="outline">{nivel}</Badge>;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'APROBADA': return <Badge className="bg-emerald-600"><CheckCircle className="w-3 h-3 mr-1" /> Aprobada</Badge>;
      case 'APROBADA_AUTO': return <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Auto-Aprobada</Badge>;
      case 'RECHAZADA': return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" /> Rechazada</Badge>;
      case 'PENDIENTE_REVISION': return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50"><AlertTriangle className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const handleUpdateEstado = async (id: string, nuevoEstado: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/verificaciones/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) throw new Error('Error al actualizar');

      await Swal.fire({
        icon: nuevoEstado === 'APROBADA' ? 'success' : 'warning',
        title: nuevoEstado === 'APROBADA' ? 'Aprobada' : 'Rechazada',
        text: `La verificacion ha sido ${nuevoEstado.toLowerCase()}.`,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      fetchData();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el estado',
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const stats = {
    total: verificaciones.length,
    pendientes: verificaciones.filter(v => v.estado === 'PENDIENTE_REVISION').length,
    aprobadas: verificaciones.filter(v => v.estado === 'APROBADA' || v.estado === 'APROBADA_AUTO').length,
    rechazadas: verificaciones.filter(v => v.estado === 'RECHAZADA').length,
    altoRiesgo: verificaciones.filter(v => v.nivelRiesgo === 'ROJO').length,
    riesgoMedio: verificaciones.filter(v => v.nivelRiesgo === 'AMARILLO').length,
    riesgoBajo: verificaciones.filter(v => v.nivelRiesgo === 'VERDE').length,
    totalAportado: verificaciones.reduce((sum, v) => sum + (v.arancel_tip || 0), 0),
    totalCalculado: verificaciones.reduce((sum, v) => sum + (v.arancel_calculado || 0), 0),
  };

  const verificacionesPendientes = verificaciones.filter(v => v.estado === 'PENDIENTE_REVISION');

  const filteredData = verificaciones.filter(v => {
    const matchSearch = (
      v.nombre_oficial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.cuit_escribano.includes(searchTerm) ||
      v.archivoOrigen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(v.nro_registro).includes(searchTerm)
    );
    return matchSearch;
  });

  const pagedPendientes = verificacionesPendientes.slice(
    (currentPagePendientes - 1) * ITEMS_PER_PAGE,
    currentPagePendientes * ITEMS_PER_PAGE
  );

  const pagedDetalle = filteredData.slice(
    (currentPageDetalle - 1) * ITEMS_PER_PAGE,
    currentPageDetalle * ITEMS_PER_PAGE
  );

  const pctRojo = stats.total > 0 ? (stats.altoRiesgo / stats.total) * 100 : 0;
  const pctPendiente = stats.total > 0 ? (stats.pendientes / stats.total) * 100 : 0;
  const pctDif = stats.totalCalculado > 0 ? (Math.abs(stats.totalAportado - stats.totalCalculado) / stats.totalCalculado) * 100 : 0;

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'pendientes', label: 'Verificaciones Pendientes', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'detalle', label: 'Detalle de Verificaciones', icon: <ListChecks className="w-4 h-4" /> },
    { key: 'cargar', label: 'Cargar Declaraciones', icon: <UploadCloud className="w-4 h-4" /> },
  ];

  const openPdf = (v: Verificacion) => {
    if (v.pdfPath) {
      window.open(v.pdfPath, '_blank')
    }
  }

  const renderActions = (v: Verificacion) => (
    <>
      <Button variant="ghost" size="icon" onClick={() => openPdf(v)} title="Ver PDF" disabled={!v.pdfPath}>
        <FileText className="w-4 h-4 text-red-500" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(v); setIsDetailOpen(true); }} title="Ver Detalle">
        <Eye className="w-4 h-4 text-gray-500" />
      </Button>
      {v.estado === 'PENDIENTE_REVISION' && (
        <>
          <Button variant="ghost" size="icon" onClick={() => handleUpdateEstado(v.id, 'APROBADA')} title="Aprobar" disabled={isUpdating}>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleUpdateEstado(v.id, 'RECHAZADA')} title="Rechazar" disabled={isUpdating}>
            <XCircle className="w-4 h-4 text-red-600" />
          </Button>
        </>
      )}
    </>
  );

  const renderTableRow = (v: Verificacion) => (
    <TableRow key={v.id} className={`hover:bg-gray-50 ${v.nivelRiesgo === 'ROJO' ? 'bg-red-50/30' : v.nivelRiesgo === 'AMARILLO' ? 'bg-yellow-50/30' : ''}`}>
      <TableCell>{getNivelBadge(v.nivelRiesgo)}</TableCell>
      <TableCell className="max-w-48 truncate text-sm" title={v.archivoOrigen}>{v.archivoOrigen}</TableCell>
      <TableCell>
        <div className="text-sm font-medium text-gray-900">{v.nombre_oficial}</div>
        <div className="text-xs text-gray-500">Reg. {v.nro_registro} | CUIT: {v.cuit_escribano}</div>
      </TableCell>
      <TableCell className="text-sm">{v.fecha_acto}</TableCell>
      <TableCell className="text-right font-medium">{formatMoney(v.arancel_tip)}</TableCell>
      <TableCell className="text-right font-medium">{formatMoney(v.arancel_calculado)}</TableCell>
      <TableCell className="text-right">
        <span className={`font-semibold ${v.nivelRiesgo === 'ROJO' ? 'text-red-600' : v.nivelRiesgo === 'AMARILLO' ? 'text-yellow-600' : 'text-green-600'}`}>
          {getDiferencia(v).toFixed(1)}%
        </span>
      </TableCell>
      <TableCell>{getEstadoBadge(v.estado)}</TableCell>
      <TableCell className="text-right whitespace-nowrap">{renderActions(v)}</TableCell>
    </TableRow>
  );

  return (
    <DashboardLayout role={role} title="Tablero de Auditoria Inteligente">
      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Total Verificaciones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </CardContent></Card>
            <Card className="shadow-sm border-orange-200 bg-orange-50/30"><CardContent className="p-3 text-center">
              <p className="text-xs text-orange-600">Pendientes</p>
              <p className="text-2xl font-bold text-orange-700">{stats.pendientes}</p>
            </CardContent></Card>
            <Card className="shadow-sm border-green-200 bg-green-50/30"><CardContent className="p-3 text-center">
              <p className="text-xs text-green-600">Aprobadas</p>
              <p className="text-2xl font-bold text-green-700">{stats.aprobadas}</p>
            </CardContent></Card>
            <Card className="shadow-sm border-red-200 bg-red-50/30"><CardContent className="p-3 text-center">
              <p className="text-xs text-red-600">Rechazadas</p>
              <p className="text-2xl font-bold text-red-700">{stats.rechazadas}</p>
            </CardContent></Card>
          </div>

          {/* Risk + Financial Summary */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <p className="text-xs text-green-600">Verde</p>
              <p className="text-lg font-bold text-green-700">{stats.riesgoBajo}</p>
            </CardContent></Card>
            <Card className="shadow-sm border-yellow-200 bg-yellow-50/30"><CardContent className="p-3 text-center">
              <p className="text-xs text-yellow-600">Amarillo</p>
              <p className="text-lg font-bold text-yellow-700">{stats.riesgoMedio}</p>
            </CardContent></Card>
            <Card className="shadow-sm border-red-200 bg-red-50/30"><CardContent className="p-3 text-center">
              <p className="text-xs text-red-600">Rojo</p>
              <p className="text-lg font-bold text-red-700">{stats.altoRiesgo}</p>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <p className="text-[10px] text-gray-500">Declarado</p>
              <p className="text-sm font-bold text-blue-700">{formatMoney(stats.totalAportado)}</p>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <p className="text-[10px] text-gray-500">Calculado</p>
              <p className="text-sm font-bold text-purple-700">{formatMoney(stats.totalCalculado)}</p>
            </CardContent></Card>
          </div>

          {/* Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex flex-col items-center">
                <p className="text-xs font-medium text-gray-700 mb-2">Nivel de Riesgo</p>
                <GaugeChart 
                  value={pctRojo} 
                  label="% en Rojo" 
                  segments={[
                    { start: 0, end: 5, color: '#16a34a' },
                    { start: 5, end: 15, color: '#eab308' },
                    { start: 15, end: 50, color: '#dc2626' },
                  ]}
                  subtitle={`${stats.altoRiesgo} de ${stats.total} verificaciones`}
                />
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex flex-col items-center">
                <p className="text-xs font-medium text-gray-700 mb-2">Estado de Verificaciones</p>
                <GaugeChart 
                  value={pctPendiente} 
                  label="% Pendientes" 
                  segments={[
                    { start: 0, end: 5, color: '#16a34a' },
                    { start: 5, end: 15, color: '#eab308' },
                    { start: 15, end: 50, color: '#dc2626' },
                  ]}
                  subtitle={`${stats.pendientes} de ${stats.total} verificaciones`}
                />
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex flex-col items-center">
                <p className="text-xs font-medium text-gray-700 mb-2">Brecha Arancelaria</p>
                <GaugeChart 
                  value={pctDif} 
                  label="% Diferencia" 
                  segments={[
                    { start: 0, end: 2, color: '#16a34a' },
                    { start: 2, end: 5, color: '#eab308' },
                    { start: 5, end: 20, color: '#dc2626' },
                  ]}
                  subtitle={`Dif: ${formatMoney(Math.abs(stats.totalAportado - stats.totalCalculado))}`}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: VERIFICACIONES PENDIENTES */}
      {activeTab === 'pendientes' && (
        <Card className="border-0 shadow-sm flex flex-col">
          <CardHeader className="px-4 sm:px-6 py-4 border-b border-gray-100 flex-none">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Verificaciones Pendientes ({stats.pendientes})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : verificacionesPendientes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hay verificaciones pendientes.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Escribano / Registro</TableHead>
                        <TableHead>Fecha Acto</TableHead>
                        <TableHead className="text-right">Declarado</TableHead>
                        <TableHead className="text-right">Calculado</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedPendientes.map(renderTableRow)}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={currentPagePendientes}
                  totalItems={verificacionesPendientes.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPagePendientes}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: DETALLE DE VERIFICACIONES */}
      {activeTab === 'detalle' && (
        <Card className="border-0 shadow-sm flex flex-col">
          <CardHeader className="px-4 sm:px-6 py-4 border-b border-gray-100 flex-none">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input placeholder="Buscar por nombre, CUIT, registro..." className="pl-9 focus-visible:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Select value={filterNivel || undefined} onValueChange={(v) => setFilterNivel(v === 'TODOS' ? null : v)}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Nivel Riesgo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="ROJO">Rojo</SelectItem>
                    <SelectItem value="AMARILLO">Amarillo</SelectItem>
                    <SelectItem value="VERDE">Verde</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterEstado || undefined} onValueChange={(v) => setFilterEstado(v === 'TODOS' ? null : v)}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="PENDIENTE_REVISION">Pendiente</SelectItem>
                    <SelectItem value="APROBADA">Aprobada</SelectItem>
                    <SelectItem value="APROBADA_AUTO">Auto-Aprobada</SelectItem>
                    <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchData} title="Recargar">
                  <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Escribano / Registro</TableHead>
                        <TableHead>Fecha Acto</TableHead>
                        <TableHead className="text-right">Declarado</TableHead>
                        <TableHead className="text-right">Calculado</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedDetalle.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">No hay verificaciones registradas.</TableCell></TableRow>
                      ) : (
                        pagedDetalle.map(renderTableRow)
                      )}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={currentPageDetalle}
                  totalItems={filteredData.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPageDetalle}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: CARGAR DECLARACIONES */}
      {activeTab === 'cargar' && <DashboardInteligenteView />}

      <VerificacionDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        selectedItem={selectedItem}
        onUpdateEstado={handleUpdateEstado}
        isUpdating={isUpdating}
      />
    </DashboardLayout>
  );
}
