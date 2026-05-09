# FASE R-4 · REFACTORIZACIÓN DEL PIPELINE DE PREPARACIÓN

**Clasificación:** Plan Técnico / Sometido a Auditoría  
**Fecha:** 07 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Autorizado por:** Abg. Asdrúbal Lira — Administrador del Proyecto  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. CONTEXTO

La tabla `conferencias` está vacía y blindada tras R-2 (purga) y R-3 (endurecimiento). Antes de recargar datos, el pipeline que los prepara (`preparar_catalogo.mjs`) debe corregirse para que no reproduzca los problemas detectados en R-1:

- Duplicados semánticos en slugs (25-35 pares).
- 13 fechas nulas por fallo del parser.
- Tolerancia indiscriminada de NULLs sin clasificación.
- Ausencia de cuarentena para registros defectuosos.

---

## 2. OBJETIVO

Refactorizar `preparar_catalogo.mjs` para que produzca un archivo de salida limpio, validado y clasificado, listo para inyección segura en la base de datos.

---

## 3. ARQUITECTURA DEL PIPELINE CORREGIDO

El pipeline procesará el catálogo maestro en 5 etapas secuenciales:

### Etapa 1 — Carga del catálogo fuente

- Leer `catalogo_maestro_dryrun.json` completo.
- Registrar el conteo total de registros de entrada.

### Etapa 2 — Normalización de slugs

- Aplicar la misma lógica de `normalize_slug` que existe en PostgreSQL, pero en JavaScript: convertir palabras numéricas escritas a cifras dentro del slug.
- Mapeo idéntico al de la función SQL (uno→1, dos→2, ..., veinte→20).
- Detectar y resolver colisiones: si dos registros producen el mismo slug normalizado, marcar el segundo como duplicado.
- Resolver abreviaturas y sufijos conocidos del catálogo (`cel`, `otro`, `book`, `mobil`) mediante un diccionario de equivalencias editoriales que se aplica antes de la deduplicación.

### Etapa 3 — Parser de fechas robusto

- Reemplazar el `substring(0,4)` con fallback laxo por un parser que maneje:
  - Formato ISO estándar: `YYYY-MM-DD` (pasa directo).
  - Formato con mes en texto: `"19 Marzo 1978"` → `1978-03-19`.
  - Formato corto: `"21-05-78"` → `1978-05-21`.
  - Mes abreviado: `"Nov"`, `"Dic"` → conversión al número correspondiente.
- Validar que la fecha resultante caiga dentro del rango 1974-01-01 a 2018-12-31.
- Si la fecha no es parseable o cae fuera de rango → registrar como `null` y enviar el registro a cuarentena.

### Etapa 4 — Validación y clasificación

Cada registro se clasifica en una de tres categorías:

| Categoría | Criterio | Destino |
|---|---|---|
| **Completo** | Tiene `titulo`, `slug` normalizado único, y `fecha_impartida` válida | Archivo de carga (`catalogo_limpio.json`) |
| **Parcial** | Tiene `titulo` y `slug` único, pero `fecha_impartida` es `null` | Archivo de carga, con flag de fecha faltante |
| **Defectuoso** | Slug duplicado, título faltante, o fecha fuera de rango | Archivo de cuarentena (`catalogo_cuarentena.json`) |

Los registros parciales se incluyen en la carga porque el schema permite `fecha_impartida = NULL`. Los defectuosos se excluyen y quedan documentados para revisión manual.

### Etapa 5 — Limpieza de campos y generación de salida

- Eliminar nodos temporales (`_meta`, `serie_id`, `tematica_ids`) que no corresponden a esta fase.
- Asegurar que los campos de video (`video_provider`, `video_status`) estén presentes. Si faltan, los defaults del schema los cubrirán, pero es preferible que el pipeline los envíe explícitamente.
- Generar dos archivos de salida:
  - `catalogo_limpio.json` — Registros aptos para carga.
  - `catalogo_cuarentena.json` — Registros excluidos con motivo de exclusión.
- Generar un reporte de resumen:
  - Total de registros de entrada.
  - Total de registros limpios.
  - Total de registros parciales (sin fecha).
  - Total de registros en cuarentena (con desglose por motivo).
  - Total de colisiones de slug detectadas y resueltas.

---

## 4. REINCORPORACIÓN DE ANTIGRAVITY

Para la ejecución de R-4, se propone reincorporar a Antigravity bajo las siguientes condiciones:

### Alcance autorizado

- Modificar el archivo `preparar_catalogo.mjs` según las especificaciones de este plan.
- Ejecutar el script refactorizado contra el archivo fuente `catalogo_maestro_dryrun.json`.
- Generar los archivos de salida (`catalogo_limpio.json`, `catalogo_cuarentena.json`).

### Alcance prohibido

- No tiene acceso a la base de datos. Ni `DATABASE_URL`, ni `SERVICE_ROLE_KEY`, ni SQL Editor, ni ningún otro canal.
- No ejecuta INSERT ni ninguna operación de escritura en Supabase.
- No modifica el schema.
- No toma decisiones sobre qué registros son duplicados o defectuosos más allá de los criterios definidos en este documento.

### Canal de trabajo

- Antigravity opera exclusivamente sobre archivos locales (JSON de entrada → JSON de salida).
- El script se ejecuta en el entorno local del proyecto, sin conexión a la base de datos.
- Los archivos de salida se entregan al equipo para revisión antes de cualquier carga.

---

## 5. ENTREGABLES DE R-4

Al concluir R-4, Antigravity debe entregar:

1. **`preparar_catalogo.mjs`** — Script refactorizado.
2. **`catalogo_limpio.json`** — Registros aptos para carga.
3. **`catalogo_cuarentena.json`** — Registros excluidos con motivo.
4. **Reporte de resumen** — Conteos y desglose de clasificación.

Estos entregables serán revisados por el Arquitecto y aprobados por el Auditor antes de proceder a R-5 (staging).

---

## 6. CRITERIOS DE ÉXITO DE R-4

| Criterio | Umbral |
|---|---|
| Colisiones de slug en `catalogo_limpio.json` | 0 |
| Fechas fuera de rango 1974–2018 en registros completos | 0 |
| Registros sin `titulo` en `catalogo_limpio.json` | 0 |
| Registros sin `slug` en `catalogo_limpio.json` | 0 |
| Registros en cuarentena documentados con motivo | 100% |
| Reporte de resumen generado | Sí |

---

## 7. SECUENCIA POST R-4

Una vez aprobados los entregables:

1. **R-5** — Staging local: Cargar `catalogo_limpio.json` en instancia local de Supabase. Validar conteos, slugs, FTS, y navegación por `/conferencia/[slug]`.
2. **R-6** — Recarga en producción: Solo si staging sale limpio. Usando `SERVICE_ROLE_KEY` vía SDK oficial.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
