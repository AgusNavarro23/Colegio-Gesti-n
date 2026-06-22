import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const inicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const fin = fechaFin ? new Date(fechaFin + 'T23:59:59') : new Date();

    const verifsRechazadas = await db.declaracionVerificar.findMany({
      where: { estado: 'RECHAZADA' },
      select: { nro_registro: true, fecha_acto: true },
    });

    const rechazadasKeys = new Set(
      verifsRechazadas.map(v => `${v.nro_registro}-${v.fecha_acto}`)
    );

    const todasLasDJs = await db.declaracionJurada.findMany({
      where: {
        fecha_acto: { gte: inicio, lte: fin },
      },
      include: { escribano: true, registro: true },
    });

    const djsPeriodo = todasLasDJs.filter(dj => {
      const key = `${dj.registroId}-${dj.fecha_acto.toISOString().split('T')[0].split('-').reverse().join('/')}`;
      return !rechazadasKeys.has(key);
    });

    const verifsPeriodo = await db.declaracionVerificar.findMany({
      where: {
        fecha_acto: {
          gte: inicio.toISOString().split('T')[0].split('-').reverse().join('/'),
          lte: fin.toISOString().split('T')[0].split('-').reverse().join('/'),
        },
      },
    });

    const totalRecaudado = djsPeriodo.reduce((s, d) => s + d.total, 0);
    const totalAporteColegio = djsPeriodo.reduce((s, d) => s + d.rubroB + d.rubroC + d.rubroD, 0);
    const totalTeorico = djsPeriodo.reduce((s, d) => s + d.aranceltip, 0);
    const gapFiscal = totalTeorico - totalRecaudado;

    const escribanosActivos = await db.escribano.findMany({
      where: { estado: 'Activo' },
      include: {
        declaraciones: {
          where: { fecha_acto: { gte: inicio, lte: fin }, fecha_pago: { not: null } },
        },
      },
    });

    const configActiva = await db.configuracionAporte.findFirst({
      where: {
        fechaInicio: { lte: fin },
        fechaFin: { gte: inicio },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    const getMontoMinimo = (categoria: string): number => {
      if (!configActiva) return 50000;
      switch (categoria) {
        case 'A': return configActiva.montoA;
        case 'B': return configActiva.montoB;
        case 'C': return configActiva.montoC;
        case 'D': return configActiva.montoD;
        default: return configActiva.montoD;
      }
    };

    const escribanosAlDia = escribanosActivos.filter(e => {
      const totalEscribano = e.declaraciones.reduce((s, d) => s + d.rubroB + d.rubroC + d.rubroD, 0);
      return totalEscribano >= getMontoMinimo(e.categoria);
    }).length;

    const tasaCumplimiento = escribanosActivos.length > 0
      ? (escribanosAlDia / escribanosActivos.length) * 100
      : 0;

    const escribanosEnMora = escribanosActivos.filter(e => {
      const totalEscribano = e.declaraciones.reduce((s, d) => s + d.rubroB + d.rubroC + d.rubroD, 0);
      return totalEscribano < getMontoMinimo(e.categoria) * 0.5;
    }).length;

    const indiceMoraTemprana = escribanosActivos.length > 0
      ? (escribanosEnMora / escribanosActivos.length) * 100
      : 0;

    const totalVerifs = verifsPeriodo.length;
    const aprobadasAuto = verifsPeriodo.filter(v => v.estado === 'APROBADA' && v.nivelRiesgo === 'VERDE').length;
    const ratioSTP = totalVerifs > 0 ? (aprobadasAuto / totalVerifs) * 100 : 0;

    const verifsResueltas = verifsPeriodo.filter(v =>
      (v.estado === 'APROBADA' || v.estado === 'RECHAZADA') && v.nivelRiesgo === 'ROJO'
    );

    let mttrMinutos = 0;
    if (verifsResueltas.length > 0) {
      const totalMs = verifsResueltas.reduce((sum, v) => {
        const creado = new Date(v.createdAt).getTime();
        const actualizado = new Date(v.updatedAt).getTime();
        return sum + (actualizado - creado);
      }, 0);
      mttrMinutos = (totalMs / verifsResueltas.length) / (1000 * 60);
    }

    const alertasPorEscribano: Record<string, { nombre: string; count: number; cuit: string }> = {};
    for (const v of verifsPeriodo) {
      if (v.nivelRiesgo === 'ROJO' || v.nivelRiesgo === 'AMARILLO') {
        const key = v.cuit_escribano || v.nombre_oficial;
        if (!alertasPorEscribano[key]) {
          alertasPorEscribano[key] = { nombre: v.nombre_oficial, count: 0, cuit: v.cuit_escribano };
        }
        alertasPorEscribano[key].count++;
      }
    }

    const topOfensores = Object.values(alertasPorEscribano)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const falsosPositivos = verifsPeriodo.filter(v =>
      (v.nivelRiesgo === 'ROJO' || v.nivelRiesgo === 'AMARILLO') && v.estado === 'APROBADA'
    ).length;

    const totalRiesgoMedioAlto = verifsPeriodo.filter(v =>
      v.nivelRiesgo === 'ROJO' || v.nivelRiesgo === 'AMARILLO'
    ).length;

    const tasaFalsosPositivos = totalRiesgoMedioAlto > 0
      ? (falsosPositivos / totalRiesgoMedioAlto) * 100
      : 0;

    const noProcesables = verifsPeriodo.filter(v =>
      !v.archivoOrigen || v.archivoOrigen === '' || v.arancel_tip === 0
    ).length;

    const tasaNoProcesables = totalVerifs > 0
      ? (noProcesables / totalVerifs) * 100
      : 0;

    const monthsInRange: { mes: string; count: number; total: number }[] = [];
    let currentMonth = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const endMonth = new Date(fin.getFullYear(), fin.getMonth(), 1);

    while (currentMonth <= endMonth) {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      const djsInMonth = djsPeriodo.filter(dj => {
        const djDate = new Date(dj.fecha_acto);
        return djDate >= monthStart && djDate <= monthEnd;
      });

      monthsInRange.push({
        mes: currentMonth.toLocaleDateString('es-AR', { month: 'short' }),
        count: djsInMonth.length,
        total: djsInMonth.reduce((s, d) => s + d.total, 0),
      });

      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    const distribucionRiesgo = {
      verde: verifsPeriodo.filter(v => v.nivelRiesgo === 'VERDE').length,
      amarillo: verifsPeriodo.filter(v => v.nivelRiesgo === 'AMARILLO').length,
      rojo: verifsPeriodo.filter(v => v.nivelRiesgo === 'ROJO').length,
    };

    const distribucionEstado = {
      pendiente: verifsPeriodo.filter(v => v.estado === 'PENDIENTE_REVISION').length,
      aprobada: verifsPeriodo.filter(v => v.estado === 'APROBADA').length,
      rechazada: verifsPeriodo.filter(v => v.estado === 'RECHAZADA').length,
    };

    return NextResponse.json({
      financiero: {
        totalRecaudado,
        totalAporteColegio,
        totalTeorico,
        gapFiscal,
        tasaCumplimiento,
        indiceMoraTemprana,
        escribanosActivos: escribanosActivos.length,
        escribanosAlDia,
        escribanosEnMora,
        aporteMinimoMensual: configActiva ? configActiva.montoD : 50000,
      },
      procesos: {
        totalVerificaciones: totalVerifs,
        ratioSTP,
        mttrMinutos: Math.round(mttrMinutos * 100) / 100,
        topOfensores,
      },
      ia: {
        tasaFalsosPositivos: Math.round(tasaFalsosPositivos * 100) / 100,
        tasaNoProcesables: Math.round(tasaNoProcesables * 100) / 100,
        totalProcesados: totalVerifs,
        noProcesables,
      },
      charts: {
        djsPorMes: monthsInRange,
        distribucionRiesgo,
        distribucionEstado,
      },
    });
  } catch (error) {
    console.error('Error al calcular KPIs:', error);
    return NextResponse.json(
      { error: 'Error al calcular los indicadores' },
      { status: 500 }
    );
  }
}
