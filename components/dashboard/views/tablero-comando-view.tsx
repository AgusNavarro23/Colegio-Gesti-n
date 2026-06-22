'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, DollarSign, FileText, Target, Zap, BarChart3, Users, Settings, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { EscribanosKpiDialog } from '../shared/escribanos-kpi-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';

interface KPIData {
  financiero: {
    totalRecaudado: number;
    totalAporteColegio: number;
    totalTeorico: number;
    gapFiscal: number;
    tasaCumplimiento: number;
    indiceMoraTemprana: number;
    escribanosActivos: number;
    escribanosAlDia: number;
    escribanosEnMora: number;
    aporteMinimoMensual: number;
  };
  procesos: {
    totalVerificaciones: number;
    ratioSTP: number;
    mttrMinutos: number;
    topOfensores: { nombre: string; count: number; cuit: string }[];
  };
  ia: {
    tasaFalsosPositivos: number;
    tasaNoProcesables: number;
    totalProcesados: number;
    noProcesables: number;
  };
  charts: {
    djsPorMes: { mes: string; count: number; total: number }[];
    distribucionRiesgo: { verde: number; amarillo: number; rojo: number };
    distribucionEstado: { pendiente: number; aprobada: number; rechazada: number };
  };
}

const formatMoney = (val: number) =>
  `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORIAS = ['A', 'B', 'C', 'D'] as const;
const COLOR_CAT: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-amber-100 text-amber-800 border-amber-200',
  D: 'bg-red-100 text-red-800 border-red-200',
};

const GaugeChart = ({ value, label, segments, subtitle, onClick }: { value: number; label: string; segments: { start: number; end: number; color: string }[]; subtitle?: string; onClick?: () => void }) => {
  const minVal = segments[0].start;
  const maxVal = segments[segments.length - 1].end;
  const normalizedValue = Math.max(minVal, Math.min(maxVal, value));
  const cx = 80, cy = 80, arcR = 64;
  const angle = ((normalizedValue - minVal) / (maxVal - minVal)) * 180;
  const needleAngle = 180 + angle;
  const needleR = 56;
  const needleX = cx + needleR * Math.cos((needleAngle * Math.PI) / 180);
  const needleY = cy + needleR * Math.sin((needleAngle * Math.PI) / 180);

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
    <div
      className={`flex flex-col items-center ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 rounded-lg transition-all p-1' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <svg width="160" height="108" viewBox="0 0 160 108">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(cx, cy, arcR, ((seg.start - minVal) / (maxVal - minVal)) * 180, ((seg.end - minVal) / (maxVal - minVal)) * 180)}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeLinecap="butt"
          />
        ))}
        <circle cx={cx} cy={cy} r="40" fill="#f8f9fa" />
        <circle cx={cx} cy={cy} r="32" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="text-sm" fill="#1f2937" fontWeight="700">{value.toFixed(1)}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="text-sm" fill="#6b7280" fontWeight="600">{label}</text>
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#374151" />
      </svg>
      {subtitle && <span className="text-xs text-gray-400 mt-0.5 text-center max-w-44">{subtitle}</span>}
    </div>
  );
};

const GaugeChartMTTR = ({ value, label, segments, subtitle }: { value: number; label: string; segments: { start: number; end: number; color: string }[]; subtitle?: string }) => {
  const minVal = segments[0].start;
  const maxVal = segments[segments.length - 1].end;
  const normalizedValue = Math.max(minVal, Math.min(maxVal, value));
  const cx = 80, cy = 80, arcR = 64;
  const angle = ((normalizedValue - minVal) / (maxVal - minVal)) * 180;
  const needleAngle = 180 + angle;
  const needleR = 56;
  const needleX = cx + needleR * Math.cos((needleAngle * Math.PI) / 180);
  const needleY = cy + needleR * Math.sin((needleAngle * Math.PI) / 180);

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
      <svg width="160" height="108" viewBox="0 0 160 108">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(cx, cy, arcR, ((seg.start - minVal) / (maxVal - minVal)) * 180, ((seg.end - minVal) / (maxVal - minVal)) * 180)}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeLinecap="butt"
          />
        ))}
        <circle cx={cx} cy={cy} r="40" fill="#f8f9fa" />
        <circle cx={cx} cy={cy} r="32" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="text-sm" fill="#1f2937" fontWeight="700">{value.toFixed(0)}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="text-sm" fill="#6b7280" fontWeight="600">{label}</text>
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#374151" />
      </svg>
      {subtitle && <span className="text-xs text-gray-400 mt-0.5 text-center max-w-44">{subtitle}</span>}
    </div>
  );
};

export function TableroComandoView({ role }: { role: 'ADMIN' }) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();
  const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [fechaInicio, setFechaInicio] = useState(firstDayPrevMonth.toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(today.toISOString().split('T')[0]);

  const [configActiva, setConfigActiva] = useState<any>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [kpiDialogTipo, setKpiDialogTipo] = useState<'cumplimiento' | 'mora'>('cumplimiento');
  const [kpiDialogData, setKpiDialogData] = useState<any>(null);
  const [isKpiLoading, setIsKpiLoading] = useState(false);

  const fetchConfigActiva = async () => {
    try {
      const res = await fetch(`/api/config-aportes/activa?fecha=${fechaFin}`);
      if (res.ok) setConfigActiva(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/kpis?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      if (res.ok) setData(await res.json());
      await fetchConfigActiva();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEscribanosKpi = async (tipo: 'cumplimiento' | 'mora') => {
    setIsKpiLoading(true);
    setKpiDialogTipo(tipo);
    try {
      const res = await fetch(`/api/kpis/escribanos-detalle?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      if (res.ok) {
        const result = await res.json();
        setKpiDialogData(result);
        setKpiDialogOpen(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsKpiLoading(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { fetchData(); }, [fechaInicio, fechaFin]);

  if (!mounted) {
    return (
      <DashboardLayout role={role} title="Tablero de Comando">
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout role={role} title="Tablero de Comando">
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
      </DashboardLayout>
    );
  }

  const gapFiscalPct = data!.financiero.totalTeorico > 0
    ? (Math.abs(data!.financiero.gapFiscal) / data!.financiero.totalTeorico) * 100
    : 0;

  return (
    <DashboardLayout role={role} title="Tablero de Comando">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <Label className="text-xs text-gray-500">Fecha Inicio</Label>
          <Input type="date" className="w-40 mt-1" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Fecha Fin</Label>
          <Input type="date" className="w-40 mt-1" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Montos por Categoria</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchConfigActiva(); setIsConfigModalOpen(true); }}
            className="mt-1 gap-2"
          >
            <Settings className="w-4 h-4" />
            Ver Montos
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-5">
          <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - All Gauges */}
        <div className="space-y-5">
          {/* Perspectiva Financiera */}
          <div>
            <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Perspectiva Financiera
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <GaugeChart
                value={data!.financiero.tasaCumplimiento}
                label="Tasa de Cumplimiento"
                segments={[
                  { start: 0, end: 80, color: '#dc2626' },
                  { start: 80, end: 95, color: '#eab308' },
                  { start: 95, end: 100, color: '#10b981' },
                ]}
                subtitle={`${data!.financiero.escribanosAlDia} de ${data!.financiero.escribanosActivos}`}
                onClick={() => fetchEscribanosKpi('cumplimiento')}
              />
              <GaugeChart value={gapFiscalPct} label="Gap Fiscal"
                segments={[
                  { start: 0, end: 1, color: '#10b981' },
                  { start: 1, end: 5, color: '#eab308' },
                  { start: 5, end: 50, color: '#dc2626' },
                ]}
                subtitle={`Gap: ${formatMoney(data!.financiero.gapFiscal)}`}
              />
              <GaugeChart
                value={data!.financiero.indiceMoraTemprana}
                label="Indice de Mora"
                segments={[
                  { start: 0, end: 5, color: '#10b981' },
                  { start: 5, end: 15, color: '#eab308' },
                  { start: 15, end: 50, color: '#dc2626' },
                ]}
                subtitle={`${data!.financiero.escribanosEnMora} en mora`}
                onClick={() => fetchEscribanosKpi('mora')}
              />
            </div>
          </div>

          {/* Perspectiva del Cliente */}
          <div>
            <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Perspectiva del Cliente
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <GaugeChartMTTR value={data!.procesos.mttrMinutos} label="MTTR (min)"
                segments={[
                  { start: 0, end: 15, color: '#10b981' },
                  { start: 15, end: 45, color: '#eab308' },
                  { start: 45, end: 120, color: '#dc2626' },
                ]}
                subtitle="Tiempo medio resolucion"
              />
            </div>
          </div>

          {/* Perspectiva de Procesos Internos */}
          <div>
            <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Procesos Internos
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <GaugeChart value={data!.procesos.ratioSTP} label="Ratio STP"
                segments={[
                  { start: 0, end: 50, color: '#dc2626' },
                  { start: 50, end: 75, color: '#eab308' },
                  { start: 75, end: 100, color: '#10b981' },
                ]}
                subtitle={`${data!.procesos.totalVerificaciones} verificaciones`}
              />
            </div>
          </div>

          {/* Perspectiva de Crecimiento y Aprendizaje */}
          <div>
            <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Crecimiento y Aprendizaje
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <GaugeChart value={data!.ia.tasaFalsosPositivos} label="Falsos Positivos"
                segments={[
                  { start: 0, end: 5, color: '#10b981' },
                  { start: 5, end: 15, color: '#eab308' },
                  { start: 15, end: 50, color: '#dc2626' },
                ]}
                subtitle={`${data!.ia.totalProcesados} procesados`}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Charts Only */}
        <div className="space-y-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Declaraciones por Mes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data!.charts.djsPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(v: number | undefined) => v ?? 0} />
                  <Bar dataKey="count" fill="#d97706" radius={[4, 4, 0, 0]} name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Recaudacion Mensual</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data!.charts.djsPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number | undefined) => v !== undefined ? formatMoney(v) : ''} />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="Recaudado" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Config Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Montos Minimos por Categoria
            </DialogTitle>
            <DialogDescription>
              Configuracion activa para el periodo seleccionado.
            </DialogDescription>
          </DialogHeader>
          {configActiva ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(configActiva.fechaInicio).toLocaleDateString('es-AR')} - {new Date(configActiva.fechaFin).toLocaleDateString('es-AR')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIAS.map(cat => (
                  <div key={cat} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                    <Badge className={`${COLOR_CAT[cat]} border shrink-0`}>{cat}</Badge>
                    <span className="font-bold text-sm">{formatMoney(configActiva[`monto${cat}` as keyof typeof configActiva])}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              <Settings className="w-8 h-8 mx-auto mb-2" />
              <p>No hay configuracion activa para este periodo</p>
            </div>
          )}
          <DialogFooter>
            <Link href="/admin/config-aportes">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" /> Ver Historial Completo
              </Button>
            </Link>
            <Button onClick={() => setIsConfigModalOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Detail Dialog */}
      {isKpiLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-amber-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Cargando detalle...
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center">Obteniendo informacion de escribanos</p>
            </div>
          </div>
        </div>
      )}

      <EscribanosKpiDialog
        open={kpiDialogOpen}
        onOpenChange={setKpiDialogOpen}
        tipo={kpiDialogTipo}
        data={kpiDialogData}
      />
    </DashboardLayout>
  );
}
