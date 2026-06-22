import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString());

    const escribano = await db.escribano.findUnique({
      where: { id },
      include: {
        declaraciones: {
          where: {
            anio,
            fecha_pago: { not: null },
          },
          orderBy: { fecha_acto: 'asc' },
        },
      },
    });

    if (!escribano) {
      return NextResponse.json(
        { error: 'Escribano no encontrado' },
        { status: 404 }
      );
    }

    const totalAportado = escribano.declaraciones.reduce(
      (sum, dj) => sum + (dj.rubroB + dj.rubroC + dj.rubroD),
      0
    );

    const totalGeneral = escribano.declaraciones.reduce(
      (sum, dj) => sum + dj.total,
      0
    );

    const resumenMensual = escribano.declaraciones.reduce((acc: Record<string, number>, dj) => {
      const mes = new Date(dj.fecha_acto).getMonth();
      const key = `${anio}-${String(mes + 1).padStart(2, '0')}`;
      acc[key] = (acc[key] || 0) + dj.total;
      return acc;
    }, {});

    return NextResponse.json({
      escribano: {
        id: escribano.id,
        nombre: escribano.nombre,
        matricula: escribano.matricula,
        cuit: escribano.cuit,
        dni: escribano.dni,
      },
      anio,
      totalDeclaraciones: escribano.declaraciones.length,
      totalAportado,
      totalGeneral,
      resumenMensual,
      declaraciones: escribano.declaraciones.map(dj => ({
        id: dj.id,
        numerodj: dj.numerodj,
        fecha_acto: dj.fecha_acto,
        fecha_pago: dj.fecha_pago,
        rubroA: dj.rubroA,
        rubroB: dj.rubroB,
        rubroC: dj.rubroC,
        rubroD: dj.rubroD,
        total: dj.total,
      })),
    });
  } catch (error) {
    console.error('Error al obtener aporte anual:', error);
    return NextResponse.json(
      { error: 'Error al obtener el aporte anual' },
      { status: 500 }
    );
  }
}
