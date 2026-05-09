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
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  // FASE B: PURGA
  const b = await client.query("DELETE FROM public.conferencias;");
  console.log("FASE B: " + b.rowCount + " registros eliminados");

  // FASE C: VERIFICACIÓN POST-PURGA

  // C1
  const c1 = await client.query("SELECT count(*) AS registros_despues_de_purga FROM public.conferencias;");
  console.log("FASE C - C1: " + c1.rows[0].registros_despues_de_purga);

  // C2
  const c2 = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conferencias'
    ORDER BY ordinal_position;
  `);
  console.log("FASE C - C2: " + c2.rows.length + " columnas");
  for (const row of c2.rows) {
    console.log("  " + row.column_name + " | " + row.data_type + " | nullable=" + row.is_nullable);
  }

  // C3
  const c3 = await client.query(`
    SELECT conname AS constraint_name, contype AS constraint_type, pg_get_constraintdef(oid) AS definicion
    FROM pg_constraint
    WHERE conrelid = 'public.conferencias'::regclass
    ORDER BY contype, conname;
  `);
  console.log("FASE C - C3: " + c3.rows.length + " constraints");
  for (const row of c3.rows) {
    console.log("  " + row.constraint_name + " | " + row.constraint_type + " | " + row.definicion);
  }

  // C4
  const c4 = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'conferencias' AND schemaname = 'public'
    ORDER BY indexname;
  `);
  console.log("FASE C - C4: " + c4.rows.length + " indices");
  for (const row of c4.rows) {
    console.log("  " + row.indexname + " | " + row.indexdef);
  }

  // C5
  const c5 = await client.query(`
    SELECT policyname, cmd AS operacion, qual AS condicion_using, with_check AS condicion_check
    FROM pg_policies
    WHERE tablename = 'conferencias' AND schemaname = 'public'
    ORDER BY policyname;
  `);
  console.log("FASE C - C5: " + c5.rows.length + " politicas RLS");
  for (const row of c5.rows) {
    console.log("  " + row.policyname + " | " + row.operacion + " | using=" + row.condicion_using + " | check=" + row.condicion_check);
  }

  await client.end();
}

main().catch((err) => {
  console.error("ERROR: " + err.message);
  process.exit(1);
});
