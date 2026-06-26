import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const registro = searchParams.get('registro');
    const anio = searchParams.get('anio');
    const numerodj = searchParams.get('numerodj');
    const codigodj = searchParams.get('codigodj');

    if (!registro || !anio || !numerodj || !codigodj) {
      return NextResponse.json({ error: 'registro, anio, numerodj y codigodj son requeridos' }, { status: 400 });
    }

    const count = await db.declaracionJurada.count({
      where: {
        registroId: registro,
        anio: parseInt(anio, 10),
        numerodj,
        codigodj,
      },
    });

    return NextResponse.json({ duplicado: count > 0, count });
  } catch (error) {
    console.error('Error al verificar duplicado:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
