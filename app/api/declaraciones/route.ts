import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const declaraciones = await prisma.declaracionJurada.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        detalles: { include: { arancel: true } },
        registro: true,
        escribano: true
      }
    });
    return NextResponse.json(declaraciones);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { numerodj, codigodj, fecha_acto, fecha_vto, registroId, escribanoId, aranceltip, rubroA, rubroB, rubroC, rubroD, total, detalles } = body;

    if (!numerodj || !registroId || !escribanoId || detalles.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios o detalles' }, { status: 400 });
    }

    // EXTRAEMOS EL AÑO DE LA FECHA DE ACTO
    const anio = new Date(fecha_acto).getFullYear();

    const nuevaDJ = await prisma.declaracionJurada.create({
      data: {
        numerodj, codigodj, anio, // <--- GUARDAMOS EL AÑO AQUÍ
        fecha_acto: new Date(fecha_acto), fecha_vto: new Date(fecha_vto),
        registroId, escribanoId, aranceltip, rubroA, rubroB, rubroC, rubroD, total,
        detalles: {
          create: detalles.map((d: any) => ({
            monto: d.monto, arancelCalculado: d.arancelCalculado, arancelId: d.arancelId
          }))
        }
      },
      include: { detalles: true, registro: true, escribano: true }
    });

    return NextResponse.json(nuevaDJ, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Este número de DJ ya fue cargado para este Registro en el año seleccionado' }, { status: 400 });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, numerodj, codigodj, fecha_acto, fecha_vto, registroId, escribanoId, aranceltip, rubroA, rubroB, rubroC, rubroD, total, detalles } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const anio = new Date(fecha_acto).getFullYear(); // <--- EXTRAEMOS EL AÑO

    const actualizado = await prisma.declaracionJurada.update({
      where: { id },
      data: {
        numerodj, codigodj, anio, // <--- GUARDAMOS EL AÑO AQUÍ
        fecha_acto: new Date(fecha_acto), fecha_vto: new Date(fecha_vto),
        registroId, escribanoId, aranceltip, rubroA, rubroB, rubroC, rubroD, total,
        detalles: {
          deleteMany: {},
          create: detalles.map((d: any) => ({
            monto: d.monto, arancelCalculado: d.arancelCalculado, arancelId: d.arancelId
          }))
        }
      },
      include: { detalles: true, registro: true, escribano: true }
    });

    return NextResponse.json(actualizado);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Este número de DJ ya fue cargado para este Registro en el año seleccionado' }, { status: 400 });
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

// NUEVO: Método para ELIMINAR
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.declaracionJurada.delete({ where: { id } });
    return NextResponse.json({ message: 'Eliminada correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'No se puede eliminar' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { djIds, fecha_pago } = body;

    if (!djIds || !Array.isArray(djIds) || djIds.length === 0 || !fecha_pago) {
      return NextResponse.json({ error: 'Datos incompletos para procesar el pago' }, { status: 400 });
    }

    // Actualizamos todas las DJs seleccionadas asignándoles la fecha de pago
    const actualizados = await prisma.declaracionJurada.updateMany({
      where: {
        id: { in: djIds }
      },
      data: {
        fecha_pago: new Date(fecha_pago)
      }
    });

    return NextResponse.json({ message: 'Declaraciones marcadas como pagadas', count: actualizados.count });
  } catch (error) {
    return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
  }
}