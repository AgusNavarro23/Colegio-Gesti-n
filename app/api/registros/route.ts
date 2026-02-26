import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { numero, direccion, estado } = body;

    if (!numero || !direccion) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const nuevo = await prisma.registro.create({
      data: { numero, direccion, estado: estado || 'Activo' },
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'El número de registro ya existe' }, { status: 400 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, numero, direccion, estado } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const actualizado = await prisma.registro.update({
      where: { id },
      data: { numero, direccion, estado },
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
    // Si tiene escribanos asociados, Prisma lanzará error (dependiendo de la config), es mejor avisar
    return NextResponse.json({ error: 'No se puede eliminar (posiblemente tenga escribanos asociados)' }, { status: 500 });
  }
}