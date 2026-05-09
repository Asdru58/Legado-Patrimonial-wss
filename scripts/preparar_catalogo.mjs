// =========================================================
// Legado Patrimonial WSS — Fase R-4
// scripts/preparar_catalogo.mjs
// Pipeline: Carga → Normalización Slugs → Parser Fechas →
//           Clasificación → Limpieza y Salida
//
// Confinamiento local estricto: CERO acceso a base de datos.
// =========================================================

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─── Configuración de rutas ─────────────────────────────
const SCRIPTS_DIR = join(process.cwd(), 'scripts');
const INPUT = join(SCRIPTS_DIR, 'catalogo_maestro_dryrun.json');
const OUTPUT_LIMPIO = join(SCRIPTS_DIR, 'catalogo_limpio.json');
const OUTPUT_CUARENTENA = join(SCRIPTS_DIR, 'catalogo_cuarentena.json');
const OUTPUT_REPORTE = join(SCRIPTS_DIR, 'reporte_r4.txt');

// ─── Diccionario numérico cerrado (Condición 2) ────────
// Idéntico a normalize_slug en PostgreSQL (R-3)
const NUMERIC_WORDS = {
  'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
  'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
  'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14', 'quince': '15',
  'dieciseis': '16', 'diecisiete': '17', 'dieciocho': '18',
  'diecinueve': '19', 'veinte': '20',
};

// ─── Diccionario editorial cerrado (Condición 3) ───────
// Solo estas equivalencias. No ampliar sin autorización.
// 'cel' → 'celestial'
// 'mobil', 'book', 'otro' → eliminar sufijo (usar slug base sin él)
const EDITORIAL_EQUIVALENCES = {
  'cel': 'celestial',
};
const EDITORIAL_REMOVE = new Set(['mobil', 'book', 'otro']);

// ─── Diccionario de meses en español ────────────────────
const MESES_COMPLETOS = {
  'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
  'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
  'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
};

const MESES_ABREVIADOS = {
  'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
};

// Unificado para búsqueda
const MESES_ALL = { ...MESES_COMPLETOS, ...MESES_ABREVIADOS };

// ─── Rango de fechas válido ─────────────────────────────
const FECHA_MIN = new Date('1974-01-01T00:00:00Z');
const FECHA_MAX = new Date('2018-12-31T23:59:59Z');

// ═══════════════════════════════════════════════════════
//  FUNCIONES DE ETAPA
// ═══════════════════════════════════════════════════════

/**
 * Etapa 2: Normaliza un slug aplicando el mapeo numérico
 * y las equivalencias editoriales.
 * Réplica exacta de la lógica normalize_slug de PostgreSQL.
 */
function normalizeSlug(slug) {
  if (!slug || typeof slug !== 'string') return slug;

  const tokens = slug.split('-');
  const processed = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Eliminar sufijos editoriales (mobil, book, otro)
    if (EDITORIAL_REMOVE.has(lower)) {
      continue; // Simplemente omitir este token
    }

    // Reemplazar equivalencias editoriales (cel → celestial)
    if (Object.hasOwn(EDITORIAL_EQUIVALENCES, lower)) {
      processed.push(EDITORIAL_EQUIVALENCES[lower]);
      continue;
    }

    // Reemplazar palabras numéricas por cifras
    if (Object.hasOwn(NUMERIC_WORDS, lower)) {
      processed.push(NUMERIC_WORDS[lower]);
      continue;
    }

    // Token normal, pasar tal cual
    processed.push(lower);
  }

  // Reconstruir slug eliminando tokens vacíos y guiones redundantes
  return processed.filter(t => t.length > 0).join('-');
}

/**
 * Etapa 3: Parser de fechas robusto.
 * Retorna { fecha: 'YYYY-MM-DD' | null, motivo: string | null }
 */
function parseFecha(raw) {
  if (!raw || typeof raw !== 'string') {
    return { fecha: null, motivo: null }; // Sin dato, no es error parseable
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { fecha: null, motivo: null };
  }

  let year, month, day;

  // Formato ISO: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);

    // Detectar fechas con mes/día 00 (ej: "1974-00-00")
    if (month === 0 || day === 0) {
      return { fecha: null, motivo: null }; // Fecha incompleta, tratada como ausente
    }

    return validarFechaEnRango(year, month, day);
  }

  // Formato con mes en texto: "19 Marzo 1978" o "19 marzo 1978"
  const mesTextoMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+)\s+(\d{4})$/);
  if (mesTextoMatch) {
    day = parseInt(mesTextoMatch[1], 10);
    const mesStr = mesTextoMatch[2].toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    year = parseInt(mesTextoMatch[3], 10);

    const mesNum = MESES_ALL[mesStr];
    if (mesNum) {
      month = parseInt(mesNum, 10);
      return validarFechaEnRango(year, month, day);
    }
    return { fecha: null, motivo: 'fecha_no_parseable' };
  }

  // Formato corto con año de 2 dígitos: "21-05-78"
  const cortoMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (cortoMatch) {
    day = parseInt(cortoMatch[1], 10);
    month = parseInt(cortoMatch[2], 10);
    const yearShort = parseInt(cortoMatch[3], 10);
    // Asumir siglo XX para el rango 1974-2018
    year = yearShort >= 74 ? 1900 + yearShort : 2000 + yearShort;
    return validarFechaEnRango(year, month, day);
  }

  // Formato solo mes abreviado: "Nov", "Dic", etc. (sin día ni año)
  const mesAbrevMatch = trimmed.match(/^([A-Za-záéíóúñÁÉÍÓÚÑ]{3,})$/);
  if (mesAbrevMatch) {
    const mesStr = mesAbrevMatch[1].toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (MESES_ALL[mesStr]) {
      // Solo mes, sin año ni día → no parseable como fecha completa
      return { fecha: null, motivo: 'fecha_no_parseable' };
    }
  }

  // Si llegamos aquí, formato no reconocido
  return { fecha: null, motivo: 'fecha_no_parseable' };
}

/**
 * Valida que una fecha (year, month, day) sea válida y esté en rango.
 */
function validarFechaEnRango(year, month, day) {
  // Validar que la fecha sea calendáricamente correcta
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month - 1 ||
    dateObj.getUTCDate() !== day
  ) {
    return { fecha: null, motivo: 'fecha_no_parseable' };
  }

  // Validar rango 1974-01-01 a 2018-12-31
  if (dateObj < FECHA_MIN || dateObj > FECHA_MAX) {
    return { fecha: null, motivo: 'fecha_fuera_de_rango' };
  }

  // Formato ISO
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return { fecha: `${year}-${mm}-${dd}`, motivo: null };
}

// ═══════════════════════════════════════════════════════
//  EJECUCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════');
console.log('  FASE R-4 — Pipeline de Preparación Refactorizado');
console.log('  Confinamiento local estricto');
console.log('═══════════════════════════════════════════════════');
console.log('');

// ─── ETAPA 1: Carga ─────────────────────────────────────
console.log('[Etapa 1/5] Cargando catalogo_maestro_dryrun.json...');
const rawCatalog = JSON.parse(readFileSync(INPUT, 'utf-8'));
const totalEntrada = rawCatalog.length;
console.log(`      ✓ ${totalEntrada} registros de entrada cargados.`);
console.log('');

// ─── ETAPA 2: Normalización de slugs ────────────────────
console.log('[Etapa 2/5] Normalizando slugs...');

// Mapa de slug normalizado → índice del primer registro que lo tiene
const slugNormMap = new Map();
const slugCollisions = [];

for (let i = 0; i < rawCatalog.length; i++) {
  const rec = rawCatalog[i];
  const originalSlug = rec.slug || '';

  // Extraer solo la parte del slug sin la fecha al final
  // Los slugs tienen formato: "titulo-parte-YYYY-MM-DD" o "titulo-parte"
  let slugBase = originalSlug;
  let slugDateSuffix = '';
  const dateInSlugMatch = originalSlug.match(/^(.+?)-(\d{4}-\d{2}-\d{2})$/);
  if (dateInSlugMatch) {
    slugBase = dateInSlugMatch[1];
    slugDateSuffix = `-${dateInSlugMatch[2]}`;
  }

  // Normalizar la parte base del slug
  const normalizedBase = normalizeSlug(slugBase);
  const normalizedFull = normalizedBase + slugDateSuffix;

  rec._normalized_slug = normalizedFull;
  rec._original_slug = originalSlug;

  // Verificar colisión
  if (slugNormMap.has(normalizedFull)) {
    // El segundo (y siguientes) por orden de aparición → duplicado
    rec._is_duplicate = true;
    rec._duplicate_of_index = slugNormMap.get(normalizedFull);
    slugCollisions.push({
      index: i,
      slug_original: originalSlug,
      slug_normalizado: normalizedFull,
      colisiona_con_index: slugNormMap.get(normalizedFull),
    });
  } else {
    slugNormMap.set(normalizedFull, i);
    rec._is_duplicate = false;
  }
}

console.log(`      ✓ Slugs normalizados.`);
console.log(`      ✓ ${slugCollisions.length} colisiones detectadas.`);
if (slugCollisions.length > 0) {
  for (const col of slugCollisions) {
    console.log(`        ⚠ [${col.index}] "${col.slug_original}" → "${col.slug_normalizado}" (colisiona con #${col.colisiona_con_index})`);
  }
}
console.log('');

// ─── ETAPA 3: Parser de fechas ──────────────────────────
console.log('[Etapa 3/5] Parseando fechas...');

let fechasParseadas = 0;
let fechasNullOriginales = 0;
let fechasNoParseable = 0;
let fechasFueraDeRango = 0;

for (const rec of rawCatalog) {
  const rawFecha = rec.fecha_impartida;

  if (!rawFecha) {
    // Fecha ya era null en el catálogo fuente
    rec._fecha_parsed = null;
    rec._fecha_motivo = null;
    fechasNullOriginales++;
    continue;
  }

  const { fecha, motivo } = parseFecha(rawFecha);
  rec._fecha_parsed = fecha;
  rec._fecha_motivo = motivo;

  if (fecha) {
    fechasParseadas++;
  } else if (motivo === 'fecha_no_parseable') {
    fechasNoParseable++;
  } else if (motivo === 'fecha_fuera_de_rango') {
    fechasFueraDeRango++;
  }
}

console.log(`      ✓ Fechas parseadas correctamente:  ${fechasParseadas}`);
console.log(`      ✓ Fechas null desde origen:         ${fechasNullOriginales}`);
console.log(`      ✓ Fechas no parseables:             ${fechasNoParseable}`);
console.log(`      ✓ Fechas fuera de rango:            ${fechasFueraDeRango}`);
console.log('');

// ─── ETAPA 4: Clasificación ─────────────────────────────
console.log('[Etapa 4/5] Clasificando registros...');

const registrosLimpios = [];   // Completos + Parciales → catalogo_limpio.json
const registrosCuarentena = []; // Defectuosos → catalogo_cuarentena.json

let countCompletos = 0;
let countParciales = 0;
let countDefSlugDup = 0;
let countDefTituloFaltante = 0;
let countDefFechaNoParseable = 0;
let countDefFechaFueraRango = 0;

for (const rec of rawCatalog) {
  const titulo = (rec.titulo || '').trim();
  const isDuplicate = rec._is_duplicate === true;

  // Determinar motivo de exclusión (prioridad: título → slug → fecha)
  if (!titulo) {
    // Título faltante → Defectuoso
    registrosCuarentena.push({
      ...rec,
      motivo_exclusion: 'titulo_faltante',
    });
    countDefTituloFaltante++;
    continue;
  }

  if (isDuplicate) {
    // Slug duplicado → Defectuoso
    registrosCuarentena.push({
      ...rec,
      motivo_exclusion: 'slug_duplicado',
    });
    countDefSlugDup++;
    continue;
  }

  // Evaluar estado de fecha
  if (rec._fecha_motivo === 'fecha_no_parseable') {
    registrosCuarentena.push({
      ...rec,
      motivo_exclusion: 'fecha_no_parseable',
    });
    countDefFechaNoParseable++;
    continue;
  }

  if (rec._fecha_motivo === 'fecha_fuera_de_rango') {
    registrosCuarentena.push({
      ...rec,
      motivo_exclusion: 'fecha_fuera_de_rango',
    });
    countDefFechaFueraRango++;
    continue;
  }

  // Si llegamos aquí: título OK, slug único, fecha OK o null
  if (rec._fecha_parsed) {
    // Completo
    registrosLimpios.push({
      ...rec,
      fecha_impartida: rec._fecha_parsed,
      slug: rec._normalized_slug,
      fecha_status: 'complete',
    });
    countCompletos++;
  } else {
    // Parcial: título OK, slug único, pero fecha null
    registrosLimpios.push({
      ...rec,
      fecha_impartida: null,
      slug: rec._normalized_slug,
      fecha_status: 'missing',
    });
    countParciales++;
  }
}

console.log(`      ✓ Clasificación completada.`);
console.log(`        Completos (con fecha):       ${countCompletos}`);
console.log(`        Parciales (sin fecha):       ${countParciales}`);
console.log(`        Total limpios:               ${registrosLimpios.length}`);
console.log(`        En cuarentena:               ${registrosCuarentena.length}`);
console.log('');

// ─── ETAPA 5: Limpieza y salida ─────────────────────────
console.log('[Etapa 5/5] Limpiando campos y generando salida...');

/**
 * Limpia un registro para salida, eliminando nodos temporales
 * y asegurando campos requeridos.
 */
function limpiarRegistro(rec) {
  const limpio = { ...rec };

  // Eliminar nodos temporales del pipeline
  delete limpio._meta;
  delete limpio.serie_id;
  delete limpio.tematica_ids;

  // Eliminar marcas internas del pipeline R-4
  delete limpio._normalized_slug;
  delete limpio._original_slug;
  delete limpio._is_duplicate;
  delete limpio._duplicate_of_index;
  delete limpio._fecha_parsed;
  delete limpio._fecha_motivo;

  // Asegurar campos de video presentes
  if (!limpio.video_provider) limpio.video_provider = 'none';
  if (!limpio.video_status) limpio.video_status = 'pending';

  return limpio;
}

// Limpiar registros para salida
const salidaLimpia = registrosLimpios.map(limpiarRegistro);

// Para cuarentena: limpiar pero conservar motivo_exclusion
const salidaCuarentena = registrosCuarentena.map(rec => {
  const limpio = limpiarRegistro(rec);
  limpio.motivo_exclusion = rec.motivo_exclusion;
  return limpio;
});

// Escribir catalogo_limpio.json
writeFileSync(OUTPUT_LIMPIO, JSON.stringify(salidaLimpia, null, 2), 'utf-8');
console.log(`      ✓ ${OUTPUT_LIMPIO}`);
console.log(`        → ${salidaLimpia.length} registros.`);

// Escribir catalogo_cuarentena.json
writeFileSync(OUTPUT_CUARENTENA, JSON.stringify(salidaCuarentena, null, 2), 'utf-8');
console.log(`      ✓ ${OUTPUT_CUARENTENA}`);
console.log(`        → ${salidaCuarentena.length} registros.`);

// ─── Generar reporte ────────────────────────────────────
const reporte = `REPORTE R-4 — PIPELINE DE PREPARACIÓN
======================================
Total registros de entrada:        ${totalEntrada}
Total registros limpios:           ${registrosLimpios.length}
  - Completos (con fecha):         ${countCompletos}
  - Parciales (sin fecha):         ${countParciales}
Total registros en cuarentena:     ${registrosCuarentena.length}
  - Por slug duplicado:            ${countDefSlugDup}
  - Por título faltante:           ${countDefTituloFaltante}
  - Por fecha no parseable:        ${countDefFechaNoParseable}
  - Por fecha fuera de rango:      ${countDefFechaFueraRango}
Colisiones de slug detectadas:     ${slugCollisions.length}
======================================
`;

writeFileSync(OUTPUT_REPORTE, reporte, 'utf-8');
console.log(`      ✓ ${OUTPUT_REPORTE}`);

// Imprimir reporte en consola
console.log('');
console.log(reporte);

console.log('═══════════════════════════════════════════════════');
console.log('  R-4 COMPLETADO — Pipeline de Preparación');
console.log('═══════════════════════════════════════════════════');
