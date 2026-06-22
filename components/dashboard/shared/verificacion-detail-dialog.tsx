'use client';

import { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, Calendar, DollarSign, ListChecks, AlertTriangle, ChevronRight,
  X, CheckCircle, CheckCircle2, XCircle, XCircle as XCircleIcon
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

interface VerificacionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: Verificacion | null;
  onUpdateEstado: (id: string, nuevoEstado: string) => void;
  isUpdating: boolean;
}

const formatMoney = (val: number) =>
  `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getDiferencia = (v: Verificacion) => {
  if (v.arancel_calculado === 0) return 0;
  return ((Math.abs(v.arancel_tip - v.arancel_calculado) / v.arancel_calculado) * 100);
};

const parseDetalles = (detallesJson: string | null) => {
  if (!detallesJson) return [];
  try { return JSON.parse(detallesJson); } catch { return []; }
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

export function VerificacionDetailDialog({ open, onOpenChange, selectedItem, onUpdateEstado, isUpdating }: VerificacionDetailDialogProps) {
  const detailScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Detalle de Verificacion</DialogTitle>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] lg:max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-800 flex-none">
          <h2 className="text-base sm:text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" /> Detalle de Verificacion
          </h2>
          <button onClick={() => onOpenChange(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {selectedItem && (
          <div ref={detailScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Escribano</p>
                  <p className="font-bold text-gray-900">{selectedItem.nombre_oficial}</p>
                  <p className="text-sm text-gray-600">CUIT: {selectedItem.cuit_escribano}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Registro / Fecha</p>
                  <p className="font-bold text-gray-900">N° {selectedItem.nro_registro}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedItem.fecha_acto}</p>
                  <p className="text-xs text-gray-500 mt-2">DJ N° {selectedItem.nro_escritura} | Codigo: {selectedItem.codigo_dj}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Estado / Riesgo</p>
                  <div className="flex gap-2 mt-1">
                    {getEstadoBadge(selectedItem.estado)}
                    {getNivelBadge(selectedItem.nivelRiesgo)}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Ano: {selectedItem.anio} | Pago: {selectedItem.tipo_pago}</p>
                  {selectedItem.fecha_vto && <p className="text-xs text-gray-500">Vto: {selectedItem.fecha_vto}</p>}
                </CardContent>
              </Card>
            </div>

            {/* Comparativa Arancelaria */}
            <Card className="shadow-sm mb-6">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Comparativa Arancelaria
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">Arancel Declarado (PDF)</p>
                    <p className="text-2xl font-bold text-blue-800">{formatMoney(selectedItem.arancel_tip)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600">Arancel Calculado (Sistema)</p>
                    <p className="text-2xl font-bold text-purple-800">{formatMoney(selectedItem.arancel_calculado)}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${selectedItem.nivelRiesgo === 'ROJO' ? 'bg-red-50' : selectedItem.nivelRiesgo === 'AMARILLO' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                    <p className={`text-sm ${selectedItem.nivelRiesgo === 'ROJO' ? 'text-red-600' : selectedItem.nivelRiesgo === 'AMARILLO' ? 'text-yellow-600' : 'text-green-600'}`}>Diferencia</p>
                    <p className={`text-2xl font-bold ${selectedItem.nivelRiesgo === 'ROJO' ? 'text-red-800' : selectedItem.nivelRiesgo === 'AMARILLO' ? 'text-yellow-800' : 'text-green-800'}`}>
                      {getDiferencia(selectedItem).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalle de Actos */}
            <Card className="shadow-sm mb-6">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> Detalle de Actos
                </h3>
                {parseDetalles(selectedItem.detalles_arancel).length > 0 ? (
                  <Table>
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Descripcion del Tramite</TableHead>
                        <TableHead className="text-right">Monto Declarado</TableHead>
                        <TableHead className="text-right">Honorario Calc.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseDetalles(selectedItem.detalles_arancel).map((d: any, index: number) => (
                        <TableRow key={index} className="bg-white">
                          <TableCell className="font-medium">{d.arancelCodigo || d.codigo}</TableCell>
                          <TableCell>{d.descripcion}</TableCell>
                          <TableCell className="text-right text-gray-600">{formatMoney(d.monto)}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">{formatMoney(d.arancelCalculado)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Sin detalles de actos disponibles.</p>
                )}
              </CardContent>
            </Card>

            {/* Resumen de Liquidacion */}
            <div className="flex justify-end mb-6">
              <Card className="shadow-sm border-gray-200 md:w-96">
                <CardContent className="p-5 space-y-3">
                  <h4 className="font-semibold text-gray-900 border-b pb-2 mb-3">Resumen de Liquidacion</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Arancel Tipificado:</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedItem.arancel_tip)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Rubro A:</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedItem.rubroA)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Aporte Col. (Rubro B 12%):</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedItem.rubroB)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Caja Jubilacion (Rubro C 7%):</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedItem.rubroC)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fijo (Rubro D):</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedItem.rubroD)}</span>
                  </div>
                  <div className="h-px bg-gray-200 my-3"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-black text-primary">{formatMoney(selectedItem.total_general)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Motivos de Riesgo */}
            {selectedItem.motivos_riesgo && selectedItem.motivos_riesgo !== 'Validacion Exitosa' && (
              <Card className="shadow-sm border-red-200 mb-6">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Motivos de Riesgo
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {selectedItem.motivos_riesgo.split(' | ').map((motivo, idx) => (
                        <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{motivo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Archivo de Origen */}
            <Card className="shadow-sm mb-6">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Archivo de Origen
                </h3>
                <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-mono">{selectedItem.archivoOrigen}</span>
                  <div className="flex items-center gap-2">
                    {selectedItem.pdfPath && (
                      <Button variant="outline" size="sm" onClick={() => window.open(selectedItem.pdfPath!, '_blank')} className="text-red-600 border-red-300 hover:bg-red-50">
                        <FileText className="w-3.5 h-3.5 mr-1" /> Ver PDF
                      </Button>
                    )}
                    <Badge variant="outline" className="text-xs">{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString('es-AR') : ''}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botones de Accion */}
            {selectedItem.estado === 'PENDIENTE_REVISION' && (
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { onUpdateEstado(selectedItem.id, 'RECHAZADA'); onOpenChange(false); }} disabled={isUpdating} className="border-red-300 text-red-600 hover:bg-red-50">
                  <XCircleIcon className="w-4 h-4 mr-2" /> Rechazar
                </Button>
                <Button onClick={() => { onUpdateEstado(selectedItem.id, 'APROBADA'); onOpenChange(false); }} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Aprobar
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
