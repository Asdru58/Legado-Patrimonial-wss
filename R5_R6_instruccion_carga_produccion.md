# INSTRUCCIÓN OPERATIVA — FASE R-5/R-6: CARGA VALIDADA EN PRODUCCIÓN

**Clasificación:** Orden de Ejecución / Dispensa Táctica Aprobada  
**Fecha:** 07 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Dirigido a:** Antigravity AI — Agente de Ejecución Local

---

## CONTEXTO

Las fases R-5 (staging) y R-6 (carga en producción) han sido fusionadas por excepción aprobada por el Arquitecto, el Auditor y el Administrador. La tabla `conferencias` está vacía y el schema blindado. Esta es una carga directa a producción con validación inmediata posterior.

---

## QUÉ DEBES HACER

Crear y ejecutar dos scripts:

1. `cargar_produccion.mjs` — Carga los 5,866 registros en producción.
2. `validar_produccion.mjs` — Ejecuta 8 pruebas de validación.

---

## SCRIPT 1: CARGA (`cargar_produccion.mjs`)

### Conexión

Usar el SDK oficial de Supabase con la `SERVICE_ROLE_KEY` del archivo `.env.local`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

Si `SUPABASE_SERVICE_ROLE_KEY` no está en `.env.local`, **detenerse y reportar**. No usar `DATABASE_URL` ni ninguna alternativa.

### Fuente de datos

Leer exclusivamente `scripts/catalogo_limpio.json`. Está **prohibido** cargar `catalogo_cuarentena.json`.

### Lógica de inserción

- Lotes de 100 registros.
- Detención al primer error. No continuar "a ver si pasa".
- Registrar en consola el resultado de cada lote.

### Mapeo de campos

El script debe mapear los campos del JSON a las columnas de la tabla `conferencias`. Campos a incluir en el INSERT:

```
slug, titulo, extracto, descripcion, fecha_impartida,
ponente_nombre, ponente_rol, audio_url, audio_duracion,
pdf_url, video_provider, video_provider_id,
video_fallback_provider, video_fallback_url, video_status
```

Campos que **no** se envían (los gestiona PostgreSQL):
- `id` → generado automáticamente (uuid)
- `created_at` → default de PostgreSQL
- `updated_at` → default de PostgreSQL
- `fts` → gestionado por trigger (si existe) o se populará después
- `video_checked_at` → null por defecto
- `serie_id` → null (taxonomías pendientes para fase posterior)

### Transformaciones prohibidas

El script **no** debe:
- Re-normalizar slugs.
- Re-parsear fechas.
- Modificar, filtrar ni reinterpretar datos del JSON.
- Aplicar lógica de deduplicación.

`catalogo_limpio.json` entra tal cual. R-5/R-6 es carga de artefacto saneado, no otro pipeline.

### Formato de salida de carga

```
CARGA R-5/R-6 — PRODUCCIÓN
============================
Fuente: catalogo_limpio.json
Total registros a cargar: [N]
----
Lote 1: 100 registros → OK
Lote 2: 100 registros → OK
...
Lote N: [X] registros → OK
----
Total intentados:  [N]
Total insertados:  [N]
Errores:           [N]
============================
```

Si hay error:

```
Lote X: FALLÓ
Error: [mensaje textual del error]
CARGA DETENIDA.
```

---

## SCRIPT 2: VALIDACIÓN (`validar_produccion.mjs`)

Ejecutar inmediatamente después de la carga exitosa. Usa la misma conexión SDK con `SERVICE_ROLE_KEY`.

### Prueba 1 — Conteo total

```javascript
const { count } = await supabase
    .from('conferencias')
    .select('*', { count: 'exact', head: true });
```

**Esperado:** 5,866

### Prueba 2 — Cero slugs duplicados exactos

```javascript
const { data } = await supabase.rpc('check_duplicate_slugs');
```

O ejecutar vía SQL si no hay RPC:

```sql
SELECT slug, count(*) FROM conferencias GROUP BY slug HAVING count(*) > 1;
```

**Esperado:** 0 filas

### Prueba 3 — Distribución temporal por década

```sql
SELECT
    CASE
        WHEN fecha_impartida IS NULL THEN 'SIN_FECHA'
        ELSE ((extract(year FROM fecha_impartida)::int / 10) * 10)::text || 's'
    END AS decada,
    count(*) AS cantidad
FROM conferencias
GROUP BY decada
ORDER BY decada;
```

**Esperado:** Distribución coherente con 22 registros en SIN_FECHA.

### Prueba 4 — Fechas dentro de rango

```sql
SELECT count(*) FROM conferencias
WHERE fecha_impartida IS NOT NULL
  AND (fecha_impartida < DATE '1974-01-01' OR fecha_impartida > DATE '2018-12-31');
```

**Esperado:** 0

### Prueba 5 — Distribución de video

```sql
SELECT video_provider, video_status, count(*)
FROM conferencias
GROUP BY video_provider, video_status
ORDER BY count(*) DESC;
```

**Esperado:** Distribución consistente con el catálogo.

### Prueba 6 — Full Text Search

```sql
SELECT id, titulo, slug
FROM conferencias
WHERE fts @@ plainto_tsquery('spanish', 'revelacion truenos')
LIMIT 5;
```

**Esperado:** Registros relevantes. Si devuelve 0 filas, documentar (puede requerir trigger de FTS no configurado aún). No es bloqueante si el resto pasa.

### Prueba 7 — Navegación por slug

```sql
SELECT id, titulo, slug, fecha_impartida
FROM conferencias
WHERE slug = 'la-revelacion-de-los-7-truenos-1974-08-04';
```

**Esperado:** Exactamente 1 registro.

### Prueba 8 — Constraint de fecha rechaza valor inválido

```sql
INSERT INTO conferencias (id, slug, titulo, video_provider, video_status, created_at, updated_at, fecha_impartida)
VALUES (gen_random_uuid(), 'test-constraint-fecha', 'Test Constraint', 'none', 'pending', now(), now(), DATE '1960-01-01');
```

**Esperado:** Error de constraint `conferencias_fecha_rango`. Tras confirmar el error, **no** limpiar nada — el registro nunca se insertó.

### Formato de salida de validación

```
VALIDACIÓN R-5/R-6 — PRODUCCIÓN
=================================
Prueba 1 (Conteo total):         [PASS/FAIL] → [resultado]
Prueba 2 (Slugs duplicados):     [PASS/FAIL] → [resultado]
Prueba 3 (Distribución décadas): [PASS/FAIL] → [resultado]
Prueba 4 (Fechas en rango):      [PASS/FAIL] → [resultado]
Prueba 5 (Distribución video):   [PASS/FAIL] → [resultado]
Prueba 6 (FTS):                  [PASS/FAIL/PENDIENTE] → [resultado]
Prueba 7 (Navegación slug):      [PASS/FAIL] → [resultado]
Prueba 8 (Constraint fecha):     [PASS/FAIL] → [resultado]
=================================
Resultado global: [APROBADO / FALLIDO]
=================================
```

---

## REGLA DE ROLLBACK

Si falla cualquier lote de carga **o** si falla cualquier prueba crítica (1, 2, 4, 7 u 8), ejecutar:

```javascript
const { error } = await supabase
    .from('conferencias')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
```

O vía SQL si es necesario:

```sql
TRUNCATE public.conferencias CASCADE;
```

Esto devuelve la tabla al estado limpio post-R-2. Se reporta el rollback y se espera instrucciones.

---

## QUÉ NO DEBES HACER

- No usar `DATABASE_URL`, `pg`, `psql` ni ningún canal fuera del SDK con `SERVICE_ROLE_KEY`.
- No cargar `catalogo_cuarentena.json`.
- No modificar datos del JSON durante la carga.
- No modificar el schema.
- No continuar tras un error de lote.
- No interpretar resultados. Devolver salida cruda.
- No emitir veredictos, diagnósticos ni recomendaciones.

---

## ENTREGABLES

1. `cargar_produccion.mjs` — Script de carga.
2. `validar_produccion.mjs` — Script de validación.
3. Salida de consola de carga (formato especificado arriba).
4. Salida de consola de validación (formato especificado arriba).

---

## SECUENCIA DE EJECUCIÓN

1. Verificar que `SUPABASE_SERVICE_ROLE_KEY` existe en `.env.local`. Si no existe, **detenerse**.
2. Ejecutar `cargar_produccion.mjs`. Si falla, **detenerse y reportar**.
3. Ejecutar `validar_produccion.mjs`. Si falla prueba crítica, ejecutar rollback y **reportar**.
4. Entregar los 4 entregables.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS

**Aprobaciones que respaldan esta instrucción:**  
- Arquitecto (Claude): ✅  
- Auditor (ChatGPT): ✅ Dispensa táctica aprobada condicionalmente  
- Administrador (Abg. Asdrúbal Lira): ✅
