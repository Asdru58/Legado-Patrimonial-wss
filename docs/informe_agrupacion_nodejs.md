# Informe: Análisis de la decisión de agrupación en Node.js

**Fecha:** 09 de abril de 2026  
**Emitido por:** Antigravity — Agente de Ejecución Local  
**Contexto:** Observación de Gemini sobre el Paso 1 de la Refactorización del Archivo Cronológico  

---

## Observación recibida

Gemini identifica que las funciones `getConferenciasPorAnio()` y `getMesesConConferencias()` traen filas individuales al servidor Node.js y agrupan ahí, en lugar de delegar el `GROUP BY` a PostgreSQL mediante una **Vista (View)** o un **RPC**.

Cita textual de Gemini:

> *"Antigravity resolvió la falta de GROUP BY nativo en Supabase (PostgREST) trayendo toda la columna de fechas al servidor frontend (Node.js) para agruparlas allí. Para 5,866 registros, traer una sola columna es liviano y no tumbará el sistema, pero a nivel arquitectónico, la mejor práctica en PostgreSQL suele ser crear una Vista (View) o un RPC (Remote Procedure Call) para que la base de datos haga el conteo."*

> *"Como nuestra regla es no tocar la base de datos ni el schema en esta fase, la decisión de Antigravity tiene lógica temporal, pero es exactamente el tipo de cosas que ChatGPT debe auditar."*

---

## ¿Es correcto el señalamiento? — Sí, parcialmente

Gemini tiene razón en que **la mejor práctica genérica** es que la base de datos haga la agregación. PostgreSQL es órdenes de magnitud más eficiente agrupando que JavaScript. Eso no está en discusión.

---

## ¿Trae consecuencias reales en este proyecto? — Análisis numérico

| Factor | Valor actual | Proyección futura (Gemini) |
|---|---|---|
| Registros con fecha | ~278 | ~5,866 (si se completa el archivo) |
| Columna transferida | Solo `fecha_impartida` (string de 10 bytes) | Igual |
| Payload de red (actual) | ~278 × 10 bytes ≈ **2.7 KB** | ~5,866 × 10 bytes ≈ **57 KB** |
| Overhead JSON de PostgREST | ~×3 (keys, estructura) | ~×3 |
| Payload real estimado | ~**8 KB** actual | ~**170 KB** futuro |
| Tiempo de agrupación en Node | < 1ms | < 5ms |

**Conclusión numérica:** Incluso con 5,866 registros, el payload sería ~170 KB — comparable a una imagen pequeña. La agrupación en Node con un `Map` sobre ~6,000 elementos toma microsegundos. **No hay riesgo de rendimiento medible.**

---

## ¿Por qué se tomó esta decisión?

La restricción del plan es explícita y no negociable:

> *"No modificar el schema de la base de datos."*

Crear un View o un RPC **es una modificación de schema**. Ante esta restricción, las alternativas evaluadas fueron:

| Alternativa | Viabilidad |
|---|---|
| **RPC nueva en PostgreSQL** | ❌ Viola la restricción de no modificar schema |
| **Vista (View) en PostgreSQL** | ❌ Viola la restricción de no modificar schema |
| **Agregar en Node.js** | ✅ Única opción dentro del alcance autorizado |
| **No implementar la función** | ❌ Incumple el Paso 1 |

---

## ¿Es deuda técnica? — Sí, pero controlada y documentada

Gemini usa la frase exacta: *"tiene lógica temporal"*. Coincido. Esta decisión es **deuda técnica deliberada**, no accidental. Características:

1. **Está documentada** — El JSDoc de `getConferenciasPorAnio()` explica explícitamente por qué la agrupación ocurre en Node.
2. **Es reemplazable** — Si en una fase futura se autoriza crear un RPC `conteo_por_anio()`, el cambio es trivial: se reemplaza el cuerpo de la función sin cambiar su firma ni sus consumidores.
3. **No afecta la interfaz pública** — Los componentes que consuman estas funciones recibirán `{ anios: [...], sinFecha: number }` sin importar si la agrupación ocurrió en PostgreSQL o en Node.
4. **El cuello de botella real no es este** — La latencia dominante será siempre la conexión de red al servidor de Supabase, no la agrupación de ~300 strings en memoria.

---

## ¿Qué no habría sido aceptable?

Si se hubiera traído `SELECT *` (todas las columnas de los ~300 registros) para luego agrupar, **eso sí sería un problema arquitectónico**. Pero traer **solo una columna** (`fecha_impartida`) es la versión más liviana posible dentro de la restricción.

---

## Recomendación para fase futura

Cuando el Arquitecto y el Auditor autoricen modificaciones al schema, la optimización ideal sería:

```sql
-- RPC futura (cuando se autorice)
CREATE OR REPLACE FUNCTION conteo_por_anio()
RETURNS TABLE(anio int, total bigint) AS $$
  SELECT extract(year FROM fecha_impartida)::int AS anio,
         count(*) AS total
  FROM conferencias
  WHERE fecha_impartida IS NOT NULL
  GROUP BY anio
  ORDER BY anio;
$$ LANGUAGE sql STABLE;
```

Y el cambio en `conferences.ts` sería simplemente reemplazar el cuerpo de `getConferenciasPorAnio()` con una llamada `supabase.rpc('conteo_por_anio')`.

---

## Veredicto

| Aspecto | Evaluación |
|---|---|
| ¿La decisión viola alguna restricción? | **No** |
| ¿Introduce riesgo de rendimiento? | **No** (ni con 5,866 registros) |
| ¿Es la mejor práctica arquitectónica ideal? | **No** — lo ideal es GROUP BY en PostgreSQL |
| ¿Es la mejor decisión posible *dentro de las restricciones autorizadas*? | **Sí** |
| ¿Es deuda técnica? | **Sí**, deliberada y documentada |
| ¿Es reemplazable sin romper contratos? | **Sí** — la firma pública no cambia |

---

Gemini actuó correctamente al señalarlo. La observación es válida como nota para futuras fases, pero **no constituye un hallazgo que deba bloquear la ejecución actual**.
