import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/get-user';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const escribanos = await db.escribano.findMany({
      orderBy: { createdAt: 'desc' },
      include: { registro: true }
    });
    return NextResponse.json(escribanos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { nombre, matricula, condicion, estado, dni, registroId, categoria } = body;

    if (!nombre || !matricula) {
      return NextResponse.json({ error: 'Nombre y Matrícula son obligatorios' }, { status: 400 });
    }

    const nuevo = await db.escribano.create({
      data: {
        nombre,
        matricula,
        condicion: condicion || 'Titular',
        estado: estado || 'Activo',
        dni,
        categoria: categoria || 'D',
        ...(registroId ? { registro: { connect: { numero: registroId } } } : {}),
        createdById: user?.userId ?? null,
      } as any,
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'La matrícula ya existe' }, { status: 400 });
    }
    if (error.code === 'P2025') {
       return NextResponse.json({ error: 'El registro indicado no existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { id, nombre, matricula, condicion, estado, registroId, categoria } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const actualizado = await db.escribano.update({
      where: { id },
      data: {
        nombre,
        matricula,
        condicion,
        estado,
        categoria,
        ...(registroId
          ? { registro: { connect: { numero: registroId } } }
          : { registro: { disconnect: true } }),
        updatedById: user?.userId ?? null,
      } as any,
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

    await db.escribano.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
