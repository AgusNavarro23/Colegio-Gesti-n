import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/get-user';
import { signToken } from '@/lib/jwt';
import { readFile } from 'fs/promises';
import path from 'path';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    if (current.getDay() !== 0 && current.getDay() !== 6 && !FERIADOS.includes(formatted)) added++;
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const fecha_pago = body.fecha_pago || null;

    const verificacion = await db.declaracionVerificar.findUnique({ where: { id } });
    if (!verificacion) {
      return NextResponse.json({ error: 'Verificacion no encontrada' }, { status: 404 });
    }

    if (!verificacion.pdfPath) {
      return NextResponse.json({ error: 'La verificacion no tiene PDF asociado' }, { status: 400 });
    }

    const pdfPath = path.join(process.cwd(), 'public', verificacion.pdfPath);
    const pdfBuffer = await readFile(pdfPath);
    const pdfName = verificacion.archivoOrigen || `reanalisis_${id}.pdf`;

    const serviceToken = signToken({
      userId: user?.userId || 'system',
      email: user?.email || 'system@notaria',
      role: 'ADMIN',
    });

    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('archivos', blob, pdfName);

    const fastapiRes = await fetch(`${FASTAPI_URL}/api/procesar-batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceToken}` },
      body: formData,
    });

    if (!fastapiRes.ok) {
      const errText = await fastapiRes.text();
      return NextResponse.json({ error: 'Error en FastAPI', detail: errText }, { status: 502 });
    }

    const fastapiData = await fastapiRes.json();
    const item = fastapiData.data?.[0];
    if (!item) {
      return NextResponse.json({ error: 'FastAPI no devolvio datos' }, { status: 502 });
    }

    const nuevoEstado = String(item.estado || 'PENDIENTE_REVISION');

    const updated = await db.declaracionVerificar.update({
      where: { id },
      data: {
        nro_registro: parseInt(String(item.nro_registro || verificacion.nro_registro), 10),
        cuit_escribano: String(item.cuit_escribano || verificacion.cuit_escribano),
        nombre_oficial: String(item.nombre_oficial || verificacion.nombre_oficial),
        fecha_acto: String(item.fecha_acto || verificacion.fecha_acto),
        fecha_vto: item.fecha_vto || verificacion.fecha_vto,
        nro_escritura: parseInt(String(item.nro_escritura || verificacion.nro_escritura), 10),
        codigo_dj: parseInt(String(item.codigo_dj || verificacion.codigo_dj), 10),
        arancel_tip: parseFloat(String(item.arancel_tip || verificacion.arancel_tip)),
        arancel_calculado: parseFloat(String(item.arancel_calculado || verificacion.arancel_calculado)),
        total_general: parseFloat(String(item.total_general || verificacion.total_general)),
        rubroA: parseFloat(String(item.rubro_a || item.rubroA || verificacion.rubroA)),
        rubroB: parseFloat(String(item.rubro_b || item.rubroB || verificacion.rubroB)),
        rubroC: parseFloat(String(item.rubro_c || item.rubroC || verificacion.rubroC)),
        rubroD: parseFloat(String(item.rubro_d || item.rubroD || verificacion.rubroD)),
        prioridad: String(item.prioridad || verificacion.prioridad),
        nivelRiesgo: String(item.nivelRiesgo || item.nivel_riesgo || verificacion.nivelRiesgo),
        motivos_riesgo: String(item.motivos_riesgo || item.motivosRiesgo || verificacion.motivos_riesgo),
        estado: nuevoEstado,
        actos_resumen: item.actos_resumen
          ? (Array.isArray(item.actos_resumen) ? JSON.stringify(item.actos_resumen) : String(item.actos_resumen))
          : verificacion.actos_resumen,
        detalles_arancel: item.detalles_arancel
          ? (Array.isArray(item.detalles_arancel) ? JSON.stringify(item.detalles_arancel) : String(item.detalles_arancel))
          : verificacion.detalles_arancel,
        observacion: null,
        updatedById: user?.userId ?? null,
      },
    });

    // Si quedo APROBADA_AUTO, crear DJ automaticamente
    if (nuevoEstado === 'APROBADA_AUTO') {
      try {
        let registro = updated.registroId
          ? await db.registro.findUnique({ where: { numero: updated.registroId } })
          : null;
        let escribano = updated.escribanoId
          ? await db.escribano.findUnique({ where: { id: updated.escribanoId } })
          : null;

        if (!registro) {
          registro = await db.registro.findUnique({ where: { numero: updated.nro_registro.toString() } });
        }
        if (!escribano && updated.cuit_escribano && updated.cuit_escribano !== 'No encontrado') {
          const partes = updated.cuit_escribano.split('-');
          const dni = partes.length === 3 ? partes[1].replace(/^0+/, '') : updated.cuit_escribano.replace(/\D/g, '').slice(2, -1).replace(/^0+/, '');
          escribano = await db.escribano.findFirst({ where: { dni } });
        }

        if (registro && escribano) {
          const fechaActoDate = updated.fecha_acto.includes('/')
            ? new Date(updated.fecha_acto.split('/').reverse().join('-') + 'T00:00:00')
            : new Date(updated.fecha_acto + 'T00:00:00');

          let fechaVtoDate: Date;
          if (updated.fecha_vto && updated.fecha_vto !== 'No encontrado' && updated.fecha_vto.includes('/')) {
            fechaVtoDate = new Date(updated.fecha_vto.split('/').reverse().join('-') + 'T00:00:00');
          } else {
            fechaVtoDate = addBusinessDays(fechaActoDate, 15);
          }

          const anio = updated.anio || fechaActoDate.getFullYear();
          const numerodj = updated.nro_escritura ? String(updated.nro_escritura) : await getNextNumeroDJ(registro.numero, anio);
          const codigodj = updated.codigo_dj ? String(updated.codigo_dj) : `AUTO-${Date.now()}`;
          const fp = fecha_pago ? new Date(fecha_pago + 'T00:00:00') : new Date();

          const existingDJ = await db.declaracionJurada.findFirst({
            where: { registroId: registro.numero, anio, numerodj, codigodj },
          });

          if (!existingDJ) {
            let detallesCreate: any[] = [];
            if (updated.actos_resumen) {
              try {
                const actos = JSON.parse(updated.actos_resumen);
                if (Array.isArray(actos)) {
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

                  for (const td of tempDetalles) {
                    const porcentajeExtra = calcularPorcentajeSobreTotal(td.arancel, td.monto, subtotalNormal, cantidadActos);
                    td.honorario += porcentajeExtra;
                    detallesCreate.push({
                      monto: td.monto,
                      arancelCalculado: td.honorario,
                      arancelId: td.arancel.id,
                    });
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
                tipo_pago: updated.tipo_pago || 'Banco',
                anio,
                aranceltip: updated.arancel_tip,
                rubroA: updated.rubroA,
                rubroB: updated.rubroB,
                rubroC: updated.rubroC,
                rubroD: updated.rubroD,
                total: updated.total_general,
                registroId: registro.numero,
                escribanoId: escribano.id,
                createdById: user?.userId,
                detalles: { create: detallesCreate },
              },
            });
          }
        }
      } catch (e) {
        console.error('Error al crear DJ desde re-analisis:', e);
      }
    }

    const result = await db.declaracionVerificar.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al re-analizar:', error);
    return NextResponse.json(
      { error: 'Error al re-analizar la verificacion', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
