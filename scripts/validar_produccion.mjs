// =========================================================
// Legado Patrimonial WSS — Fase R-5/R-6
// scripts/validar_produccion.mjs
// 8 pruebas de validación post-carga
//
// Canal exclusivo: SDK @supabase/supabase-js + SERVICE_ROLE_KEY
// Prohibido: DATABASE_URL, pg, psql, SQL Editor
// =========================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// ─── Carga de variables de entorno desde .env.local ─────
const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line && line.trim() && !line.startsWith('#')) {
    const eqIndex = line.indexOf('=');
    if (eqIndex > 0) {
      const key = line.substring(0, eqIndex).trim();
      const val = line.substring(eqIndex + 1).trim().replace(/^"|"$/g, '');
      envVars[key] = val;
    }
  }
});

// ─── Verificación de credenciales ───────────────────────
const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Credenciales de Supabase no encontradas en .env.local.');
  process.exit(1);
}

// ─── Conexión SDK ───────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ═══════════════════════════════════════════════════════
//  ROLLBACK
// ═══════════════════════════════════════════════════════

/**
 * ROLLBACK: Vacía la tabla conferencias.
 * Devuelve la tabla al estado limpio post-R-2.
 */
async function ejecutarRollback() {
  console.log('');
  console.log('EJECUTANDO ROLLBACK...');
  const { error } = await supabase
    .from('conferencias')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error(`ERROR EN ROLLBACK: ${error.message}`);
  } else {
    console.log('ROLLBACK COMPLETADO — Tabla conferencias vaciada.');
  }
}

// ═══════════════════════════════════════════════════════
//  PRUEBAS DE VALIDACIÓN
// ═══════════════════════════════════════════════════════

const results = [];
const CRITICAL_TESTS = [1, 2, 4, 7, 8];
let criticalFail = false;

/**
 * Registra el resultado de una prueba.
 */
function registrar(num, nombre, status, detalle) {
  results.push({ num, nombre, status, detalle });
  if (status === 'FAIL' && CRITICAL_TESTS.includes(num)) {
    criticalFail = true;
  }
}

async function main() {
  console.log('');
  console.log('VALIDACIÓN R-5/R-6 — PRODUCCIÓN');
  console.log('=================================');

  // ─── Prueba 1: Conteo total ─────────────────────────
  {
    const { count, error } = await supabase
      .from('conferencias')
      .select('*', { count: 'exact', head: true });

    if (error) {
      registrar(1, 'Conteo total', 'FAIL', `Error: ${error.message}`);
    } else {
      const pass = count === 5866;
      registrar(1, 'Conteo total', pass ? 'PASS' : 'FAIL', `${count} registros (esperado: 5866)`);
    }
  }

  // ─── Prueba 2: Cero slugs duplicados exactos ───────
  {
    const { data, error } = await supabase.rpc('check_duplicate_slugs');

    if (error) {
      // Si no existe el RPC, verificar localmente
      const { data: allSlugs, error: slugError } = await supabase
        .from('conferencias')
        .select('slug');

      if (slugError) {
        registrar(2, 'Slugs duplicados', 'FAIL', `Error: ${slugError.message}`);
      } else {
        const slugCount = {};
        for (const row of allSlugs) {
          slugCount[row.slug] = (slugCount[row.slug] || 0) + 1;
        }
        const dups = Object.entries(slugCount).filter(([, c]) => c > 1);
        const pass = dups.length === 0;
        const detalle = pass
          ? '0 duplicados'
          : `${dups.length} slugs duplicados: ${dups.slice(0, 5).map(([s, c]) => `${s}(${c})`).join(', ')}`;
        registrar(2, 'Slugs duplicados', pass ? 'PASS' : 'FAIL', detalle);
      }
    } else {
      const pass = !data || data.length === 0;
      registrar(2, 'Slugs duplicados', pass ? 'PASS' : 'FAIL',
        pass ? '0 duplicados' : `${data.length} slugs duplicados`);
    }
  }

  // ─── Prueba 3: Distribución temporal por década ────
  {
    const { data, error } = await supabase
      .from('conferencias')
      .select('fecha_impartida');

    if (error) {
      registrar(3, 'Distribución décadas', 'FAIL', `Error: ${error.message}`);
    } else {
      const decadas = {};
      let sinFecha = 0;
      for (const row of data) {
        if (!row.fecha_impartida) {
          sinFecha++;
        } else {
          const year = parseInt(row.fecha_impartida.substring(0, 4));
          const decada = `${Math.floor(year / 10) * 10}s`;
          decadas[decada] = (decadas[decada] || 0) + 1;
        }
      }
      decadas['SIN_FECHA'] = sinFecha;

      const distribucion = Object.entries(decadas)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, c]) => `${d}:${c}`)
        .join(', ');

      const pass = sinFecha === 22;
      registrar(3, 'Distribución décadas', pass ? 'PASS' : 'FAIL',
        `SIN_FECHA=${sinFecha} (esperado: 22). ${distribucion}`);
    }
  }

  // ─── Prueba 4: Fechas dentro de rango ──────────────
  {
    const { data, error } = await supabase
      .from('conferencias')
      .select('id, slug, fecha_impartida')
      .not('fecha_impartida', 'is', null)
      .or('fecha_impartida.lt.1974-01-01,fecha_impartida.gt.2018-12-31');

    if (error) {
      registrar(4, 'Fechas en rango', 'FAIL', `Error: ${error.message}`);
    } else {
      const count = data ? data.length : 0;
      const pass = count === 0;
      const detalle = pass
        ? '0 fuera de rango'
        : `${count} fuera de rango: ${data.slice(0, 3).map(r => `${r.slug}→${r.fecha_impartida}`).join(', ')}`;
      registrar(4, 'Fechas en rango', pass ? 'PASS' : 'FAIL', detalle);
    }
  }

  // ─── Prueba 5: Distribución de video ───────────────
  {
    const { data, error } = await supabase
      .from('conferencias')
      .select('video_provider, video_status');

    if (error) {
      registrar(5, 'Distribución video', 'FAIL', `Error: ${error.message}`);
    } else {
      const dist = {};
      for (const row of data) {
        const key = `${row.video_provider}/${row.video_status}`;
        dist[key] = (dist[key] || 0) + 1;
      }
      const detalle = Object.entries(dist)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      registrar(5, 'Distribución video', 'PASS', detalle);
    }
  }

  // ─── Prueba 6: Full Text Search ────────────────────
  {
    const { data, error } = await supabase
      .from('conferencias')
      .select('id, titulo, slug')
      .textSearch('fts', 'revelacion truenos', { type: 'plain', config: 'spanish' })
      .limit(5);

    if (error) {
      registrar(6, 'FTS', 'PENDIENTE', `Error (puede requerir trigger): ${error.message}`);
    } else {
      const count = data ? data.length : 0;
      if (count > 0) {
        const hits = data.map(r => r.slug).join(', ');
        registrar(6, 'FTS', 'PASS', `${count} resultados: ${hits}`);
      } else {
        registrar(6, 'FTS', 'PENDIENTE', '0 resultados (puede requerir trigger de FTS)');
      }
    }
  }

  // ─── Prueba 7: Navegación por slug ─────────────────
  {
    const { data, error } = await supabase
      .from('conferencias')
      .select('id, titulo, slug, fecha_impartida')
      .eq('slug', 'la-revelacion-de-los-7-truenos-1974-08-04');

    if (error) {
      registrar(7, 'Navegación slug', 'FAIL', `Error: ${error.message}`);
    } else {
      const count = data ? data.length : 0;
      const pass = count === 1;
      const detalle = pass
        ? `1 registro: "${data[0].titulo}" (${data[0].fecha_impartida})`
        : `${count} registros (esperado: 1)`;
      registrar(7, 'Navegación slug', pass ? 'PASS' : 'FAIL', detalle);
    }
  }

  // ─── Prueba 8: Constraint de fecha rechaza inválido ─
  {
    const { data, error } = await supabase
      .from('conferencias')
      .insert({
        slug: 'test-constraint-fecha',
        titulo: 'Test Constraint',
        video_provider: 'none',
        video_status: 'pending',
        fecha_impartida: '1960-01-01',
      });

    if (error) {
      // Se espera que falle por el constraint
      const isConstraint = error.message.includes('conferencias_fecha_rango')
        || error.message.includes('check')
        || error.message.includes('constraint')
        || error.message.includes('violates')
        || error.code === '23514'; // CHECK violation
      registrar(8, 'Constraint fecha', isConstraint ? 'PASS' : 'FAIL',
        `Error recibido: ${error.message}`);
    } else {
      // Si se insertó, el constraint no existe — FAIL
      await supabase.from('conferencias').delete().eq('slug', 'test-constraint-fecha');
      registrar(8, 'Constraint fecha', 'FAIL', 'INSERT no fue rechazado — constraint ausente');
    }
  }

  // ═══════════════════════════════════════════════════════
  //  REPORTE FINAL
  // ═══════════════════════════════════════════════════════

  console.log('');
  for (const r of results) {
    const label = `Prueba ${r.num} (${r.nombre}):`;
    console.log(`${label.padEnd(38)} ${r.status} → ${r.detalle}`);
  }
  console.log('=================================');
  console.log(`Resultado global: ${criticalFail ? 'FALLIDO' : 'APROBADO'}`);
  console.log('=================================');

  // Si hay fallo crítico → ROLLBACK y salida
  if (criticalFail) {
    await ejecutarRollback();
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('ERROR FATAL:', err.message);
  await ejecutarRollback();
  process.exit(1);
});
