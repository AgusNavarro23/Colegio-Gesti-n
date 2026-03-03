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

    const nuevaDJ = await prisma.declaracionJurada.create({
      data: {
        numerodj,
        codigodj,
        fecha_acto: new Date(fecha_acto),
        fecha_vto: new Date(fecha_vto),
        registroId,
        escribanoId,
        aranceltip,
        rubroA,
        rubroB,
        rubroC,
        rubroD,
        total,
        detalles: {
          create: detalles.map((d: any) => ({
            monto: d.monto,
            arancelCalculado: d.arancelCalculado,
            arancelId: d.arancelId
          }))
        }
      },
      include: { detalles: true, registro: true, escribano: true }
    });

    return NextResponse.json(nuevaDJ, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'El número de DJ ya existe' }, { status: 400 });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}