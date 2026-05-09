# R-3 · INTERVENCIÓN 1 — GUÍA DE EJECUCIÓN

## Qué vas a hacer

Vas a pegar 3 bloques de código SQL en Supabase. Cada uno por separado.
Esto crea la protección contra slugs duplicados (como "siete" vs "7").

## Dónde lo haces

1. Abre tu dashboard de Supabase en el navegador.
2. En el menú lateral izquierdo, haz clic en **SQL Editor**.
3. Haz clic en **New Query** (o "Nueva consulta").
4. Ahí pegas cada bloque, uno a la vez, y presionas **Run** (o "Ejecutar").

## Paso 1 — Crear la función

Pega esto en el SQL Editor y presiona Run:

```sql
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
```

**Resultado esperado:** Algo como "Success" o "Función creada".

---

## Paso 2 — Crear el índice

Borra lo anterior del editor, pega esto y presiona Run:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS conferencias_normalized_slug_key
    ON public.conferencias (public.normalize_slug(slug));
```

**Resultado esperado:** Algo como "Success" o "Índice creado".

---

## Paso 3 — Ejecutar las pruebas

Borra lo anterior del editor, pega esto y presiona Run:

```sql
SELECT
    'el-mensaje-de-redencion' AS slug_original,
    public.normalize_slug('el-mensaje-de-redencion') AS slug_normalizado;

SELECT
    'la-revelacion-de-los-siete-truenos-1974-08-04' AS slug_original,
    public.normalize_slug('la-revelacion-de-los-siete-truenos-1974-08-04') AS slug_normalizado;

SELECT
    'la-revelacion-de-los-7-truenos-1974-08-04' AS slug_original,
    public.normalize_slug('la-revelacion-de-los-7-truenos-1974-08-04') AS slug_normalizado;

SELECT
    public.normalize_slug('la-revelacion-de-los-siete-truenos-1974-08-04')
    =
    public.normalize_slug('la-revelacion-de-los-7-truenos-1974-08-04')
    AS colision_detectada;

SELECT
    'las-tres-dispensaciones-y-los-siete-sellos' AS slug_original,
    public.normalize_slug('las-tres-dispensaciones-y-los-siete-sellos') AS slug_normalizado;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'conferencias'
  AND indexname = 'conferencias_normalized_slug_key';
```

**Resultados esperados:**

| Prueba | Debe decir |
|---|---|
| 1ª consulta | `el-mensaje-de-redencion` → `el-mensaje-de-redencion` (sin cambios) |
| 2ª consulta | `...los-siete-truenos...` → `...los-7-truenos...` |
| 3ª consulta | `...los-7-truenos...` → `...los-7-truenos...` (sin cambios) |
| 4ª consulta | `colision_detectada` = `true` |
| 5ª consulta | `...tres-dispensaciones...siete-sellos` → `...3-dispensaciones...7-sellos` |
| 6ª consulta | Una fila mostrando el índice `conferencias_normalized_slug_key` |

---

## Cuando termines

Copia los resultados de los 3 pasos y tráemelos aquí.
Con eso cerramos la Intervención 1 y pasamos a la siguiente.
