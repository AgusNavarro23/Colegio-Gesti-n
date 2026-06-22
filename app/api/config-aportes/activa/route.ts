import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get('fecha');

    const fecha = fechaParam ? new Date(fechaParam + 'T00:00:00') : new Date();

    const config = await db.configuracionAporte.findFirst({
      where: {
        fechaInicio: { lte: fecha },
        fechaFin: { gte: fecha },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    if (!config) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: config.id,
      fechaInicio: config.fechaInicio.toISOString().split('T')[0],
      fechaFin: config.fechaFin.toISOString().split('T')[0],
      montoA: config.montoA,
      montoB: config.montoB,
      montoC: config.montoC,
      montoD: config.montoD,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener configuracion activa' }, { status: 500 });
  }
}
