# R-3 · INTERVENCIÓN 1 — FUNCIÓN DE NORMALIZACIÓN E ÍNDICE FUNCIONAL

**Clasificación:** Script de Migración / Sometido a Auditoría  
**Fecha:** 07 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)  
**Ejecutor designado:** Por definir tras aprobación

---

## 1. OBJETIVO

Crear una función SQL determinista que normalice las palabras numéricas escritas en español dentro de un slug, y un índice único funcional basado en esa función que impida la inserción de slugs semánticamente duplicados por variación numérica.

---

## 2. DISEÑO DE LA FUNCIÓN

### Principios de diseño (alineados con el dictamen del Auditor):

- **Conservadora:** Solo transforma un conjunto cerrado y explícito de equivalencias.
- **Determinista:** La misma entrada siempre produce la misma salida.
- **Sin heurística:** No interpreta contexto, no adivina, no reescribe texto libre.
- **Auditable:** El mapeo completo está visible en el código fuente.
- **Inmutable:** Declarada como `IMMUTABLE` para que PostgreSQL pueda usarla en índices.

### Mapeo de equivalencias:

El conjunto cubre los números cardinales del español de uso común en el catálogo, delimitados por guiones dentro del slug (que es el separador estándar según el CHECK `conferencias_slug_format`):

| Palabra en slug | Se normaliza a |
|---|---|
| uno | 1 |
| dos | 2 |
| tres | 3 |
| cuatro | 4 |
| cinco | 5 |
| seis | 6 |
| siete | 7 |
| ocho | 8 |
| nueve | 9 |
| diez | 10 |
| once | 11 |
| doce | 12 |
| trece | 13 |
| catorce | 14 |
| quince | 15 |
| dieciseis | 16 |
| diecisiete | 17 |
| dieciocho | 18 |
| diecinueve | 19 |
| veinte | 20 |

**Nota:** Los slugs ya están en minúsculas y sin acentos por definición del CHECK `conferencias_slug_format` (solo permite `[a-z0-9]` y guiones). Por lo tanto, `dieciséis` ya llegaría como `dieciseis`. No se necesita manejo de acentos.

---

## 3. SCRIPT SQL

```sql
-- ============================================================
-- R-3 · INTERVENCIÓN 1
-- Función de normalización de slugs + Índice único funcional
-- Proyecto: Legado Patrimonial WSS
-- ============================================================
-- Emitido por: Claude (Arquitecto de Software)
-- Pendiente de aprobación: ChatGPT (Auditor de Código y DB)
-- Fecha: 07 de abril de 2026
-- ============================================================
-- INSTRUCCIONES PARA EL EJECUTOR:
-- 1. NO ejecutar hasta recibir aprobación del Auditor.
-- 2. Ejecutar los tres bloques en orden: función, índice, prueba.
-- 3. Devolver resultados crudos de cada bloque.
-- 4. Sin interpretación. Sin diagnóstico.
-- ============================================================


-- ============================================================
-- BLOQUE 1: CREAR FUNCIÓN DE NORMALIZACIÓN
-- ============================================================

CREATE OR REPLACE FUNCTION public.normalize_slug(input_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
    SELECT string_agg(
        CASE token
            WHEN 'uno'         THEN '1'
            WHEN 'dos'         THEN '2'
            WHEN 'tres'        THEN '3'
            WHEN 'cuatro'      THEN '4'
            WHEN 'cinco'       THEN '5'
            WHEN 'seis'        THEN '6'
            WHEN 'siete'       THEN '7'
            WHEN 'ocho'        THEN '8'
            WHEN 'nueve'       THEN '9'
            WHEN 'diez'        THEN '10'
            WHEN 'once'        THEN '11'
            WHEN 'doce'        THEN '12'
            WHEN 'trece'       THEN '13'
            WHEN 'catorce'     THEN '14'
            WHEN 'quince'      THEN '15'
            WHEN 'dieciseis'   THEN '16'
            WHEN 'diecisiete'  THEN '17'
            WHEN 'dieciocho'   THEN '18'
            WHEN 'diecinueve'  THEN '19'
            WHEN 'veinte'      THEN '20'
            ELSE token
        END,
        '-'
    )
    FROM unnest(string_to_array(input_slug, '-')) AS token
$$;


-- ============================================================
-- BLOQUE 2: CREAR ÍNDICE ÚNICO FUNCIONAL
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS conferencias_normalized_slug_key
    ON public.conferencias (public.normalize_slug(slug));


-- ============================================================
-- BLOQUE 3: PRUEBA DE LA FUNCIÓN (VALIDACIÓN)
-- Objetivo: Verificar que la función normaliza correctamente
-- sin necesidad de datos en la tabla.
-- ============================================================

-- 3a. Caso base: slug sin palabras numéricas (no debe cambiar)
SELECT
    'el-mensaje-de-redencion' AS slug_original,
    public.normalize_slug('el-mensaje-de-redencion') AS slug_normalizado;

-- 3b. Caso numérico escrito → cifra
SELECT
    'la-revelacion-de-los-siete-truenos-1974-08-04' AS slug_original,
    public.normalize_slug('la-revelacion-de-los-siete-truenos-1974-08-04') AS slug_normalizado;

-- 3c. Caso numérico cifra (no debe cambiar)
SELECT
    'la-revelacion-de-los-7-truenos-1974-08-04' AS slug_original,
    public.normalize_slug('la-revelacion-de-los-7-truenos-1974-08-04') AS slug_normalizado;

-- 3d. Verificar que 3b y 3c producen el mismo resultado
SELECT
    public.normalize_slug('la-revelacion-de-los-siete-truenos-1974-08-04')
    =
    public.normalize_slug('la-revelacion-de-los-7-truenos-1974-08-04')
    AS colision_detectada;

-- 3e. Caso con múltiples números escritos
SELECT
    'las-tres-dispensaciones-y-los-siete-sellos' AS slug_original,
    public.normalize_slug('las-tres-dispensaciones-y-los-siete-sellos') AS slug_normalizado;

-- 3f. Verificar que el índice funcional existe
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'conferencias'
  AND indexname = 'conferencias_normalized_slug_key';
```

---

## 4. RESULTADOS ESPERADOS DE LAS PRUEBAS

| Prueba | Entrada | Salida esperada |
|---|---|---|
| 3a | `el-mensaje-de-redencion` | `el-mensaje-de-redencion` |
| 3b | `la-revelacion-de-los-siete-truenos-1974-08-04` | `la-revelacion-de-los-7-truenos-1974-08-04` |
| 3c | `la-revelacion-de-los-7-truenos-1974-08-04` | `la-revelacion-de-los-7-truenos-1974-08-04` |
| 3d | Comparación de 3b y 3c | `true` |
| 3e | `las-tres-dispensaciones-y-los-siete-sellos` | `las-3-dispensaciones-y-los-7-sellos` |
| 3f | Existencia del índice | 1 fila con la definición del índice |

---

## 5. COMPORTAMIENTO ESPERADO EN PRODUCCIÓN

Una vez activo el índice, si el pipeline intenta insertar tanto `la-revelacion-de-los-7-truenos-1974-08-04` como `la-revelacion-de-los-siete-truenos-1974-08-04`, el segundo `INSERT` será rechazado por violación del índice único funcional. El error sería:

```
ERROR: duplicate key value violates unique constraint "conferencias_normalized_slug_key"
```

Esto es exactamente el comportamiento deseado: el schema bloquea duplicados semánticos numéricos que antes se colaban.

---

## 6. NOTA SOBRE EL ÍNDICE EXISTENTE

Actualmente existe `conferencias_slug_key` (UNIQUE sobre `slug` directo) y `conferencias_slug_idx` (btree sobre `slug`). El nuevo índice funcional `conferencias_normalized_slug_key` **no los reemplaza** — los complementa. El UNIQUE original sigue protegiendo contra duplicados exactos. El funcional protege contra duplicados semánticos numéricos.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
