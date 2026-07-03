'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, CheckCircle2, X, Loader2 } from 'lucide-react';

interface UserBrief {
  id: string;
  name: string | null;
  email: string;
}

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
  observacion: string | null;
  estado: string;
  actos_resumen: string | null;
  detalles_arancel: string | null;
  pdfPath: string | null;
  observaciones: string | null;
  registroId: string | null;
  escribanoId: string | null;
  createdAt: string;
  createdBy: UserBrief | null;
  updatedBy: UserBrief | null;
}

interface ConfirmarAprobacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verificacion: Verificacion;
  onConfirm: (id: string, datos: any) => Promise<void>;
  isUpdating: boolean;
}

interface RegistroOption {
  id: string;
  numero: string;
}

interface EscribanoOption {
  id: string;
  nombre: string;
  dni: string;
}

interface ActoRow {
  descripcion: string;
  monto: number;
}

function toDateInputValue(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const partes = dateStr.split('/');
    return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
  }
  return dateStr;
}

function fromDateInputValue(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function ConfirmarAprobacionDialog({ open, onOpenChange, verificacion, onConfirm, isUpdating }: ConfirmarAprobacionDialogProps) {
  const [registros, setRegistros] = useState<RegistroOption[]>([]);
  const [escribanos, setEscribanos] = useState<EscribanoOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [registroId, setRegistroId] = useState('');
  const [escribanoId, setEscribanoId] = useState('');
  const [numerodj, setNumerodj] = useState('');
  const [codigodj, setCodigodj] = useState('');
  const [fechaActo, setFechaActo] = useState('');
  const [fechaVto, setFechaVto] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [tipoPago, setTipoPago] = useState('Banco');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [aranceltip, setAranceltip] = useState(0);
  const [rubroA, setRubroA] = useState(0);
  const [rubroB, setRubroB] = useState(0);
  const [rubroC, setRubroC] = useState(0);
  const [rubroD, setRubroD] = useState(0);
  const [total, setTotal] = useState(0);
  const [actos, setActos] = useState<ActoRow[]>([]);
  const [observaciones, setObservaciones] = useState('');

  const [escribanoSearch, setEscribanoSearch] = useState('');

  useEffect(() => {
    if (!open) return;

    setLoadingData(true);

    Promise.all([
      fetch('/api/registros').then(r => r.json()),
      fetch('/api/escribanos').then(r => r.json()),
    ]).then(([regs, escs]) => {
      setRegistros(Array.isArray(regs) ? regs : []);
      setEscribanos(Array.isArray(escs) ? escs : []);
    }).catch(e => {
      console.error('Error fetching data:', e);
    }).finally(() => {
      setLoadingData(false);
    });

    setRegistroId(verificacion.registroId || String(verificacion.nro_registro) || '');
    setEscribanoId(verificacion.escribanoId || '');
    setNumerodj(verificacion.nro_escritura ? String(verificacion.nro_escritura) : '');
    setCodigodj(verificacion.codigo_dj ? String(verificacion.codigo_dj) : '');
    setFechaActo(toDateInputValue(verificacion.fecha_acto));
    setFechaVto(toDateInputValue(verificacion.fecha_vto || ''));
    setFechaPago(new Date().toISOString().split('T')[0]);
    setTipoPago(verificacion.tipo_pago || 'Banco');
    setAnio(verificacion.anio || new Date().getFullYear());
    setAranceltip(verificacion.arancel_tip || 0);
    setRubroA(verificacion.rubroA || 0);
    setRubroB(verificacion.rubroB || 0);
    setRubroC(verificacion.rubroC || 0);
    setRubroD(verificacion.rubroD || 0);
    setTotal(verificacion.total_general || 0);
    setObservaciones(verificacion.observaciones || '');

    try {
      const parsed = verificacion.actos_resumen ? JSON.parse(verificacion.actos_resumen) : [];
      setActos(Array.isArray(parsed) ? parsed.map((a: any) => ({
        descripcion: a.descripcion || '',
        monto: parseFloat(a.monto) || 0,
      })) : []);
    } catch {
      setActos([]);
    }
  }, [open, verificacion]);

  const filteredEscribanos = escribanos.filter(e =>
    !escribanoSearch || e.nombre.toLowerCase().includes(escribanoSearch.toLowerCase())
  );

  const agregarActo = () => {
    setActos([...actos, { descripcion: '', monto: 0 }]);
  };

  const eliminarActo = (index: number) => {
    setActos(actos.filter((_, i) => i !== index));
  };

  const actualizarActo = (index: number, field: keyof ActoRow, value: string | number) => {
    const nuevos = [...actos];
    (nuevos[index] as any)[field] = value;
    setActos(nuevos);
  };

  const handleConfirm = async () => {
    const datos: any = { estado: 'APROBADA' };

    if (registroId) datos.registroId = registroId;
    if (escribanoId) datos.escribanoId = escribanoId;
    if (numerodj !== String(verificacion.nro_escritura)) datos.numerodj = numerodj;
    if (codigodj !== String(verificacion.codigo_dj)) datos.codigodj = codigodj;
    if (fechaActo !== toDateInputValue(verificacion.fecha_acto)) datos.fecha_acto = fromDateInputValue(fechaActo);
    if (fechaVto !== toDateInputValue(verificacion.fecha_vto || '')) datos.fecha_vto = fechaVto;
    const defaultFechaPago = new Date().toISOString().split('T')[0];
    if (fechaPago !== defaultFechaPago) datos.fecha_pago = fechaPago;
    if (tipoPago !== verificacion.tipo_pago) datos.tipo_pago = tipoPago;
    if (anio !== verificacion.anio) datos.anio = anio;
    if (aranceltip !== verificacion.arancel_tip) datos.aranceltip = aranceltip;
    if (rubroA !== verificacion.rubroA) datos.rubroA = rubroA;
    if (rubroB !== verificacion.rubroB) datos.rubroB = rubroB;
    if (rubroC !== verificacion.rubroC) datos.rubroC = rubroC;
    if (rubroD !== verificacion.rubroD) datos.rubroD = rubroD;
    if (total !== verificacion.total_general) datos.total = total;
    if (observaciones !== (verificacion.observaciones || '')) datos.observaciones = observaciones;

    const actosOriginal = verificacion.actos_resumen
      ? (() => { try { return JSON.parse(verificacion.actos_resumen); } catch { return null; } })()
      : null;
    const actosChanged = !actosOriginal || JSON.stringify(actos) !== JSON.stringify(actosOriginal.map((a: any) => ({
      descripcion: a.descripcion || '',
      monto: parseFloat(a.monto) || 0,
    })));
    if (actosChanged) {
      datos.actos = actos;
    }

    await onConfirm(verificacion.id, datos);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Confirmar Aprobacion</DialogTitle>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] lg:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-800 flex-none">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Confirmar Aprobacion
          </h2>
          <button onClick={() => onOpenChange(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingData ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Loader2 className="animate-spin w-8 h-8 text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Identidad */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Identidad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Registro</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={registroId}
                    onChange={(e) => setRegistroId(e.target.value)}
                  >
                    <option value="">Seleccionar registro...</option>
                    {registros.map((r) => (
                      <option key={r.id} value={r.numero}>
                        Registro N° {r.numero}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Escribano</Label>
                  <input
                    type="text"
                    placeholder="Buscar escribano..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-1"
                    value={escribanoSearch}
                    onChange={(e) => setEscribanoSearch(e.target.value)}
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={escribanoId}
                    onChange={(e) => setEscribanoId(e.target.value)}
                  >
                    <option value="">Seleccionar escribano...</option>
                    {filteredEscribanos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} {e.dni ? `(DNI: ${e.dni})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nro. DJ</Label>
                  <Input value={numerodj} onChange={(e) => setNumerodj(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Codigo DJ</Label>
                  <Input value={codigodj} onChange={(e) => setCodigodj(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Fechas y Pago */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Fechas y Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Fecha Acto</Label>
                  <Input type="date" value={fechaActo} onChange={(e) => setFechaActo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha Vto.</Label>
                  <Input type="date" value={fechaVto} onChange={(e) => setFechaVto(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha Pago</Label>
                  <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo Pago</Label>
                  <Select value={tipoPago} onValueChange={setTipoPago}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banco">Banco</SelectItem>
                      <SelectItem value="Escribania">Escribania</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Año</Label>
                  <Input type="number" value={anio} onChange={(e) => setAnio(parseInt(e.target.value) || new Date().getFullYear())} />
                </div>
              </div>
            </div>

            {/* Actos */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Actos</h3>
              {actos.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead className="w-1/2">Descripcion</TableHead>
                        <TableHead className="w-1/4 text-right">Monto</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actos.map((acto, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input
                              value={acto.descripcion}
                              onChange={(e) => actualizarActo(i, 'descripcion', e.target.value)}
                              placeholder="Descripcion del acto"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={acto.monto}
                              onChange={(e) => actualizarActo(i, 'monto', parseFloat(e.target.value) || 0)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => eliminarActo(i)} className="text-red-500 h-9 w-9">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sin actos registrados.</p>
              )}
              <Button variant="outline" size="sm" onClick={agregarActo} className="mt-2">
                <Plus className="w-4 h-4 mr-1" /> Agregar Acto
              </Button>
            </div>

            {/* Observaciones */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Observaciones</h3>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Texto extraido del campo Observaciones del formulario DJ"
              />
            </div>

            {/* Liquidacion */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Liquidacion</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Arancel TIP</Label>
                  <Input type="number" value={aranceltip} onChange={(e) => setAranceltip(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rubro A</Label>
                  <Input type="number" value={rubroA} onChange={(e) => setRubroA(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rubro B</Label>
                  <Input type="number" value={rubroB} onChange={(e) => setRubroB(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rubro C</Label>
                  <Input type="number" value={rubroC} onChange={(e) => setRubroC(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rubro D</Label>
                  <Input type="number" value={rubroD} onChange={(e) => setRubroD(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Total General</Label>
                  <Input type="number" value={total} onChange={(e) => setTotal(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-none border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isUpdating || loadingData} className="bg-green-600 hover:bg-green-700">
            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Confirmar Aprobacion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
