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
  const aranceles = await db.arancel.findMany({ include: { reglas: true } });
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

function seleccionarRegla(arancel: any, monto: number, cantidadActos: number) {
  const reglas = arancel.reglas || [];
  if (reglas.length === 0) return null;

  if (monto === 0) {
    const r = reglas.find((r: any) => r.tipo === 'EXENTO');
    if (r) return r;
  }
  if (cantidadActos > 1) {
    const r = reglas.find((r: any) => r.tipo === 'COMBINADO');
    if (r) return r;
  }
  const r = reglas.find((r: any) => r.tipo === 'INDIVIDUAL');
  return r || null;
}

function calcularHonorarioConRegla(monto: number, arancel: any, cantidadActos: number): number {
  const regla = seleccionarRegla(arancel, monto, cantidadActos);
  const params = regla || arancel;
  const minimo = params.minimo || 0;
  const maximo = params.maximo || 0;
  const porcentaje1 = params.porcentaje1 || 0;
  const porcentaje2 = params.porcentaje2 || 0;
  const porcentaje3 = params.porcentaje3 || 0;
  const tc = params.tipoCalculo || 'NORMAL';

  if (tc === 'PORCENTAJE_SOBRE_TOTAL') return 0;

  let honorario = 0;
  if (maximo > 0 && monto > maximo) {
    const base = porcentaje1 > 0 ? maximo * (porcentaje1 / 100) : minimo;
    const excedente = monto - maximo;
    const extra = porcentaje2 > 0 ? excedente * (porcentaje2 / 100) : 0;
    honorario = base + extra;
  } else {
    honorario = porcentaje1 > 0 ? monto * (porcentaje1 / 100) : 0;
  }
  if (minimo > 0 && honorario < minimo) honorario = minimo;
  if (porcentaje3 > 0) honorario += (porcentaje3 / 100) * honorario;
  return honorario;
}

function calcularPorcentajeSobreTotal(arancel: any, monto: number, subtotalNormal: number, cantidadActos: number): number {
  const regla = seleccionarRegla(arancel, monto, cantidadActos);
  const params = regla || arancel;
  const tc = params.tipoCalculo || 'NORMAL';
  if (tc !== 'PORCENTAJE_SOBRE_TOTAL') return 0;
  const porcentaje3 = params.porcentaje3 || 0;
  return subtotalNormal * (porcentaje3 / 100);
}

async function getNextNumeroDJ(registroId: string, anio: number): Promise<string> {
  const existing = await db.declaracionJurada.findMany({ where: { registroId, anio }, orderBy: { numerodj: 'asc' }, select: { numerodj: true } });
  const nums = existing.map(e => parseInt(e.numerodj, 10)).filter(n => !isNaN(n));
  return (nums.length > 0 ? Math.max(...nums) + 1 : 1).toString();
}

async function calcularDetalles(actos: any[]): Promise<any[]> {
  if (!Array.isArray(actos) || actos.length === 0) return [];

  const cantidadActos = actos.length;
  let subtotalNormal = 0;
  const tempDetalles: any[] = [];

  for (const acto of actos) {
    const descripcion = acto.descripcion || '';
    const monto = parseFloat(acto.monto || 0);
    if (descripcion) {
      const arancel = await findArancelByDescripcion(descripcion);
      if (arancel) {
        const honorario = calcularHonorarioConRegla(monto, arancel, cantidadActos);
        subtotalNormal += honorario;
        tempDetalles.push({ monto, arancel, honorario, descripcion });
      }
    }
  }

  const detallesCreate: any[] = [];
  for (const td of tempDetalles) {
    const porcentajeExtra = calcularPorcentajeSobreTotal(td.arancel, td.monto, subtotalNormal, cantidadActos);
    td.honorario += porcentajeExtra;
    detallesCreate.push({
      monto: td.monto,
      arancelCalculado: td.honorario,
      arancelId: td.arancel.id,
    });
  }

  return detallesCreate;
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
    const { estado, observacion, fecha_pago: bodyFechaPago, ...overrides } = body;
    const fecha_pago = overrides.fecha_pago || bodyFechaPago;

    console.log(`PATCH /api/verificaciones/${id}/estado - estado: ${estado}`);

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
      data: {
        estado,
        ...(observacion !== undefined && { observacion }),
        updatedById: user?.userId ?? null,
      },
    });

    console.log(`Verificacion ${id} actualizada a ${estado}`);

    if (estado === 'APROBADA') {
      try {
        let registroId = overrides.registroId || verificacion.registroId;
        let registro = registroId
          ? await db.registro.findUnique({ where: { numero: registroId } })
          : null;

        if (!registro) {
          registro = await db.registro.findUnique({ where: { numero: (overrides.nro_registro || verificacion.nro_registro).toString() } });
        }

        let escribanoId = overrides.escribanoId || verificacion.escribanoId;
        let escribano = escribanoId
          ? await db.escribano.findUnique({ where: { id: escribanoId } })
          : null;

        if (!escribano) {
          const cuit = overrides.cuit_escribano || verificacion.cuit_escribano;
          if (cuit && cuit !== 'No encontrado') {
            const partes = cuit.split('-');
            const dni = partes.length === 3 ? partes[1].replace(/^0+/, '') : cuit.replace(/\D/g, '').slice(2, -1).replace(/^0+/, '');
            escribano = await db.escribano.findFirst({ where: { dni } });
          }
        }

        if (registro && escribano) {
          const fechaActoStr = overrides.fecha_acto || verificacion.fecha_acto;
          const fechaActoDate = fechaActoStr.includes('/')
            ? new Date(fechaActoStr.split('/').reverse().join('-') + 'T00:00:00')
            : new Date(fechaActoStr + 'T00:00:00');

          let fechaVtoDate: Date;
          if (overrides.fecha_vto) {
            fechaVtoDate = new Date(overrides.fecha_vto + 'T00:00:00');
          } else if (verificacion.fecha_vto && verificacion.fecha_vto !== 'No encontrado' && verificacion.fecha_vto.includes('/')) {
            fechaVtoDate = new Date(verificacion.fecha_vto.split('/').reverse().join('-') + 'T00:00:00');
          } else {
            fechaVtoDate = addBusinessDays(fechaActoDate, 15);
          }

          const anio = overrides.anio || verificacion.anio || fechaActoDate.getFullYear();
          const numerodj = overrides.numerodj || (verificacion.nro_escritura ? String(verificacion.nro_escritura) : await getNextNumeroDJ(registro.numero, anio));
          const codigodj = overrides.codigodj || (verificacion.codigo_dj ? String(verificacion.codigo_dj) : `AUTO-${Date.now()}`);
          const fp = fecha_pago ? new Date(fecha_pago + 'T00:00:00') : new Date();

          const existingDJ = await db.declaracionJurada.findFirst({
            where: { registroId: registro.numero, anio, numerodj, codigodj },
          });

          if (!existingDJ) {
            let actos = overrides.actos;
            if (!actos && verificacion.actos_resumen) {
              try { actos = JSON.parse(verificacion.actos_resumen); } catch { actos = []; }
            }

            const detallesCreate = await calcularDetalles(actos || []);

            await db.declaracionJurada.create({
              data: {
                numerodj,
                codigodj,
                fecha_acto: fechaActoDate,
                fecha_vto: fechaVtoDate,
                fecha_pago: fp,
                tipo_pago: overrides.tipo_pago || verificacion.tipo_pago || 'Banco',
                anio,
                aranceltip: overrides.aranceltip !== undefined ? overrides.aranceltip : verificacion.arancel_tip,
                rubroA: overrides.rubroA !== undefined ? overrides.rubroA : verificacion.rubroA,
                rubroB: overrides.rubroB !== undefined ? overrides.rubroB : verificacion.rubroB,
                rubroC: overrides.rubroC !== undefined ? overrides.rubroC : verificacion.rubroC,
                rubroD: overrides.rubroD !== undefined ? overrides.rubroD : verificacion.rubroD,
                total: overrides.total !== undefined ? overrides.total : verificacion.total_general,
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
