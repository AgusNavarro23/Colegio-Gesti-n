'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Swal from 'sweetalert2';
import { Search, Loader2, RefreshCcw, DollarSign, TrendingUp, Calendar, User } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface AporteAnual {
  escribano: {
    id: string;
    nombre: string;
    matricula: string;
    cuit: string | null;
    dni: string;
  };
  anio: number;
  totalDeclaraciones: number;
  totalAportado: number;
  totalGeneral: number;
  resumenMensual: Record<string, number>;
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

export function AporteAnualView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [escribanos, setEscribanos] = useState<any[]>([]);
  const [selectedEscribanoId, setSelectedEscribanoId] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [aporteData, setAporteData] = useState<AporteAnual | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/escribanos')
      .then(res => res.json())
      .then(data => setEscribanos(data))
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los escribanos', confirmButtonText: 'Aceptar' }));
  }, []);

  const fetchData = async () => {
    if (!selectedEscribanoId) {
      Swal.fire({ icon: 'warning', title: 'Atencion', text: 'Selecciona un escribano', confirmButtonText: 'Aceptar' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/escribanos/${selectedEscribanoId}/aporte-anual?anio=${anio}`);
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setAporteData(data);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el aporte anual', confirmButtonText: 'Aceptar' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatMoney = (val: number) =>
    `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredEscribanos = escribanos.filter(e =>
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.matricula.includes(searchTerm) ||
    (e.cuit && e.cuit.includes(searchTerm))
  );

  const chartData = aporteData ? Object.entries(aporteData.resumenMensual).map(([mes, total]) => ({
    mes: new Date(`${mes}-01`).toLocaleDateString('es-AR', { month: 'short' }),
    total,
  })) : [];

  return (
    <DashboardLayout role={role} title="Control de Aporte Minimo Anual">
      {/* Selector */}
      <Card className="shadow-sm mb-6">
        <CardHeader className="pb-3"><CardTitle className="text-lg">Buscar Escribano</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Buscar por nombre, matricula o CUIT</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input placeholder="Buscar..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Seleccionar Escribano</Label>
              <Select value={selectedEscribanoId} onValueChange={setSelectedEscribanoId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {filteredEscribanos.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre} (Mat. {e.matricula})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Anio</Label>
              <Select value={anio.toString()} onValueChange={(v) => setAnio(parseInt(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(a => (
                    <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={fetchData} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Consultar Aporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {aporteData && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="shadow-sm"><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full"><User className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Escribano</p>
                  <p className="font-bold text-gray-900">{aporteData.escribano.nombre}</p>
                </div>
              </div>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full"><DollarSign className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Total Aportado (B+C+D)</p>
                  <p className="font-bold text-green-700">{formatMoney(aporteData.totalAportado)}</p>
                </div>
              </div>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-full"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Total General</p>
                  <p className="font-bold text-purple-700">{formatMoney(aporteData.totalGeneral)}</p>
                </div>
              </div>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full"><Calendar className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Declaraciones</p>
                  <p className="font-bold text-amber-700">{aporteData.totalDeclaraciones}</p>
                </div>
              </div>
            </CardContent></Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="shadow-sm mb-6">
              <CardHeader><CardTitle>Evolucion Mensual de Aportes</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatMoney(value) : ''} />
                    <Bar dataKey="total" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Detalle de Declaraciones</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>N° DJ</TableHead>
                      <TableHead>Fecha Acto</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead className="text-right">Rubro A</TableHead>
                      <TableHead className="text-right">Rubro B (12%)</TableHead>
                      <TableHead className="text-right">Rubro C (7%)</TableHead>
                      <TableHead className="text-right">Rubro D</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aporteData.declaraciones.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No hay declaraciones pagadas para este anio.</TableCell></TableRow>
                    ) : (
                      aporteData.declaraciones.map(dj => (
                        <TableRow key={dj.id}>
                          <TableCell className="font-medium">{dj.numerodj}</TableCell>
                          <TableCell>{new Date(dj.fecha_acto).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell>{dj.fecha_pago ? new Date(dj.fecha_pago).toLocaleDateString('es-AR') : <Badge variant="outline" className="text-orange-600">Pendiente</Badge>}</TableCell>
                          <TableCell className="text-right">{formatMoney(dj.rubroA)}</TableCell>
                          <TableCell className="text-right">{formatMoney(dj.rubroB)}</TableCell>
                          <TableCell className="text-right">{formatMoney(dj.rubroC)}</TableCell>
                          <TableCell className="text-right">{formatMoney(dj.rubroD)}</TableCell>
                          <TableCell className="text-right font-bold">{formatMoney(dj.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
