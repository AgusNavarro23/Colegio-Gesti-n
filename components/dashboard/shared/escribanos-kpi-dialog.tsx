'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  X, CheckCircle, XCircle, ChevronDown, ChevronRight, Users, AlertTriangle,
  DollarSign, TrendingUp
} from 'lucide-react';

interface Declaracion {
  id: string;
  numerodj: string;
  fecha_acto: string;
  fecha_pago: string | null;
  rubroA: number;
  rubroB: number;
  rubroC: number;
  rubroD: number;
  total: number;
}

interface Escribano {
  id: string;
  nombre: string;
  matricula: string;
  cuit: string | null;
  dni: string;
  categoria: string;
  totalAportado: number;
  montoMinimo: number;
  diferencia: number;
  porcentajeCumplimiento: number;
  cumpleMinimo: boolean;
  enMora: boolean;
  declaraciones: Declaracion[];
}

interface EscribanosKpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'cumplimiento' | 'mora';
  data: {
    noCumplen: Escribano[];
    enMora: Escribano[];
    resumen: {
      totalActivos: number;
      alDia: number;
      noCumplen: number;
      enMora: number;
    };
  } | null;
}

const formatMoney = (val: number) =>
  `$${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function EscribanosKpiDialog({ open, onOpenChange, tipo, data }: EscribanosKpiDialogProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) setExpandedRows(new Set());
  }, [open]);

  if (!data) return null;

  const escribanos = tipo === 'cumplimiento' ? data.noCumplen : data.enMora;
  const titulo = tipo === 'cumplimiento' ? 'Escribanos que No Cumplen el Aporte Minimo' : 'Escribanos en Mora Critica';
  const subtitulo = tipo === 'cumplimiento'
    ? `Escribanos activos cuyo aporte (B+C+D) es inferior al minimo de su categoria`
    : `Escribanos activos cuyo aporte es inferior al 50% del minimo de su categoria`;

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">{titulo}</DialogTitle>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] lg:max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-800 flex-none">
          <div>
            <h2 className="text-base sm:text-xl font-semibold text-white flex items-center gap-2">
              {tipo === 'cumplimiento' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
              {titulo}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 sm:px-6 py-4 bg-gray-50 border-b flex-none">
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full"><Users className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Activos</p>
                <p className="text-lg font-bold text-gray-900">{data.resumen.totalActivos}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-green-200 bg-green-50/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full"><CheckCircle className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="text-xs text-green-600">Al Dia</p>
                <p className="text-lg font-bold text-green-700">{data.resumen.alDia}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-orange-200 bg-orange-50/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-full"><TrendingUp className="w-4 h-4 text-orange-600" /></div>
              <div>
                <p className="text-xs text-orange-600">No Cumplen</p>
                <p className="text-lg font-bold text-orange-700">{data.resumen.noCumplen}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-red-200 bg-red-50/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full"><XCircle className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="text-xs text-red-600">En Mora</p>
                <p className="text-lg font-bold text-red-700">{data.resumen.enMora}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {escribanos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
              <p className="text-lg font-medium">No hay escribanos en esta categoria</p>
              <p className="text-sm">Todos los escribanos cumplen con el aporte minimo</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Escribano</TableHead>
                  <TableHead>Matricula</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Total Aportado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="text-right">% Cumplimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escribanos.map(e => {
                  const isExpanded = expandedRows.has(e.id);
                  return (
                    <>
                      <TableRow
                        key={e.id}
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${e.enMora ? 'bg-red-50/30' : 'bg-orange-50/20'}`}
                        onClick={() => toggleRow(e.id)}
                      >
                        <TableCell>
                          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-gray-500" />
                              : <ChevronRight className="w-4 h-4 text-gray-500" />
                            }
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{e.nombre}</TableCell>
                        <TableCell className="text-sm">{e.matricula}</TableCell>
                        <TableCell>
                          <Badge className={
                            e.categoria === 'A' ? 'bg-green-100 text-green-800 border-green-200' :
                            e.categoria === 'B' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            e.categoria === 'C' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }>
                            {e.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(e.totalAportado)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${e.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMoney(e.diferencia)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${e.porcentajeCumplimiento >= 100 ? 'text-green-600' : e.porcentajeCumplimiento >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                            {e.porcentajeCumplimiento.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {e.enMora
                            ? <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" /> Mora</Badge>
                            : <Badge className="bg-orange-500"><TrendingUp className="w-3 h-3 mr-1" /> No Cumple</Badge>
                          }
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-gray-50 p-0">
                            <div className="px-4 py-3">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Declaraciones de {e.nombre}
                              </h4>
                              {e.declaraciones.length === 0 ? (
                                <p className="text-sm text-gray-400 py-4 text-center">Sin declaraciones pagadas en el periodo</p>
                              ) : (
                                <Table>
                                  <TableHeader className="bg-gray-100">
                                    <TableRow>
                                      <TableHead>N° DJ</TableHead>
                                      <TableHead>Fecha Acto</TableHead>
                                      <TableHead>Fecha Pago</TableHead>
                                      <TableHead className="text-right">Rubro B</TableHead>
                                      <TableHead className="text-right">Rubro C</TableHead>
                                      <TableHead className="text-right">Rubro D</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {e.declaraciones.map(d => (
                                      <TableRow key={d.id} className="bg-white">
                                        <TableCell className="font-medium text-sm">{d.numerodj}</TableCell>
                                        <TableCell className="text-sm">{new Date(d.fecha_acto).toLocaleDateString('es-AR')}</TableCell>
                                        <TableCell className="text-sm">{d.fecha_pago ? new Date(d.fecha_pago).toLocaleDateString('es-AR') : <span className="text-orange-500">Pendiente</span>}</TableCell>
                                        <TableCell className="text-right text-sm">{formatMoney(d.rubroB)}</TableCell>
                                        <TableCell className="text-right text-sm">{formatMoney(d.rubroC)}</TableCell>
                                        <TableCell className="text-right text-sm">{formatMoney(d.rubroD)}</TableCell>
                                        <TableCell className="text-right text-sm font-semibold">{formatMoney(d.total)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
