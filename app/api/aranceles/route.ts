import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const aranceles = await prisma.arancel.findMany({
      orderBy: { codigoRenta: 'asc' }, // Ordenamos por código
    });
    return NextResponse.json(aranceles);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}

// Función auxiliar para parsear números o devolver 0 si está vacío
const parseNumber = (val: any) => {
  if (val === '' || val === null || val === undefined) return 0;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codigo, descripcion, minimo, maximo, porcentaje1, porcentaje2,porcentaje3, adicional, observaciones } = body;

    if (!codigo || !descripcion) {
      return NextResponse.json({ error: 'Código y Descripción son obligatorios' }, { status: 400 });
    }

    const nuevo = await prisma.arancel.create({
      data: {
        codigoRenta: codigo,
        descripcion,
        minimo: parseNumber(minimo),
        maximo: parseNumber(maximo),
        porcentaje1: parseNumber(porcentaje1),
        porcentaje2: parseNumber(porcentaje2),
        porcentaje3: parseNumber(porcentaje3),
        adicional: parseNumber(adicional),
      },
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'El código de arancel ya existe' }, { status: 400 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, codigo, descripcion, minimo, maximo, porcentaje1, porcentaje2,porcentaje3, adicional, observaciones } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const actualizado = await prisma.arancel.update({
      where: { id },
      data: {
        codigoRenta: codigo,
        descripcion,
        minimo: parseNumber(minimo),
        maximo: parseNumber(maximo),
        porcentaje1: parseNumber(porcentaje1),
        porcentaje2: parseNumber(porcentaje2),
        porcentaje3: parseNumber(porcentaje3),
        adicional: parseNumber(adicional),
      },
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