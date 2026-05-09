import pg from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function ejecutar() {
  await client.connect();

  // ============================================================
  // FASE A: VERIFICACIÓN PRE-PURGA
  // ============================================================

  // A1. Conteo total actual (resultado esperado: 301)
  const a1 = await client.query(`
    SELECT count(*) AS registros_antes_de_purga
    FROM public.conferencias;
  `);
  const conteo = parseInt(a1.rows[0].registros_antes_de_purga, 10);
  console.log(`FASE A - A1: ${conteo}`);

  if (conteo !== 301) {
    console.log(`DETENCIÓN OBLIGATORIA: A1 devolvió ${conteo}, esperado 301.`);
    await client.end();
    process.exit(1);
  }

  // A2. Verificar foreign keys dependientes (resultado esperado: 0 filas)
  const a2 = await client.query(`
    SELECT
        tc.table_name      AS tabla_dependiente,
        kcu.column_name    AS columna_fk,
        ccu.table_name     AS tabla_referenciada,
        ccu.column_name    AS columna_referenciada
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'conferencias'
      AND tc.table_schema = 'public';
  `);
  console.log(`FASE A - A2: ${a2.rows.length} filas`);

  if (a2.rows.length > 0) {
    console.log(`DETENCIÓN OBLIGATORIA: A2 devolvió filas:`);
    console.log(JSON.stringify(a2.rows, null, 2));
    await client.end();
    process.exit(1);
  }

  // A3. Snapshot de estructura pre-purga
  const a3 = await client.query(`
    SELECT
        column_name,
        data_type,
        is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conferencias'
    ORDER BY ordinal_position;
  `);
  console.log(`FASE A - A3: ${a3.rows.length} columnas`);
  for (const row of a3.rows) {
    console.log(`  ${row.column_name} | ${row.data_type} | nullable=${row.is_nullable}`);
  }

  // ============================================================
  // FASE B: PURGA
  // ============================================================
  const b = await client.query(`DELETE FROM public.conferencias;`);
  console.log(`FASE B: ${b.rowCount} registros eliminados`);

  // ============================================================
  // FASE C: VERIFICACIÓN POST-PURGA
  // ============================================================

  // C1. Conteo total (resultado esperado: 0)
  const c1 = await client.query(`
    SELECT count(*) AS registros_despues_de_purga
    FROM public.conferencias;
  `);
  console.log(`FASE C - C1: ${c1.rows[0].registros_despues_de_purga}`);

  // C2. Confirmar estructura intacta
  const c2 = await client.query(`
    SELECT
        column_name,
        data_type,
        is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conferencias'
    ORDER BY ordinal_position;
  `);
  console.log(`FASE C - C2: ${c2.rows.length} columnas`);
  for (const row of c2.rows) {
    console.log(`  ${row.column_name} | ${row.data_type} | nullable=${row.is_nullable}`);
  }

  // C3. Confirmar constraints activos
  const c3 = await client.query(`
    SELECT
        conname  AS constraint_name,
        contype  AS constraint_type,
        pg_get_constraintdef(oid) AS definicion
    FROM pg_constraint
    WHERE conrelid = 'public.conferencias'::regclass
    ORDER BY contype, conname;
  `);
  console.log(`FASE C - C3: ${c3.rows.length} constraints`);
  for (const row of c3.rows) {
    console.log(`  ${row.constraint_name} | ${row.constraint_type} | ${row.definicion}`);
  }

  // C4. Confirmar índices activos
  const c4 = await client.query(`
    SELECT
        indexname,
        indexdef
    FROM pg_indexes
    WHERE tablename = 'conferencias'
      AND schemaname = 'public'
    ORDER BY indexname;
  `);
  console.log(`FASE C - C4: ${c4.rows.length} índices`);
  for (const row of c4.rows) {
    console.log(`  ${row.indexname} | ${row.indexdef}`);
  }

  // C5. Confirmar políticas RLS activas
  const c5 = await client.query(`
    SELECT
        policyname,
        cmd        AS operacion,
        qual       AS condicion_using,
        with_check AS condicion_check
    FROM pg_policies
    WHERE tablename = 'conferencias'
      AND schemaname = 'public'
    ORDER BY policyname;
  `);
  console.log(`FASE C - C5: ${c5.rows.length} políticas RLS`);
  for (const row of c5.rows) {
    console.log(`  ${row.policyname} | ${row.operacion} | using=${row.condicion_using} | check=${row.condicion_check}`);
  }

  await client.end();
}

ejecutar().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
