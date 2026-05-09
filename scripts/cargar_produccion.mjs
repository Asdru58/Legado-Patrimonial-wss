// =========================================================
// Legado Patrimonial WSS — Fase R-5/R-6
// scripts/cargar_produccion.mjs
// Carga validada de catalogo_limpio.json en producción
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

if (!SUPABASE_URL) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL no encontrada en .env.local.');
  console.error('CARGA DETENIDA.');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no encontrada en .env.local.');
  console.error('CARGA DETENIDA.');
  process.exit(1);
}

// ─── Conexión SDK ───────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Configuración ──────────────────────────────────────
const BATCH_SIZE = 100;
const INPUT = join(process.cwd(), 'scripts', 'catalogo_limpio.json');

// ─── Campos autorizados para INSERT ─────────────────────
// Campos que PostgreSQL gestiona: id, created_at, updated_at, fts,
//   video_checked_at, serie_id
const CAMPOS_INSERT = [
  'slug', 'titulo', 'extracto', 'descripcion', 'fecha_impartida',
  'ponente_nombre', 'ponente_rol', 'audio_url', 'audio_duracion',
  'pdf_url', 'video_provider', 'video_provider_id',
  'video_fallback_provider', 'video_fallback_url', 'video_status',
];

/**
 * Mapea un registro del JSON a las columnas autorizadas.
 * No transforma, no re-normaliza, no re-parsea.
 * catalogo_limpio.json entra tal cual.
 */
function mapearRegistro(rec) {
  const row = {};
  for (const campo of CAMPOS_INSERT) {
    row[campo] = rec[campo] !== undefined ? rec[campo] : null;
  }
  return row;
}

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
//  EJECUCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('CARGA R-5/R-6 — PRODUCCIÓN');
  console.log('============================');

  // Cargar datos
  const catalogo = JSON.parse(readFileSync(INPUT, 'utf-8'));
  const totalRegistros = catalogo.length;

  console.log(`Fuente: catalogo_limpio.json`);
  console.log(`Total registros a cargar: ${totalRegistros}`);
  console.log('----');

  // Mapear todos los registros
  const registrosMapeados = catalogo.map(mapearRegistro);

  let totalInsertados = 0;
  let totalErrores = 0;

  for (let i = 0; i < registrosMapeados.length; i += BATCH_SIZE) {
    const loteNum = Math.floor(i / BATCH_SIZE) + 1;
    const lote = registrosMapeados.slice(i, i + BATCH_SIZE);
    const loteSize = lote.length;

    const { data, error } = await supabase
      .from('conferencias')
      .insert(lote)
      .select('id');

    if (error) {
      console.log(`Lote ${loteNum}: FALLÓ`);
      console.log(`Error: ${error.message}`);
      if (error.details) console.log(`Detalles: ${error.details}`);
      if (error.hint) console.log(`Hint: ${error.hint}`);
      console.log('CARGA DETENIDA.');
      totalErrores++;

      // ROLLBACK obligatorio
      await ejecutarRollback();

      // Resumen parcial
      console.log('----');
      console.log(`Total intentados:  ${i + loteSize}`);
      console.log(`Total insertados:  ${totalInsertados}`);
      console.log(`Errores:           ${totalErrores}`);
      console.log('============================');
      process.exit(1);
    }

    const insertados = data ? data.length : loteSize;
    totalInsertados += insertados;
    console.log(`Lote ${loteNum}: ${loteSize} registros → OK`);
  }

  // Resumen final
  console.log('----');
  console.log(`Total intentados:  ${totalRegistros}`);
  console.log(`Total insertados:  ${totalInsertados}`);
  console.log(`Errores:           ${totalErrores}`);
  console.log('============================');
}

main().catch(async (err) => {
  console.error('ERROR FATAL:', err.message);
  await ejecutarRollback();
  process.exit(1);
});
