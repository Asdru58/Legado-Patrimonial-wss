import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line && line.trim() && !line.startsWith('#')) {
    const [key, ...val] = line.split('=');
    if (key && val.length > 0) {
      envVars[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
    }
  }
});

async function run() {
  console.log("Iniciando Carga Piloto (C.2.1) - Bypass RLS via DATABASE_URL...");

  // 1. Cargar archivo
  const dataPath = 'scripts/catalogo_maestro_dryrun.json';
  const catalogo = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Segmentación
  const poolYoutube = [];
  const poolSinVideo = [];
  const pool78_00 = [];
  const pool01_18 = [];

  for (const item of catalogo) {
    const year = parseInt(item.fecha_impartida ? item.fecha_impartida.substring(0, 4) : '0');

    if (item.video_provider === 'youtube' && poolYoutube.length < 100) {
      poolYoutube.push(item);
    } else if (item.video_provider === 'none' && poolSinVideo.length < 100) {
      poolSinVideo.push(item);
    } else if (year >= 1978 && year <= 2000 && pool78_00.length < 50) {
      pool78_00.push(item);
    } else if (year >= 2001 && year <= 2018 && pool01_18.length < 50) {
      pool01_18.push(item);
    }
  }

  const batchList = [...poolYoutube, ...poolSinVideo, ...pool78_00, ...pool01_18];
  
  // Limpieza
  const cleanedData = batchList.map(item => {
    let clean = { ...item };
    delete clean._meta;
    delete clean.serie_id;
    if (clean.video_provider === 'none' || !clean.video_provider) {
      clean.video_provider = 'none';
      clean.video_status = 'pending';
    }
    return clean;
  });

  // DB Connection
  const client = new Client({
    connectionString: envVars.DATABASE_URL
  });
  await client.connect();

  let insertedCount = 0;
  const slugsAleatorios = [];
  
  try {
    for (let i = 0; i < cleanedData.length; i += 100) {
      const chunk = cleanedData.slice(i, i + 100);
      console.log(`Insertando lote ${Math.floor(i / 100) + 1} de ${Math.ceil(cleanedData.length / 100)}...`);
      
      const columns = Object.keys(chunk[0]);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      chunk.forEach(row => {
        const rowPlaceholders = [];
        columns.forEach(col => {
          values.push(row[col]);
          rowPlaceholders.push(`$${paramIndex++}`);
        });
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      });

      const query = `
        INSERT INTO conferencias (${columns.join(', ')}) 
        VALUES ${placeholders.join(', ')}
        RETURNING slug;
      `;

      const res = await client.query(query, values);
      insertedCount += res.rowCount;
      console.log(`[Lote ${i/100+1}] Exito. Insertados ${res.rowCount} registros.`);
      
      res.rows.slice(0, 4).forEach(r => slugsAleatorios.push(r.slug));
    }
    
    // Verificacion Post-Carga
    const countRes = await client.query('SELECT count(*) FROM conferencias');
    console.log(`\nVerificacion Post-Carga (SELECT count(*)): ${countRes.rows[0].count} registros ahora habitan en la tabla conferencias.`);
    
  } catch(err) {
    console.error("ERROR DB:", err);
  } finally {
    await client.end();
  }

  // 6. Reporte de cierre
  console.log("\n================ REPORT ===============");
  console.log(`Exito: Insertados ${insertedCount} registros saltando el RLS.`);
  console.log("Listado de 10 Slugs definitivos ya alojados en la DB:");
  slugsAleatorios.slice(0, 10).forEach((slug, idx) => {
    console.log(`  ${idx + 1}. ${slug}`);
  });
  console.log("=======================================");
}

run().catch(console.error);
