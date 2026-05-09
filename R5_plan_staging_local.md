# FASE R-5 · STAGING LOCAL — PLAN TÉCNICO

**Clasificación:** Plan de Ejecución / Sometido a Auditoría  
**Fecha:** 07 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. OBJETIVO

Cargar los 5,866 registros de `catalogo_limpio.json` en un entorno de pruebas local antes de tocar producción. Validar conteos, integridad de slugs, Full Text Search y estructura de datos. Solo si staging sale limpio se autoriza R-6 (carga en producción).

---

## 2. ENTORNO DE STAGING

### Prerrequisitos en la máquina local

| Componente | Propósito |
|---|---|
| Docker Desktop | Supabase local corre sobre contenedores Docker |
| Supabase CLI | Levanta la instancia local de Supabase |
| Node.js | Ejecutar el script de carga |

### Montaje del entorno

Antigravity ejecutará en la terminal local del proyecto:

```bash
# 1. Instalar Supabase CLI (si no está instalado)
npm install -g supabase

# 2. Inicializar Supabase en el proyecto (si no está inicializado)
supabase init

# 3. Levantar la instancia local
supabase start
```

Al completar `supabase start`, la CLI imprime las credenciales locales:

```
API URL:        http://127.0.0.1:54321
DB URL:         postgresql://postgres:postgres@127.0.0.1:54322/postgres
anon key:       eyJ...
service_role:   eyJ...
```

Estas credenciales son locales y efímeras — no representan riesgo de seguridad.

---

## 3. REPLICACIÓN DEL SCHEMA DE PRODUCCIÓN

Antes de cargar datos, el entorno local debe tener el mismo schema que producción. Dos vías:

**Vía A — Si el proyecto ya tiene migraciones en `supabase/migrations/`:**

```bash
supabase db reset
```

Esto aplica todas las migraciones existentes y deja la base local idéntica a producción.

**Vía B — Si no hay migraciones locales:**

Exportar el schema de producción y aplicarlo en local:

```bash
# Desde el proyecto
supabase db pull
supabase db reset
```

**Verificación obligatoria:** Tras aplicar el schema, confirmar que la tabla `conferencias` existe con las 21 columnas, los 12 constraints (incluyendo `conferencias_fecha_rango` de R-3), el índice funcional `conferencias_normalized_slug_key`, y las 4 políticas RLS.

---

## 4. SCRIPT DE CARGA PARA STAGING

Se creará un script dedicado (`scripts/cargar_staging.mjs`) que:

1. Lee `catalogo_limpio.json`.
2. Se conecta a la instancia local de Supabase usando el SDK oficial con la `service_role` key local.
3. Inserta los registros en lotes de 100.
4. Registra el resultado de cada lote (éxito o error).
5. Emite un reporte final de conteos.

### Credenciales de conexión

El script usará exclusivamente las credenciales locales impresas por `supabase start`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'http://127.0.0.1:54321',          // API URL local
    'eyJ...'                             // service_role key local
);
```

**Principio de privilegio mínimo:** Se usa `service_role` porque la instancia local tiene RLS activo (réplica de producción) y la carga masiva lo requiere. Al ser una instancia local desechable, el riesgo es nulo.

### Lógica de inserción

```javascript
const BATCH_SIZE = 100;

for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const lote = registros.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
        .from('conferencias')
        .insert(lote);

    if (error) {
        console.error(`Lote ${i / BATCH_SIZE + 1} FALLÓ:`, error.message);
        // Detener la carga al primer error
        process.exit(1);
    }
    console.log(`Lote ${i / BATCH_SIZE + 1}: ${lote.length} registros insertados.`);
}
```

**Comportamiento ante error:** El script se detiene al primer lote fallido. No continúa insertando si hay problemas. Esto garantiza que un fallo de constraint o de tipo se detecte inmediatamente.

---

## 5. CRITERIOS DE ÉXITO Y PRUEBAS DE VALIDACIÓN

Tras la carga, se ejecutará un script de validación (`scripts/validar_staging.mjs`) que ejecute estas verificaciones contra la base local:

### Prueba 1 — Conteo total

```sql
SELECT count(*) AS total FROM conferencias;
```

**Esperado:** 5,866

### Prueba 2 — Cero slugs duplicados a nivel normalizado

```sql
SELECT public.normalize_slug(slug), count(*)
FROM conferencias
GROUP BY public.normalize_slug(slug)
HAVING count(*) > 1;
```

**Esperado:** 0 filas

### Prueba 3 — Distribución de fechas

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

**Esperado:** Distribución coherente entre 1970s, 1980s, 1990s, 2000s, 2010s, y 22 registros en SIN_FECHA.

### Prueba 4 — Todas las fechas dentro de rango

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

**Esperado:** Distribución consistente con el catálogo fuente.

### Prueba 6 — Full Text Search funcional

```sql
SELECT id, titulo, slug
FROM conferencias
WHERE fts @@ plainto_tsquery('spanish', 'revelacion truenos')
LIMIT 5;
```

**Esperado:** Registros relevantes devueltos. Si FTS no está populado (porque requiere trigger), documentar y resolver antes de R-6.

### Prueba 7 — Navegación por slug

```sql
SELECT id, titulo, slug, fecha_impartida
FROM conferencias
WHERE slug = 'la-revelacion-de-los-7-truenos-1974-08-04';
```

**Esperado:** Exactamente 1 registro.

### Prueba 8 — Integridad de constraints

Intentar insertar un registro que viole cada constraint y verificar que falla:

```sql
-- Debe fallar: fecha fuera de rango
INSERT INTO conferencias (id, slug, titulo, video_provider, video_status, created_at, updated_at, fecha_impartida)
VALUES (gen_random_uuid(), 'test-fecha-invalida', 'Test', 'none', 'pending', now(), now(), DATE '1960-01-01');

-- Debe fallar: slug duplicado normalizado
-- (solo si ya existe un registro con slug que normalice igual)
```

**Esperado:** Errores de constraint en ambos casos.

---

## 6. ROL DE ANTIGRAVITY EN R-5

### Autorizado

- Ejecutar `supabase init`, `supabase start`, `supabase db reset` en la terminal local.
- Crear y ejecutar `cargar_staging.mjs` contra la instancia local.
- Crear y ejecutar `validar_staging.mjs` contra la instancia local.
- Reportar resultados crudos de carga y validación.

### No autorizado

- Acceder a producción (Supabase remoto) de ninguna forma.
- Modificar `catalogo_limpio.json`.
- Modificar el schema local más allá de lo que las migraciones establezcan.
- Interpretar resultados ni emitir veredictos.

### Distinción clave

En R-5, Antigravity **sí tiene acceso a base de datos**, pero exclusivamente a la instancia local. La instancia local es desechable y aislada de producción. Esta autorización no aplica para la base de datos remota de Supabase.

---

## 7. ENTREGABLES DE R-5

Al concluir, Antigravity debe entregar:

1. **`cargar_staging.mjs`** — Script de carga.
2. **`validar_staging.mjs`** — Script de validación.
3. **Reporte de carga** — Resultado de cada lote (éxito/error).
4. **Reporte de validación** — Resultado de las 8 pruebas.

---

## 8. CRITERIO DE PASO A R-6

R-5 se considera exitosa si y solo si:

| Criterio | Umbral |
|---|---|
| Conteo total en staging | 5,866 |
| Slugs duplicados normalizados | 0 |
| Fechas fuera de rango | 0 |
| Registros sin fecha | 22 |
| FTS funcional | Sí (o documentado si requiere trigger) |
| Navegación por slug | Registro único por slug |
| Constraints activos y bloqueando | Sí |
| Errores de carga | 0 |

Solo con todas las pruebas pasadas y aprobación del Auditor se autoriza R-6.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
