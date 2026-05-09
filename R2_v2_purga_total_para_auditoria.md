# FASE R-2 · PURGA TOTAL DE LA TABLA CONFERENCIAS

**Clasificación:** Script de Ejecución / Sometido a Auditoría Línea por Línea  
**Fecha:** 04 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Autorizado por:** Abg. Asdrúbal Lira — Administrador del Proyecto  
**Estado de aprobaciones:**  
- Arquitecto (Claude): ✅ Aprobado  
- Administrador (Abg. Asdrúbal Lira): ✅ Aprobado  
- Auditor (ChatGPT): ✅ Aprobado condicionalmente — pendiente revisión del script línea por línea  

**Ejecutor designado:** Antigravity AI

---

## 1. ACLARACIÓN SOBRE EL CANAL DE EJECUCIÓN

El Auditor estableció como condición obligatoria que la operación se ejecute vía SDK oficial con `SERVICE_ROLE_KEY`, vetando `DATABASE_URL` y el driver `pg`.

Para la carga masiva futura, esa condición es innegociable y se respetará íntegramente. Sin embargo, para esta operación administrativa puntual (una purga única de 301 registros), el canal propuesto es el **SQL Editor del dashboard de Supabase**, por las siguientes razones:

- Opera dentro del panel oficial de Supabase, no a través de un driver externo.
- Ejecuta las consultas bajo el rol `postgres` nativo del proyecto, igual que cualquier migración desde el dashboard.
- Deja registro en el historial de queries del SQL Editor, proporcionando trazabilidad nativa.
- No requiere script externo, no involucra el driver `pg`, no usa `DATABASE_URL` como connection string programático.
- Es la vía estándar que Supabase documenta para operaciones administrativas manuales sobre la base de datos.

Se solicita al Auditor que valide esta vía como aceptable para esta operación específica, manteniendo el veto al driver `pg` / `DATABASE_URL` para todo script de carga automatizado.

---

## 2. JUSTIFICACIÓN DE LA PURGA

Los hallazgos de R-1 confirmaron contaminación sistémica del lote piloto:

- Entre 25 y 35 pares de duplicados semánticos que eludieron el constraint UNIQUE.
- 13 registros con `fecha_impartida = NULL` por fallo del parser de fechas.
- 1 registro de prueba preexistente ajeno al lote piloto.
- Campos vacíos al 100% en `descripcion`, `ponente_rol`, `audio_url` y `serie_id`.

La remediación quirúrgica (tablas de decisión, DELETEs selectivos, reparación manual de fechas) duplicaría trabajo, ya que el pipeline debe corregirse de todas formas antes de la carga de los 5,500 registros restantes.

La purga resuelve todo en un solo ciclo: borrar, corregir pipeline, recargar limpio.

**Condiciones que la hacen viable:** No hay usuarios activos, no hay frontend en producción, el JSON fuente está intacto, y la operación no afecta schema, constraints, índices ni políticas RLS.

---

## 3. ALCANCE ESTRICTO

Esta operación **solo** hace lo siguiente:

- Verificar el estado actual de la tabla.
- Eliminar todas las filas de `public.conferencias`.
- Verificar que la tabla quedó vacía y la estructura intacta.

Esta operación **no** hace nada de lo siguiente:

- No modifica el schema.
- No altera constraints, índices ni políticas RLS.
- No toca otras tablas.
- No ejecuta normalización semántica.
- No ejecuta nueva carga de datos.
- No modifica el archivo `.env.local` ni credenciales.

---

## 4. SCRIPT SQL PARA AUDITORÍA

```sql
-- ============================================================
-- FASE R-2 · PURGA TOTAL DE LA TABLA CONFERENCIAS
-- Proyecto: Legado Patrimonial WSS
-- ============================================================
-- Emitido por: Claude (Arquitecto de Software)
-- Aprobado por: Abg. Asdrúbal Lira (Administrador del Proyecto)
-- Auditado por: ChatGPT (Auditor de Código y DB)
-- Fecha: 04 de abril de 2026
-- ============================================================
-- INSTRUCCIONES PARA ANTIGRAVITY:
--
-- 1. NO ejecutar hasta recibir confirmación explícita de que
--    el Auditor (ChatGPT) ha aprobado este script.
-- 2. Ejecutar en el SQL Editor del dashboard de Supabase.
-- 3. Ejecutar cada fase (A, B, C) por separado, en orden.
-- 4. Capturar y devolver TODOS los resultados de cada fase.
-- 5. Resultados CRUDOS. Sin interpretación. Sin diagnóstico.
--    Sin veredictos. Sin recomendaciones.
-- 6. Si alguna fase genera error, DETENER la ejecución
--    completa y reportar el error textualmente.
-- 7. Si la Fase A2 devuelve filas, DETENER la ejecución
--    completa y reportar. No ejecutar Fase B.
-- 8. Si la Fase A1 no devuelve exactamente 301, DETENER
--    la ejecución completa y reportar. No ejecutar Fase B.
-- ============================================================


-- ============================================================
-- FASE A: VERIFICACIÓN PRE-PURGA
-- ============================================================

-- A1. Conteo total actual (resultado esperado: 301)
SELECT count(*) AS registros_antes_de_purga
FROM public.conferencias;

-- A2. Verificar que no existan tablas con foreign keys
-- apuntando a conferencias (resultado esperado: 0 filas)
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

-- A3. Snapshot de estructura pre-purga
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conferencias'
ORDER BY ordinal_position;


-- ============================================================
-- FASE B: PURGA
-- ============================================================
-- PUNTO DE CONTROL OBLIGATORIO:
-- Ejecutar SOLO si A1 = 301 y A2 = 0 filas.
-- En cualquier otro caso, DETENER y reportar.
-- ============================================================

DELETE FROM public.conferencias;


-- ============================================================
-- FASE C: VERIFICACIÓN POST-PURGA
-- ============================================================

-- C1. Conteo total (resultado esperado: 0)
SELECT count(*) AS registros_despues_de_purga
FROM public.conferencias;

-- C2. Confirmar estructura intacta (debe coincidir con A3)
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conferencias'
ORDER BY ordinal_position;

-- C3. Confirmar constraints activos
SELECT
    conname  AS constraint_name,
    contype  AS constraint_type,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.conferencias'::regclass
ORDER BY contype, conname;

-- C4. Confirmar índices activos
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'conferencias'
  AND schemaname = 'public'
ORDER BY indexname;

-- C5. Confirmar políticas RLS activas
SELECT
    policyname,
    cmd        AS operacion,
    qual       AS condicion_using,
    with_check AS condicion_check
FROM pg_policies
WHERE tablename = 'conferencias'
  AND schemaname = 'public'
ORDER BY policyname;


-- ============================================================
-- FIN DEL SCRIPT R-2
-- ============================================================
-- Antigravity: devolver TODOS los resultados sin alteración.
-- Cero interpretación. Cero diagnóstico. Cero recomendaciones.
-- ============================================================
```

---

## 5. CRITERIOS DE ÉXITO

| Verificación | Resultado esperado | ¿Bloqueante? |
|---|---|---|
| A1 — Conteo pre-purga | 301 | Sí — si no es 301, no se ejecuta la purga |
| A2 — Foreign keys dependientes | 0 filas | Sí — si hay dependencias, no se ejecuta la purga |
| A3 — Snapshot de estructura | Registro de columnas | No — es evidencia |
| B — DELETE | Ejecución sin error | Sí |
| C1 — Conteo post-purga | 0 | Sí |
| C2 — Estructura post-purga | Idéntica a A3 | Sí |
| C3 — Constraints | Intactos | Sí |
| C4 — Índices | Intactos | Sí |
| C5 — Políticas RLS | Intactas | Sí |

---

## 6. BLOQUEO POST-PURGA

Tras completar R-2 exitosamente, **no se autoriza ninguna nueva inyección de datos** hasta que se completen en orden:

1. **R-3** — Endurecimiento selectivo del schema.
2. **R-4** — Refactorización del pipeline (normalización de slugs, parser de fechas, cuarentena).
3. **R-5** — Corrida completa en staging local.

Solo con staging limpio se autoriza R-6 (recarga del piloto en producción).

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
