'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, DollarSign, FileText, CheckCircle2, AlertCircle, Building2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export function InformesView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [declaraciones, setDeclaraciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('Todos');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/declaraciones');
        const data = await res.json();
        setDeclaraciones(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error al cargar datos para informes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- PROCESAMIENTO DE DATOS ---

  // 1. Filtrar datos según Año y Mes seleccionados
  const filteredData = useMemo(() => {
    return declaraciones.filter(dj => {
      const date = new Date(dj.fecha_acto);
      const matchYear = date.getFullYear().toString() === selectedYear;
      const matchMonth = selectedMonth === 'Todos' ? true : (date.getMonth() + 1).toString() === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [declaraciones, selectedYear, selectedMonth]);

  // 2. KPIs Principales
  const kpis = useMemo(() => {
    let totalLiquidado = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    let cantidadPagadas = 0;

    filteredData.forEach(dj => {
      totalLiquidado += dj.total || 0;
      if (dj.fecha_pago) {
        totalPagado += dj.total || 0;
        cantidadPagadas++;
      } else {
        totalPendiente += dj.total || 0;
      }
    });

    return { totalLiquidado, totalPagado, totalPendiente, totalDjs: filteredData.length, cantidadPagadas };
  }, [filteredData]);

  // 3. Datos para Gráfico de Barras (Evolución Mensual)
  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data = months.map((name, index) => ({ name, num: index + 1, total: 0, pagado: 0 }));

    filteredData.forEach(dj => {
      const mIndex = new Date(dj.fecha_acto).getMonth();
      data[mIndex].total += dj.total;
      if (dj.fecha_pago) data[mIndex].pagado += dj.total;
    });

    // Si hay un mes seleccionado, filtramos el gráfico
    if (selectedMonth !== 'Todos') {
      return data.filter(d => d.num.toString() === selectedMonth);
    }
    return data;
  }, [filteredData, selectedMonth]);

  // 4. Datos para Gráfico Circular (Estado de Pagos)
  const paymentStatusData = [
    { name: 'Pagadas', value: kpis.cantidadPagadas },
    { name: 'Pendientes', value: kpis.totalDjs - kpis.cantidadPagadas }
  ];
  const COLORS = ['#16a34a', '#f97316']; // Verde (Pagado), Naranja (Pendiente)

  // 5. Desglose por Rubros
  const rubrosData = useMemo(() => {
    let a = 0, b = 0, c = 0, d = 0;
    filteredData.forEach(dj => {
      a += dj.rubroA || 0; b += dj.rubroB || 0; c += dj.rubroC || 0; d += dj.rubroD || 0;
    });
    return [
      { name: 'Rubro A (Colegio)', value: a },
      { name: 'Rubro B (Aporte 12%)', value: b },
      { name: 'Rubro C (Caja Jub. 7%)', value: c },
      { name: 'Rubro D (Fijo)', value: d },
    ];
  }, [filteredData]);

  // 6. Ranking de Registros (Top 5)
  const topRegistros = useMemo(() => {
    const regMap: any = {};
    filteredData.forEach(dj => {
      if (!regMap[dj.registroId]) regMap[dj.registroId] = { id: dj.registroId, total: 0, count: 0 };
      regMap[dj.registroId].total += dj.total;
      regMap[dj.registroId].count += 1;
    });
    return Object.values(regMap).sort((a: any, b: any) => b.total - a.total).slice(0, 5);
  }, [filteredData]);


  const formatMoney = (val: number) => `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Generar años disponibles (desde 2024 hasta el actual + 1)
  const availableYears = Array.from({ length: parseInt(currentYear) - 2024 + 2 }, (_, i) => (2024 + i).toString());

  return (
    <DashboardLayout role={role} title="Informes y Estadísticas">
      
      {/* BARRA DE FILTROS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg"><BarChart3 className="w-5 h-5 text-primary" /></div>
          <h2 className="text-lg font-bold text-gray-800">Panel de Control General</h2>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="w-32">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue placeholder="Año" /></SelectTrigger>
              <SelectContent>
                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todo el Año</SelectItem>
                <SelectItem value="1">Enero</SelectItem><SelectItem value="2">Febrero</SelectItem>
                <SelectItem value="3">Marzo</SelectItem><SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Mayo</SelectItem><SelectItem value="6">Junio</SelectItem>
                <SelectItem value="7">Julio</SelectItem><SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Septiembre</SelectItem><SelectItem value="10">Octubre</SelectItem>
                <SelectItem value="11">Noviembre</SelectItem><SelectItem value="12">Diciembre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Liquidado</p>
                    <h3 className="text-2xl font-bold text-gray-900">{formatMoney(kpis.totalLiquidado)}</h3>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full"><DollarSign className="w-5 h-5 text-primary" /></div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Recaudado (Pagado)</p>
                    <h3 className="text-2xl font-bold text-green-600">{formatMoney(kpis.totalPagado)}</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Pendiente de Cobro</p>
                    <h3 className="text-2xl font-bold text-orange-500">{formatMoney(kpis.totalPendiente)}</h3>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Declaraciones Emitidas</p>
                    <h3 className="text-2xl font-bold text-gray-900">{kpis.totalDjs}</h3>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full"><FileText className="w-5 h-5 text-blue-600" /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico de Barras: Evolución */}
            <Card className="lg:col-span-2 border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Evolución de Ingresos</CardTitle>
                <CardDescription>Comparativa del total liquidado por mes en {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                      <RechartsTooltip 
                        formatter={(value: number | undefined) => formatMoney(value || 0)}
                        cursor={{fill: 'transparent'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="total" name="Total Liquidado" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico Circular: Estado de Pagos */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Estado de DJ</CardTitle>
                <CardDescription>Proporción de declaraciones pagadas</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}/>
                      <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-3xl font-bold text-gray-900">
                    {kpis.totalDjs > 0 ? Math.round((kpis.cantidadPagadas / kpis.totalDjs) * 100) : 0}%
                  </span>
                  <p className="text-sm text-gray-500">Tasa de cobro</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DESGLOSE INFERIOR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Registros */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary"/> Ranking Registros (Top 5)</CardTitle>
                <CardDescription>Registros con mayor monto liquidado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topRegistros.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No hay datos en este período</p>
                  ) : (
                    topRegistros.map((reg: any, index: number) => (
                      <div key={reg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Registro {reg.id}</p>
                            <p className="text-xs text-gray-500">{reg.count} declaraciones</p>
                          </div>
                        </div>
                        <div className="font-bold text-gray-900">{formatMoney(reg.total)}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Desglose por Rubros */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary"/> Composición de Recaudación</CardTitle>
                <CardDescription>Totales segmentados por rubro</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rubrosData.map((rubro, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{rubro.name}</span>
                        <span className="font-bold text-gray-900">{formatMoney(rubro.value)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${kpis.totalLiquidado > 0 ? (rubro.value / kpis.totalLiquidado) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 uppercase tracking-wider text-sm">TOTAL LIQUIDADO</span>
                      <span className="text-xl font-black text-primary">{formatMoney(kpis.totalLiquidado)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}