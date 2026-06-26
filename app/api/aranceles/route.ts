import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/get-user';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const aranceles = await prisma.arancel.findMany({
      orderBy: { codigoRenta: 'asc' },
      include: { reglas: true },
    });
    return NextResponse.json(aranceles);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}

const parseNumber = (val: any) => {
  if (val === '' || val === null || val === undefined) return 0;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { codigo, descripcion, tipoCalculo, minimo, maximo, porcentaje1, porcentaje2, porcentaje3, adicional, observaciones, reglas } = body;

    if (!codigo || !descripcion) {
      return NextResponse.json({ error: 'Código y Descripción son obligatorios' }, { status: 400 });
    }

    const nuevo = await prisma.arancel.create({
      data: {
        codigoRenta: codigo,
        descripcion,
        tipoCalculo: tipoCalculo || 'NORMAL',
        minimo: parseNumber(minimo),
        maximo: parseNumber(maximo),
        porcentaje1: parseNumber(porcentaje1),
        porcentaje2: parseNumber(porcentaje2),
        porcentaje3: parseNumber(porcentaje3),
        adicional: parseNumber(adicional),
        observaciones: observaciones || null,
        createdById: user?.userId ?? null,
        ...(Array.isArray(reglas) && reglas.length > 0 && {
          reglas: {
            create: reglas.map((r: any) => ({
              tipo: r.tipo,
              tipoCalculo: r.tipoCalculo || 'NORMAL',
              minimo: parseNumber(r.minimo),
              maximo: parseNumber(r.maximo),
              porcentaje1: parseNumber(r.porcentaje1),
              porcentaje2: parseNumber(r.porcentaje2),
              porcentaje3: parseNumber(r.porcentaje3),
              adicional: parseNumber(r.adicional),
              observaciones: r.observaciones || null,
            })),
          },
        }),
      },
      include: { reglas: true },
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'El código de arancel ya existe' }, { status: 400 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { id, codigo, descripcion, tipoCalculo, minimo, maximo, porcentaje1, porcentaje2, porcentaje3, adicional, observaciones, reglas } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    // Si se envian reglas, eliminar las existentes y recrear
    const updateData: any = {
      codigoRenta: codigo,
      descripcion,
      tipoCalculo: tipoCalculo || 'NORMAL',
      minimo: parseNumber(minimo),
      maximo: parseNumber(maximo),
      porcentaje1: parseNumber(porcentaje1),
      porcentaje2: parseNumber(porcentaje2),
      porcentaje3: parseNumber(porcentaje3),
      adicional: parseNumber(adicional),
      observaciones: observaciones || null,
      updatedById: user?.userId ?? null,
    };

    if (Array.isArray(reglas)) {
      // Eliminar reglas existentes y recrear
      await prisma.arancelRegla.deleteMany({ where: { arancelId: id } });
      updateData.reglas = {
        create: reglas.map((r: any) => ({
          tipo: r.tipo,
          tipoCalculo: r.tipoCalculo || 'NORMAL',
          minimo: parseNumber(r.minimo),
          maximo: parseNumber(r.maximo),
          porcentaje1: parseNumber(r.porcentaje1),
          porcentaje2: parseNumber(r.porcentaje2),
          porcentaje3: parseNumber(r.porcentaje3),
          adicional: parseNumber(r.adicional),
          observaciones: r.observaciones || null,
        })),
      };
    }

    const actualizado = await prisma.arancel.update({
      where: { id },
      data: updateData,
      include: { reglas: true },
    });

    return NextResponse.json(actualizado);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'El código de arancel ya existe' }, { status: 400 });
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.arancel.delete({ where: { id } });

    return NextResponse.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
