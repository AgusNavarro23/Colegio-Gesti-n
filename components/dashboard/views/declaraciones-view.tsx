'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, Trash2, Loader2, RefreshCcw, User, CheckCircle2, X } from 'lucide-react';

const addBusinessDays = (startDate: Date, daysToAdd: number) => {
  let currentDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) addedDays++;
  }
  return currentDate.toISOString().split('T')[0];
};

const calcularHonorario = (monto: number, arancel: any) => {
  if (!arancel) return 0;
  let honorario = arancel.porcentaje1 ? monto * (arancel.porcentaje1 / 100) : 0;
  if (arancel.maximo && monto > arancel.maximo && arancel.porcentaje2) {
    honorario = (arancel.maximo * (arancel.porcentaje1 / 100)) + ((monto - arancel.maximo) * (arancel.porcentaje2 / 100));
  }
  if (arancel.minimo && honorario < arancel.minimo) honorario = arancel.minimo;
  if (arancel.adicional) honorario += arancel.adicional;
  return honorario;
};

export function DeclaracionesView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [declaraciones, setDeclaraciones] = useState<any[]>([]);
  const [aranceles, setAranceles] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [escribanos, setEscribanos] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados Formulario Identificación
  const [numerodj, setNumerodj] = useState('');
  const [codigodj, setCodigodj] = useState('');
  const [fechaActo, setFechaActo] = useState('');
  const [fechaVto, setFechaVto] = useState('');
  
  // Estados Rubro A Expandido
  const [inscripcion, setInscripcion] = useState<number>(0);
  const [impuesto, setImpuesto] = useState<number>(0);
  const [recargoSellos, setRecargoSellos] = useState<number>(0);
  const [actividadesEconomicas, setActividadesEconomicas] = useState<number>(0);

  // Estados Notaría y Buscador de Registro
  const [registroId, setRegistroId] = useState('');
  const [escribanoId, setEscribanoId] = useState('');
  const [registroSearch, setRegistroSearch] = useState('');
  const [isRegistroDropdownOpen, setIsRegistroDropdownOpen] = useState(false);

  // Estados Tabla Actos y Buscador de Arancel
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
      
      const dataDJ = await resDJ.json();
      const dataAranceles = await resAranceles.json();
      const dataReg = await resReg.json();
      const dataEsc = await resEsc.json();

      setDeclaraciones(Array.isArray(dataDJ) ? dataDJ : []);
      setAranceles(Array.isArray(dataAranceles) ? dataAranceles : []);
      setRegistros(Array.isArray(dataReg) ? dataReg : []);
      setEscribanos(Array.isArray(dataEsc) ? dataEsc : []);
      
      if (dataDJ.error) console.error("Error API Declaraciones:", dataDJ.error);

    } catch (error) {
      toast({ title: "Error", description: "Error cargando datos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (fechaActo) setFechaVto(addBusinessDays(new Date(fechaActo + 'T00:00:00'), 15));
    else setFechaVto('');
  }, [fechaActo]);

  useEffect(() => {
    setEscribanoId('');
  }, [registroId]);

  // CÁLCULOS
  const aranceltip = detalles.reduce((sum, d) => sum + d.arancelCalculado, 0);
  const rubroA = (inscripcion || 0) + (impuesto || 0) + (recargoSellos || 0) + (actividadesEconomicas || 0);
  const rubroB = aranceltip * 0.12;
  const rubroC = aranceltip * 0.07;
  const rubroD = 10000;
  const totalDJ = rubroA + rubroB + rubroC + rubroD;

  // Filtrar registros (Solo Activos) y escribanos
  const registrosActivos = registros.filter(r => r.estado === 'Activo');
  const escribanosFiltrados = escribanos.filter(e => e.registroId === registroId);
  const escribanoSeleccionado = escribanos.find(e => e.id === escribanoId);

  const handleAddDetalle = () => {
    if (!currentArancelId || !currentMonto) return;
    const a = aranceles.find(a => a.id === currentArancelId);
    const m = parseFloat(currentMonto);
    setDetalles([...detalles, { arancelId: a.id, codigo: a.codigoRenta, descripcion: a.descripcion, monto: m, arancelCalculado: calcularHonorario(m, a) }]);
    
    // Limpiamos los inputs después de agregar
    setCurrentArancelId(''); 
    setCurrentMonto('');
    setArancelSearch('');
  };

  const handleRemoveDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleOpenModal = () => {
    setNumerodj(''); setCodigodj(''); setFechaActo(''); setFechaVto('');
    setInscripcion(0); setImpuesto(0); setRecargoSellos(0); setActividadesEconomicas(0);
    setRegistroId(''); setRegistroSearch(''); setEscribanoId(''); 
    setCurrentArancelId(''); setArancelSearch(''); setCurrentMonto('');
    setDetalles([]);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!numerodj || !registroId || !escribanoId || detalles.length === 0) {
      toast({ title: "Atención", description: "Completa los datos obligatorios y agrega al menos un acto.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/declaraciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numerodj, codigodj, fecha_acto: fechaActo, fecha_vto: fechaVto, registroId, escribanoId, aranceltip, rubroA, rubroB, rubroC, rubroD, total: totalDJ, detalles }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast({ title: "Éxito", description: "Declaración Jurada registrada correctamente" });
      setIsModalOpen(false); fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatMoney = (val: number) => `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardLayout role={role} title="Declaraciones Juradas">
      <Card className="border-0 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader className="px-6 py-4 border-b border-gray-100 flex-none">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Buscar por Nº DJ..." className="pl-9 focus-visible:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={fetchData}><RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
                <Button onClick={handleOpenModal} className="gap-2 bg-primary hover:bg-primary/90 text-white"><Plus className="w-4 h-4" /> Nueva DJ</Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Nº DJ</TableHead>
                  <TableHead>Registro / Escribano</TableHead>
                  <TableHead>Fecha Acto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Total DJ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {declaraciones.filter(d => (d.numerodj || '').includes(searchTerm)).map(item => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium"><Badge variant="outline" className="bg-white">{item.numerodj}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">Reg. {item.registro?.numero}</div>
                      <div className="text-xs text-gray-500">{item.escribano?.nombre}</div>
                    </TableCell>
                    <TableCell>{new Date(item.fecha_acto).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="text-primary font-medium">{new Date(item.fecha_vto).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="text-right font-bold text-gray-900">{formatMoney(item.total)}</TableCell>
                  </TableRow>
                ))}
                {declaraciones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay declaraciones registradas.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL CON DISEÑO FIGMA & COLORES DEL TEMA (BORDÓ/PRIMARY) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTitle className="sr-only">Nueva Declaración Jurada</DialogTitle>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-6xl w-full h-[95vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
          
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b bg-primary">
            <h2 className="text-2xl font-semibold text-white">Declaración Jurada</h2>
            <button onClick={() => setIsModalOpen(false)} className="p-2 text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Sección de Identificación y Notaría */}
            <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Información General</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Columna Izquierda - Notaría */}
                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <label className="block text-sm font-medium text-gray-700">Registro Notarial *</label>
                    <div className="relative">
                      <Input 
                        value={registroSearch} 
                        onChange={(e) => {
                          setRegistroSearch(e.target.value);
                          setIsRegistroDropdownOpen(true);
                          if (e.target.value === '') setRegistroId('');
                        }} 
                        onFocus={() => setIsRegistroDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsRegistroDropdownOpen(false), 200)}
                        placeholder="Buscar registro por número..." 
                        className="bg-white focus-visible:ring-primary"
                      />
                      {registroId && registroSearch === registroId && (
                        <div className="absolute right-3 top-2.5 text-primary"><CheckCircle2 className="w-5 h-5" /></div>
                      )}
                    </div>
                    {isRegistroDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {registrosActivos.filter(r => r.numero.toLowerCase().includes(registroSearch.toLowerCase())).length > 0 ? (
                          registrosActivos.filter(r => r.numero.toLowerCase().includes(registroSearch.toLowerCase())).map(reg => (
                            <div key={reg.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex flex-col border-b border-gray-50"
                              onClick={() => {
                                setRegistroId(reg.numero);
                                setRegistroSearch(reg.numero);
                                setIsRegistroDropdownOpen(false);
                              }}>
                              <span className="text-sm font-semibold">{reg.numero}</span>
                              <span className="text-xs text-gray-500">{reg.direccion}, {reg.localidad}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-sm text-gray-500 text-center">No se encontraron registros activos</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escribano *</label>
                    <Select value={escribanoId} onValueChange={setEscribanoId} disabled={!registroId}>
                      <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary h-auto">
                        <SelectValue placeholder={registroId ? "Seleccionar escribano" : "Seleccione primero un registro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {escribanosFiltrados.map(e => (<SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>

                  {escribanoSeleccionado && (
                    <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-md flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full"><User className="w-4 h-4 text-primary"/></div>
                      <div className="text-xs text-gray-700 space-y-1">
                        <p className="font-semibold text-gray-900">{escribanoSeleccionado.nombre}</p>
                        <p>Matrícula: <span className="font-medium text-primary">{escribanoSeleccionado.matricula}</span></p>
                        <p>Condición: <span className="font-medium">{escribanoSeleccionado.condicion}</span></p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha - Fechas y Números alineados en fila */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de DJ *</label>
                      <input type="text" placeholder="Ej. 123456" value={numerodj} onChange={(e) => setNumerodj(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código DJ</label>
                      <input type="text" placeholder="Ej. A1" value={codigodj} onChange={(e) => setCodigodj(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Acto *</label>
                      <input type="date" value={fechaActo} onChange={(e) => setFechaActo(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 flex justify-between">
                        Vencimiento <span className="text-[10px] text-primary/70 font-normal mt-1">(+15 días)</span>
                      </label>
                      <input type="date" value={fechaVto} readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 outline-none cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de Detalle de Actos */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Detalle de Actos (Aranceles)</h3>
              
              <div className="flex flex-col sm:flex-row gap-4 items-end mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arancel</label>
                  <div className="relative">
                    <Input 
                      value={arancelSearch} 
                      onChange={(e) => {
                        setArancelSearch(e.target.value);
                        setIsArancelDropdownOpen(true);
                        if (e.target.value === '') setCurrentArancelId('');
                      }} 
                      onFocus={() => setIsArancelDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsArancelDropdownOpen(false), 200)}
                      placeholder="Buscar por código o descripción..." 
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus-visible:ring-primary h-10.5"
                    />
                    {currentArancelId && (
                      <div className="absolute right-3 top-3 text-primary"><CheckCircle2 className="w-5 h-5" /></div>
                    )}
                  </div>
                  {isArancelDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {aranceles.filter(a => a.codigoRenta.toLowerCase().includes(arancelSearch.toLowerCase()) || a.descripcion.toLowerCase().includes(arancelSearch.toLowerCase())).length > 0 ? (
                        aranceles.filter(a => a.codigoRenta.toLowerCase().includes(arancelSearch.toLowerCase()) || a.descripcion.toLowerCase().includes(arancelSearch.toLowerCase())).map(a => (
                          <div key={a.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex flex-col border-b border-gray-50"
                            onClick={() => {
                              setCurrentArancelId(a.id);
                              setArancelSearch(`${a.codigoRenta} - ${a.descripcion}`);
                              setIsArancelDropdownOpen(false);
                            }}>
                            <span className="text-sm font-semibold">{a.descripcion}</span>
                            <span className="text-xs text-gray-500 line-clamp-1">{a.codigoRenta}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-gray-500 text-center">No se encontraron aranceles</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Base ($)</label>
                  <input type="number" placeholder="0.00" value={currentMonto} onChange={(e) => setCurrentMonto(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-10.5" />
                </div>
                <button onClick={handleAddDetalle} className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors h-10.5">
                  Agregar Acto
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700 w-24">Código</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Descripción</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Monto Declarado</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Honorario</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {detalles.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-sm text-center text-gray-500">Aún no has agregado ningún acto.</td></tr>
                    ) : (
                      detalles.map((d, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.codigo}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.descripcion}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatMoney(d.monto)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-primary">{formatMoney(d.arancelCalculado)}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleRemoveDetalle(index)} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección de Desglose y Liquidación */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 flex flex-col lg:flex-row gap-8 justify-between">
              
              {/* Cargos Manuales Rubro A Expandido */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Cargos Adicionales (Rubro A)</h3>
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inscripción ($)</label>
                    <input type="number" placeholder="0.00" value={inscripcion || ''} onChange={(e) => setInscripcion(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto ($)</label>
                    <input type="number" placeholder="0.00" value={impuesto || ''} onChange={(e) => setImpuesto(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recargo Sellos ($)</label>
                    <input type="number" placeholder="0.00" value={recargoSellos || ''} onChange={(e) => setRecargoSellos(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activ. Económicas ($)</label>
                    <input type="number" placeholder="0.00" value={actividadesEconomicas || ''} onChange={(e) => setActividadesEconomicas(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>

              {/* Liquidación Final */}
              <div className="w-full lg:w-96 space-y-3">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Desglose de Liquidación</h3>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 text-sm">Arancel Tipificado:</span>
                  <span className="font-medium text-gray-900">{formatMoney(aranceltip)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 text-sm">Total Rubro A:</span>
                  <span className="font-medium text-gray-900">{formatMoney(rubroA)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 text-sm">Aporte Colegio (Rubro B 12%):</span>
                  <span className="font-medium text-primary">{formatMoney(rubroB)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 text-sm">Caja Jubilación (Rubro C 7%):</span>
                  <span className="font-medium text-primary">{formatMoney(rubroC)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 text-sm">Fijo (Rubro D):</span>
                  <span className="font-medium text-gray-900">{formatMoney(rubroD)}</span>
                </div>
                
                <div className="h-px bg-gray-300 my-4"></div>
                
                <div className="flex justify-between items-center py-4 bg-primary text-white px-4 rounded-md shadow-sm">
                  <span className="text-lg font-semibold">Total a Pagar:</span>
                  <span className="text-2xl font-bold">{formatMoney(totalDJ)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-none">
            <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center min-w-40">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Declaración'}
            </button>
          </div>

        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}