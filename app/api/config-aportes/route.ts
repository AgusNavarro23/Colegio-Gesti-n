import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/get-user';

export async function GET() {
  try {
    const configs = await db.configuracionAporte.findMany({
      orderBy: { fechaInicio: 'desc' },
    });
    return NextResponse.json(configs);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener configuraciones' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { fechaInicio, fechaFin, montoA, montoB, montoC, montoD } = body;

    if (!fechaInicio || !fechaFin || montoA == null || montoB == null || montoC == null || montoD == null) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T23:59:59');

    if (fin <= inicio) {
      return NextResponse.json({ error: 'La fecha fin debe ser posterior a la fecha inicio' }, { status: 400 });
    }

    const overlaps = await db.configuracionAporte.findMany({
      where: {
        OR: [
          { fechaInicio: { lte: fin }, fechaFin: { gte: inicio } },
        ],
      },
    });

    if (overlaps.length > 0) {
      return NextResponse.json({ error: 'El periodo se solapa con una configuracion existente' }, { status: 400 });
    }

    const config = await db.configuracionAporte.create({
      data: {
        fechaInicio: inicio,
        fechaFin: fin,
        montoA: parseFloat(montoA),
        montoB: parseFloat(montoB),
        montoC: parseFloat(montoC),
        montoD: parseFloat(montoD),
        createdById: user?.userId ?? null,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { id, fechaInicio, fechaFin, montoA, montoB, montoC, montoD } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T23:59:59');

    if (fin <= inicio) {
      return NextResponse.json({ error: 'La fecha fin debe ser posterior a la fecha inicio' }, { status: 400 });
    }

    const overlaps = await db.configuracionAporte.findMany({
      where: {
        id: { not: id },
        OR: [
          { fechaInicio: { lte: fin }, fechaFin: { gte: inicio } },
        ],
      },
    });

    if (overlaps.length > 0) {
      return NextResponse.json({ error: 'El periodo se solapa con otra configuracion existente' }, { status: 400 });
    }

    const config = await db.configuracionAporte.update({
      where: { id },
      data: {
        fechaInicio: inicio,
        fechaFin: fin,
        montoA: parseFloat(montoA),
        montoB: parseFloat(montoB),
        montoC: parseFloat(montoC),
        montoD: parseFloat(montoD),
        updatedById: user?.userId ?? null,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.configuracionAporte.delete({ where: { id } });

    return NextResponse.json({ message: 'Configuracion eliminada' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
