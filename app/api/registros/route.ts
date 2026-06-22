import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/get-user';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const registros = await prisma.registro.findMany({
      orderBy: { numero: 'asc' },
    });
    return NextResponse.json(registros);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { numero, direccion, estado, localidad } = body;

    if (!numero || !direccion) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const nuevo = await prisma.registro.create({
      data: { 
        numero, 
        direccion, 
        estado: estado || 'Activo',
        localidad: localidad || 'Salta Capital',
        createdById: user?.userId ?? null,
      },
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'El número de registro ya existe' }, { status: 400 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { id, numero, direccion, estado, localidad } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const actualizado = await prisma.registro.update({
      where: { id },
      data: { 
        numero, 
        direccion, 
        estado,
        localidad,
        updatedById: user?.userId ?? null,
      },
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.registro.delete({ where: { id } });

    return NextResponse.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'No se puede eliminar (posiblemente tenga escribanos asociados)' }, { status: 500 });
  }
}
