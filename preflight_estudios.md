# PREFLIGHT DE DATOS — `/estudios/[coleccion]`

**Fecha:** 15 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Exigido por:** ChatGPT — Auditor  
**Ejecutor:** Abg. Asdrúbal Lira — en SQL Editor de Supabase

---

## OBJETIVO

Verificar, antes de construir `/estudios/[coleccion]`, si la base de datos tiene el poblamiento suficiente para sostener la ruta con datos reales. Son 5 consultas de solo lectura. Ningún riesgo.

---

## CONSULTA P1 — ¿Existe la tabla `series`?

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'series'
ORDER BY ordinal_position;
```

**Qué buscamos:** Confirmar que la tabla existe y ver qué columnas tiene. Esto determina si `series` puede soportar los campos editoriales que necesitamos (slug, titulo, descripcion).

**Resultados posibles:**
- Tabla existe con columnas útiles → seguimos con P2.
- Tabla existe pero le faltan campos editoriales → decidimos si crear columnas nuevas o sumar metadata en el frontend.
- Tabla no existe → el supuesto del Master Plan estaba equivocado. Replanteamos la estrategia.

---

## CONSULTA P2 — ¿Cuántas filas tiene `series` y cuáles son?

```sql
SELECT *
FROM public.series
ORDER BY created_at DESC
LIMIT 20;
```

**Qué buscamos:** Ver el contenido real de la tabla. Si están las 6 colecciones del mock o si está vacía o si tiene otras series distintas.

---

## CONSULTA P3 — ¿Cuántas conferencias tienen `serie_id` asignado?

```sql
SELECT
    COUNT(*) AS total_conferencias,
    COUNT(serie_id) AS con_serie_id,
    COUNT(*) - COUNT(serie_id) AS sin_serie_id,
    ROUND(100.0 * COUNT(serie_id) / COUNT(*), 2) AS porcentaje_asignado
FROM public.conferencias;
```

**Qué buscamos:** Saber si la columna `serie_id` está realmente poblada o si es una columna vacía. Este es el dato más crítico.

**Resultados posibles:**
- Alto porcentaje asignado → las colecciones pueden poblarse con conferencias reales.
- Porcentaje bajo o cero → hay que poblar manualmente o diseñar una estrategia distinta.

---

## CONSULTA P4 — Distribución por serie

```sql
SELECT
    s.id,
    s.slug,
    s.titulo,
    COUNT(c.id) AS total_conferencias
FROM public.series s
LEFT JOIN public.conferencias c ON c.serie_id = s.id
GROUP BY s.id, s.slug, s.titulo
ORDER BY total_conferencias DESC;
```

**Qué buscamos:** Cuántas conferencias tiene cada serie. Una serie con 0 conferencias no sirve para construir una página de detalle. Una serie con 50+ conferencias necesita paginación.

**Nota:** Esta consulta asume que `series` tiene las columnas `id`, `slug`, `titulo`. Si P1 reveló nombres distintos, ajustar aquí. Si `series` no tiene `slug`, esto lo marca como dato a resolver.

---

## CONSULTA P5 — Muestreo de conferencias con serie

```sql
SELECT
    s.titulo AS serie,
    c.titulo AS conferencia,
    c.fecha_impartida,
    c.slug
FROM public.conferencias c
INNER JOIN public.series s ON c.serie_id = s.id
ORDER BY s.titulo, c.fecha_impartida DESC NULLS LAST
LIMIT 30;
```

**Qué buscamos:** Ver ejemplos concretos de cómo se ven las asignaciones actuales. Sirve para evaluar si los datos son coherentes o si hay series que mezclan contenido inesperado.

---

## ENTREGABLE

Ejecuta las 5 consultas y tráeme los resultados crudos. Con eso emito el diagnóstico técnico y decidimos una de estas tres rutas:

| Escenario | Diagnóstico | Acción |
|---|---|---|
| `series` poblado + `serie_id` con buena cobertura | Base lista | Construir la ruta sin tocar schema |
| `series` poblado pero `serie_id` escaso | Poblamiento incompleto | Panel admin para asignar series antes de construir la ruta |
| `series` vacío o inexistente | Supuesto incorrecto del Master Plan | Replantear: tabla nueva `colecciones`, o usar mocks enriquecidos |

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
