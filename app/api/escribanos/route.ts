import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Obtener lista
export async function GET() {
  try {
    const escribanos = await prisma.escribano.findMany({
      orderBy: { createdAt: 'desc' },
      include: { registro: true } // Traemos la relación
    });
    return NextResponse.json(escribanos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}

// POST: Crear nuevo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, matricula, condicion, estado, registroId } = body;

    // Validación básica
    if (!nombre || !matricula) {
      return NextResponse.json({ error: 'Nombre y Matrícula son obligatorios' }, { status: 400 });
    }

    const nuevo = await prisma.escribano.create({
      data: {
        nombre,
        matricula,
        condicion: condicion || 'Titular',
        estado: estado || 'Activo',
        // Si registroId viene vacío, enviamos null, si no, conectamos
        registro: registroId ? { connect: { numero: registroId } } : undefined
      },
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    // Si el error es por matrícula duplicada (código P2002 en Prisma)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'La matrícula ya existe' }, { status: 400 });
    }
    // Si el registro no existe (código P2025)
    if (error.code === 'P2025') {
       return NextResponse.json({ error: 'El registro indicado no existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT: Editar existente
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nombre, matricula, condicion, estado, registroId } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const actualizado = await prisma.escribano.update({
      where: { id },
      data: {
        nombre,
        matricula,
        condicion,
        estado,
        // Lógica para actualizar relación: desconectar si está vacío, conectar si tiene valor
        registro: registroId 
          ? { connect: { numero: registroId } } 
          : { disconnect: true }
      },
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

// DELETE: Eliminar
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.escribano.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}