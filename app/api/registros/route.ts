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
    // 1. AGREGA 'localidad' A LA EXTRACCIÓN DEL BODY
    const { numero, direccion, estado, localidad } = body;

    if (!numero || !direccion) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const nuevo = await prisma.registro.create({
      // 2. AGREGA 'localidad' A LOS DATOS DE PRISMA
      data: { 
        numero, 
        direccion, 
        estado: estado || 'Activo',
        localidad: localidad || 'Salta Capital' 
      },
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
    // 3. AGREGA 'localidad' EN EL MÉTODO PUT
    const { id, numero, direccion, estado, localidad } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const actualizado = await prisma.registro.update({
      where: { id },
      // 4. ACTUALIZA LA LOCALIDAD EN LA BASE DE DATOS
      data: { 
        numero, 
        direccion, 
        estado,
        localidad
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