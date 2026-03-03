import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const escribanos = await request.json();

    if (!Array.isArray(escribanos) || escribanos.length === 0) {
      return NextResponse.json({ error: 'Formato de datos inválido o vacío' }, { status: 400 });
    }

    let agregados = 0;
    let omitidos = 0;

    for (const esc of escribanos) {
      try {
        let registroValido = null;
        if (esc.registroId) {
          const regExistente = await prisma.registro.findUnique({
            where: { numero: esc.registroId.toString() }
          });
          if (regExistente) registroValido = regExistente.numero;
        }

        await prisma.escribano.create({
          data: {
            nombre: esc.nombre,
            dni: esc.dni, // Se guarda el DNI que viene del Excel
            matricula: esc.matricula.toString(),
            condicion: esc.condicion || 'Titular',
            estado: esc.estado || 'Activo',
            registroId: registroValido,
          },
        });
        agregados++;
        
      } catch (error: any) {
        // Validación estricta del error
        if (error.code === 'P2002') {
          // P2002 = Constraint failed (La matrícula o DNI ya está registrada, lo ignoramos en silencio)
          omitidos++;
        } else {
          // OTRO ERROR: Lo imprimimos en la consola de tu VSC para saber qué está fallando
          console.error(`🚨 Error al guardar al escribano [${esc.nombre}]:`, error.message);
          omitidos++;
        }
      }
    }

    return NextResponse.json({ 
      message: 'Importación finalizada', 
      agregados, 
      omitidos 
    }, { status: 200 });

  } catch (error) {
    console.error('Error crítico en bulk import:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar el Excel' }, { status: 500 });
  }
}