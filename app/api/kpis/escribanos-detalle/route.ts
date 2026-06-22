import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const inicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const fin = fechaFin ? new Date(fechaFin + 'T23:59:59') : new Date();

    const configActiva = await db.configuracionAporte.findFirst({
      where: {
        fechaInicio: { lte: fin },
        fechaFin: { gte: inicio },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    const getMontoMinimo = (categoria: string): number => {
      if (!configActiva) return 50000;
      switch (categoria) {
        case 'A': return configActiva.montoA;
        case 'B': return configActiva.montoB;
        case 'C': return configActiva.montoC;
        case 'D': return configActiva.montoD;
        default: return configActiva.montoD;
      }
    };

    const escribanosActivos = await db.escribano.findMany({
      where: { estado: 'Activo' },
      include: {
        declaraciones: {
          where: { fecha_acto: { gte: inicio, lte: fin }, fecha_pago: { not: null } },
        },
      },
    });

    const escribanosConAporte = escribanosActivos.map(e => {
      const totalAportado = e.declaraciones.reduce((s, d) => s + d.rubroB + d.rubroC + d.rubroD, 0);
      const montoMinimo = getMontoMinimo(e.categoria);
      const diferencia = totalAportado - montoMinimo;
      const porcentajeCumplimiento = montoMinimo > 0 ? (totalAportado / montoMinimo) * 100 : 0;
      const cumpleMinimo = totalAportado >= montoMinimo;
      const enMora = totalAportado < montoMinimo * 0.5;

      return {
        id: e.id,
        nombre: e.nombre,
        matricula: e.matricula,
        cuit: e.cuit,
        dni: e.dni,
        categoria: e.categoria,
        totalAportado,
        montoMinimo,
        diferencia,
        porcentajeCumplimiento: Math.round(porcentajeCumplimiento * 100) / 100,
        cumpleMinimo,
        enMora,
        declaraciones: e.declaraciones.map(d => ({
          id: d.id,
          numerodj: d.numerodj,
          fecha_acto: d.fecha_acto.toISOString().split('T')[0],
          fecha_pago: d.fecha_pago ? d.fecha_pago.toISOString().split('T')[0] : null,
          rubroA: d.rubroA,
          rubroB: d.rubroB,
          rubroC: d.rubroC,
          rubroD: d.rubroD,
          total: d.total,
        })),
      };
    });

    const noCumplen = escribanosConAporte.filter(e => !e.cumpleMinimo);
    const enMora = escribanosConAporte.filter(e => e.enMora);
    const alDia = escribanosConAporte.filter(e => e.cumpleMinimo);

    return NextResponse.json({
      noCumplen,
      enMora,
      resumen: {
        totalActivos: escribanosActivos.length,
        alDia: alDia.length,
        noCumplen: noCumplen.length,
        enMora: enMora.length,
      },
    });
  } catch (error) {
    console.error('Error al obtener detalle de escribanos:', error);
    return NextResponse.json(
      { error: 'Error al obtener el detalle' },
      { status: 500 }
    );
  }
}
