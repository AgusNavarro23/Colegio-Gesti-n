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
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const existing = await db.declaracionJurada.findMany({
      where: { registroId, anio },
      orderBy: { numerodj: 'asc' },
      select: { numerodj: true },
    });
    const nums = existing.map(e => parseInt(e.numerodj, 10)).filter(n => !isNaN(n));
    const nextNum = (nums.length > 0 ? Math.max(...nums) + 1 : 1).toString();
    
    const conflict = await db.declaracionJurada.findFirst({
      where: { registroId, numerodj: nextNum },
    });
    if (!conflict) return nextNum;
  }
  return `${Date.now()}`;
}

async function crearDeclaracionJurada(item: any, registro: any, escribano: any, fechaPago: Date | null, createdById?: string) {
  const fechaActoDate = item.fecha_acto && item.fecha_acto.includes('/')
    ? new Date(item.fecha_acto.split('/').reverse().join('-') + 'T00:00:00')
    : new Date(item.fecha_acto + 'T00:00:00');

  let fechaVtoDate: Date;
  if (item.fecha_vto && item.fecha_vto !== 'No encontrado' && item.fecha_vto.includes('/')) {
    fechaVtoDate = new Date(item.fecha_vto.split('/').reverse().join('-') + 'T00:00:00');
  } else {
    fechaVtoDate = addBusinessDays(fechaActoDate, 15);
  }

  const anio = item.anio || fechaActoDate.getFullYear();
  const parsedEscritura = parseInt(String(item.nro_escritura || 0), 10);
  const numerodj = (parsedEscritura > 0 && !isNaN(parsedEscritura))
    ? String(parsedEscritura)
    : await getNextNumeroDJ(registro.numero, anio);
  const codigodj = item.codigo_dj !== undefined && item.codigo_dj !== null ? String(item.codigo_dj) : `AUTO-${Date.now()}`;
  const tipo_pago = item.tipo_pago || 'Banco';

  let detallesCreate: any[] = [];

  if (item.detalles_arancel && Array.isArray(item.detalles_arancel) && item.detalles_arancel.length > 0) {
    for (const detalle of item.detalles_arancel) {
      if (detalle.arancelId) {
        detallesCreate.push({
          monto: detalle.monto,
          arancelCalculado: detalle.arancelCalculado,
          arancelId: detalle.arancelId,
        });
      }
    }
  }

  if (detallesCreate.length === 0 && item.actos_resumen) {
    const actos = typeof item.actos_resumen === 'string'
      ? item.actos_resumen.split(' ; ')
      : item.actos_resumen;

    for (const acto of actos) {
      let descripcion: string, monto: number;
      if (typeof acto === 'string') {
        const partes = acto.split('|');
        if (partes.length === 3) {
          descripcion = partes[1].trim();
          monto = parseFloat(partes[2]);
        } else {
          continue;
        }
      } else {
        descripcion = acto.descripcion;
        monto = acto.monto;
      }

      if (!isNaN(monto) && monto > 0) {
        const arancel = await findArancelByDescripcion(descripcion);
        if (arancel) {
          const baseCalculado = (item.arancel_calculado || 0) / (actos.length || 1);
          const diferencia = (item.arancel_tip || 0) - (item.arancel_calculado || 0);
          let arancelCalculadoFinal = baseCalculado;

          if (diferencia > 0.01 && arancel.adicional && arancel.adicional > 0) {
            const adicionalesNecesarios = diferencia / arancel.adicional;
            const redondeados = Math.round(adicionalesNecesarios);
            if (Math.abs(adicionalesNecesarios - redondeados) < 0.01) {
              arancelCalculadoFinal = baseCalculado + (arancel.adicional * redondeados);
            }
          }

          detallesCreate.push({
            monto,
            arancelCalculado: arancelCalculadoFinal,
            arancelId: arancel.id,
          });
        }
      }
    }
  }

  const dj = await db.declaracionJurada.create({
    data: {
      numerodj,
      codigodj,
      fecha_acto: fechaActoDate,
      fecha_vto: fechaVtoDate,
      fecha_pago: fechaPago,
      tipo_pago,
      anio,
      aranceltip: item.arancel_tip || 0,
      rubroA: item.rubro_a || 0,
      rubroB: item.rubro_b || 0,
      rubroC: item.rubro_c || 0,
      rubroD: item.rubro_d || 0,
      total: item.total_general || 0,
      registroId: registro.numero,
      escribanoId: escribano.id,
      createdById,
      detalles: { create: detallesCreate },
    },
  });

  return dj;
}

async function resolveRegistroEscribano(nro_registro: number, cuit_escribano: string) {
  const registro = await db.registro.findUnique({
    where: { numero: nro_registro.toString() },
  });

  let escribano = null;
  if (cuit_escribano && cuit_escribano !== 'No encontrado') {
    const partes = cuit_escribano.split('-');
    const dni = partes.length === 3 ? partes[1].replace(/^0+/, '') : cuit_escribano.replace(/\D/g, '').slice(2, -1).replace(/^0+/, '');
    escribano = await db.escribano.findFirst({ where: { dni } });
  }

  return { registro, escribano };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const prioridad = searchParams.get('prioridad');
    const nivelRiesgo = searchParams.get('nivelRiesgo');

    const where: any = {};
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (nivelRiesgo) where.nivelRiesgo = nivelRiesgo;

    const verificaciones = await db.declaracionVerificar.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        registro: true,
        escribano: true,
      },
    });

    return NextResponse.json(verificaciones);
  } catch (error) {
    console.error('Error al obtener verificaciones:', error);
    return NextResponse.json(
      { error: 'Error al cargar las verificaciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : [body]);
    const fechaPagoStr = body.fecha_pago || null;
    const fechaPago = fechaPagoStr ? new Date(fechaPagoStr + 'T00:00:00') : null;

    const results: any[] = [];

    for (const item of items) {
      const archivoOrigen = String(item.archivoOrigen || item.archivo_origen || '');
      const nro_registro = parseInt(String(item.nro_registro || item.nroRegistro || 0), 10);
      const cuit_escribano = String(item.cuit_escribano || item.cuitEscribano || '');
      const nombre_oficial = String(item.nombre_oficial || item.nombreOficial || 'Desconocido');
      const fecha_acto_str = String(item.fecha_acto || item.fechaActo || '');
      const arancel_tip = parseFloat(String(item.arancel_tip || item.arancelTip || 0));
      const arancel_calculado = parseFloat(String(item.arancel_calculado || item.arancelCalculado || 0));
      const total_general = parseFloat(String(item.total_general || item.totalGeneral || 0));
      const prioridad = String(item.prioridad || 'BAJA');
      const nivelRiesgo = String(item.nivelRiesgo || item.nivel_riesgo || 'VERDE');
      const motivos_riesgo = String(item.motivos_riesgo || item.motivosRiesgo || '');
      const estado = String(item.estado || 'PENDIENTE_REVISION');

      const rubro_a = parseFloat(String(item.rubro_a || item.rubroA || 0));
      const rubro_b = parseFloat(String(item.rubro_b || item.rubroB || 0));
      const rubro_c = parseFloat(String(item.rubro_c || item.rubroC || 0));
      const rubro_d = parseFloat(String(item.rubro_d || item.rubroD || 0));
      const fecha_vto = String(item.fecha_vto || '');
      const tipo_pago = String(item.tipo_pago || 'Banco');
      const anio = parseInt(String(item.anio || 2026), 10);

      let nro_escritura = parseInt(String(item.nro_escritura || item.nroEscritura || item.escritura || 0), 10);
      if (isNaN(nro_escritura) || nro_escritura <= 0) {
        nro_escritura = 0;
      }

      const codigo_dj = parseInt(String(item.codigo_dj || item.codigoDJ || 0), 10);
      const pdfPath = String(item.pdfPath || item.pdf_path || '');
      const actos_resumen = item.actos_resumen ? (Array.isArray(item.actos_resumen) ? JSON.stringify(item.actos_resumen) : String(item.actos_resumen)) : null;
      const detalles_arancel = item.detalles_arancel ? JSON.stringify(item.detalles_arancel) : null;

      // Resolver Registro y Escribano antes de crear
      const { registro, escribano } = await resolveRegistroEscribano(nro_registro, cuit_escribano);

      const verificacion = await db.declaracionVerificar.create({
        data: {
          archivoOrigen,
          nro_registro,
          cuit_escribano,
          nombre_oficial,
          fecha_acto: fecha_acto_str,
          fecha_vto: fecha_vto || null,
          tipo_pago,
          anio,
          nro_escritura,
          codigo_dj,
          arancel_tip,
          arancel_calculado,
          total_general,
          rubroA: rubro_a,
          rubroB: rubro_b,
          rubroC: rubro_c,
          rubroD: rubro_d,
          prioridad,
          nivelRiesgo,
          motivos_riesgo,
          estado,
          actos_resumen,
          detalles_arancel,
          pdfPath: pdfPath || null,
          registroId: registro?.numero || null,
          escribanoId: escribano?.id || null,
          createdById: user?.userId ?? null,
        },
      });

      try {
        if (registro && escribano && estado === 'APROBADA_AUTO') {
          await crearDeclaracionJurada({
            ...item,
            fecha_acto: fecha_acto_str,
            arancel_tip,
            arancel_calculado,
            total_general,
          }, registro, escribano, fechaPago, user?.userId);

          await db.declaracionVerificar.update({
            where: { id: verificacion.id },
            data: { estado: 'APROBADA' },
          });
        }
      } catch (djError) {
        console.error('Error al crear DeclaracionJurada automatica:', djError);
      }

      results.push(verificacion);
    }

    return NextResponse.json(results.length === 1 ? results[0] : results, { status: 201 });
  } catch (error) {
    console.error('Error al crear verificacion:', error);
    return NextResponse.json(
      { error: 'Error al crear la verificacion', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    const body = await request.json();
    const verificacion = await db.declaracionVerificar.update({
      where: { id },
      data: { ...body, updatedById: user?.userId ?? null },
    });
    return NextResponse.json(verificacion);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    await db.declaracionVerificar.delete({ where: { id } });
    return NextResponse.json({ message: 'Eliminada' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
