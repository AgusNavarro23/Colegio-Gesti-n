import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/get-user';

const FERIADOS = ['01-01-2026', '17-02-2026', '03-03-2026', '24-03-2026', '02-04-2026', '10-04-2026', '01-05-2026', '25-05-2026', '20-06-2026', '09-07-2026', '20-07-2026', '17-08-2026', '12-10-2026', '10-11-2026', '08-12-2026', '25-12-2026'];

function addBusinessDays(startDate: Date, days: number): Date {
  let current = new Date(startDate);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const day = String(current.getDate()).padStart(2, '0');
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const year = current.getFullYear();
    const formatted = `${day}-${month}-${year}`;
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const isHoliday = FERIADOS.includes(formatted);
    if (!isWeekend && !isHoliday) added++;
  }
  return current;
}

async function findArancelByDescripcion(descripcion: string) {
  const aranceles = await db.arancel.findMany();
  let bestMatch: any = null;
  let bestScore = 0;
  const descLower = descripcion.toLowerCase().trim();
  for (const a of aranceles) {
    const codigo = a.codigoRenta.toLowerCase().trim();
    const desc = a.descripcion.toLowerCase().trim();
    const contains = (codigo && descLower.includes(codigo)) || (desc && descLower.includes(desc)) ? 0.9 : 0;
    const words = descLower.split(' ').filter(w => w.length > 3);
    let matchCount = 0;
    for (const w of words) {
      if (desc.includes(w)) matchCount++;
    }
    const wordScore = words.length > 0 ? matchCount / words.length : 0;
    const score = Math.max(contains, wordScore);
    if (score > bestScore) { bestScore = score; bestMatch = a; }
  }
  return bestScore >= 0.3 ? bestMatch : null;
}

async function getNextNumeroDJ(registroId: string, anio: number): Promise<string> {
  const existing = await db.declaracionJurada.findMany({ where: { registroId, anio }, orderBy: { numerodj: 'asc' }, select: { numerodj: true } });
  const nums = existing.map(e => parseInt(e.numerodj, 10)).filter(n => !isNaN(n));
  return (nums.length > 0 ? Math.max(...nums) + 1 : 1).toString();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { estado, fecha_pago } = body;

    console.log(`PATCH /api/verificaciones/${id}/estado - estado: ${estado}, fecha_pago: ${fecha_pago}`);

    if (!estado || !['APROBADA', 'RECHAZADA', 'PENDIENTE_REVISION'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado invalido. Debe ser APROBADA, RECHAZADA o PENDIENTE_REVISION' },
        { status: 400 }
      );
    }

    const verificacion = await db.declaracionVerificar.findUnique({ where: { id } });
    if (!verificacion) {
      return NextResponse.json({ error: 'Verificacion no encontrada' }, { status: 404 });
    }

    const updated = await db.declaracionVerificar.update({
      where: { id },
      data: { estado, updatedById: user?.userId ?? null },
    });

    console.log(`Verificacion ${id} actualizada a ${estado}`);

    if (estado === 'APROBADA') {
      try {
        // Usar IDs pre-resueltos (del POST) si existen, sino hacer lookup manual
        let registro = verificacion.registroId
          ? await db.registro.findUnique({ where: { numero: verificacion.registroId } })
          : null;
        let escribano = verificacion.escribanoId
          ? await db.escribano.findUnique({ where: { id: verificacion.escribanoId } })
          : null;

        // Fallback: si no se resolvieron al crear (ej: escribano agregado despues)
        if (!registro) {
          registro = await db.registro.findUnique({ where: { numero: verificacion.nro_registro.toString() } });
        }
        if (!escribano && verificacion.cuit_escribano && verificacion.cuit_escribano !== 'No encontrado') {
          const partes = verificacion.cuit_escribano.split('-');
          const dni = partes.length === 3 ? partes[1].replace(/^0+/, '') : verificacion.cuit_escribano.replace(/\D/g, '').slice(2, -1).replace(/^0+/, '');
          escribano = await db.escribano.findFirst({ where: { dni } });
        }

        if (registro && escribano) {
          const fechaActoDate = verificacion.fecha_acto.includes('/')
            ? new Date(verificacion.fecha_acto.split('/').reverse().join('-') + 'T00:00:00')
            : new Date(verificacion.fecha_acto + 'T00:00:00');

          let fechaVtoDate: Date;
          if (verificacion.fecha_vto && verificacion.fecha_vto !== 'No encontrado' && verificacion.fecha_vto.includes('/')) {
            fechaVtoDate = new Date(verificacion.fecha_vto.split('/').reverse().join('-') + 'T00:00:00');
          } else {
            fechaVtoDate = addBusinessDays(fechaActoDate, 15);
          }

          const anio = verificacion.anio || fechaActoDate.getFullYear();
          const numerodj = verificacion.nro_escritura ? String(verificacion.nro_escritura) : await getNextNumeroDJ(registro.numero, anio);
          const codigodj = verificacion.codigo_dj ? String(verificacion.codigo_dj) : `AUTO-${Date.now()}`;
          const fp = fecha_pago ? new Date(fecha_pago + 'T00:00:00') : new Date();

          const existingDJ = await db.declaracionJurada.findFirst({
            where: { numerodj, registroId: registro.numero, anio },
          });

          if (!existingDJ) {
            let detallesCreate: any[] = [];

            if (verificacion.actos_resumen) {
              try {
                const actos = JSON.parse(verificacion.actos_resumen);
                if (Array.isArray(actos)) {
                  for (const acto of actos) {
                    const descripcion = acto.descripcion || '';
                    const monto = parseFloat(acto.monto || 0);
                    if (descripcion && monto > 0) {
                      const arancel = await findArancelByDescripcion(descripcion);
                      if (arancel) {
                        detallesCreate.push({
                          monto,
                          arancelCalculado: (verificacion.arancel_calculado || 0) / (actos.length || 1),
                          arancelId: arancel.id,
                        });
                      }
                    }
                  }
                }
              } catch (e) {
                console.error('Error al parsear actos_resumen:', e);
              }
            }

            await db.declaracionJurada.create({
              data: {
                numerodj,
                codigodj,
                fecha_acto: fechaActoDate,
                fecha_vto: fechaVtoDate,
                fecha_pago: fp,
                tipo_pago: verificacion.tipo_pago || 'Banco',
                anio,
                aranceltip: verificacion.arancel_tip,
                rubroA: verificacion.rubroA,
                rubroB: verificacion.rubroB,
                rubroC: verificacion.rubroC,
                rubroD: verificacion.rubroD,
                total: verificacion.total_general,
                registroId: registro.numero,
                escribanoId: escribano.id,
                createdById: verificacion.createdById || user?.userId,
                detalles: { create: detallesCreate },
              },
            });
            console.log(`DJ creada para verificacion ${id} con ${detallesCreate.length} detalles`);
          } else {
            console.log(`DJ ya existe para verificacion ${id}, saltando creacion`);
          }
        } else {
          console.log(`No se pudo crear DJ: registro=${!!registro}, escribano=${!!escribano}`);
        }
      } catch (e) {
        console.error('Error al crear DJ desde aprobacion manual:', e);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el estado', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
