# R-3 · INTERVENCIÓN 2 — ENDURECIMIENTO SELECTIVO DEL SCHEMA

**Clasificación:** Script de Migración / Sometido a Auditoría  
**Fecha:** 07 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Corrección de dominio por:** Abg. Asdrúbal Lira — Administrador del Proyecto  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. ALCANCE

Dos cambios quirúrgicos al schema. Nada más.

---

## 2. CAMBIO A — Validación de rango para `fecha_impartida`

**Justificación:** El campo permite NULL (correcto para fechas irrecuperables), pero no tiene validación de rango. Sin ella, el pipeline podría insertar fechas absurdas como `0001-01-01` o `2099-12-31`.

**Límites históricos:** El catálogo corresponde exclusivamente a las predicaciones públicas del Dr. William Soto Santiago, cuyo ministerio activo comprende el período 1974–2018 (falleció en marzo de 2019). Cualquier fecha fuera de ese rango es un error de datos.

- Límite inferior: `1974-01-01`
- Límite superior: `2018-12-31`

**Nota:** No se usa `CURRENT_DATE` como límite superior porque el catálogo es un archivo histórico cerrado, no un repositorio de contenido en curso.

---

## 3. CAMBIO B — Valores por defecto para `video_provider` y `video_status`

**Justificación:** Ambos campos son `NOT NULL` sin default. Si el pipeline omite estos campos, el INSERT falla. Los defaults reflejan el estado natural de un registro nuevo sin video procesado.

- `video_provider` → `'none'`
- `video_status` → `'pending'`

---

## 4. SCRIPT SQL

```sql
-- ============================================================
-- R-3 · INTERVENCIÓN 2
-- Endurecimiento selectivo del schema
-- Proyecto: Legado Patrimonial WSS
-- ============================================================
-- Emitido por: Claude (Arquitecto de Software)
-- Corrección de dominio: Abg. Asdrúbal Lira
-- Pendiente de aprobación: ChatGPT (Auditor de Código y DB)
-- Fecha: 07 de abril de 2026
-- ============================================================
-- EJECUCIÓN: Manual en SQL Editor de Supabase.
-- Ejecutar los 3 bloques en orden.
-- Devolver resultados crudos de cada bloque.
-- ============================================================


-- ============================================================
-- BLOQUE 1: CHECK DE RANGO PARA FECHA_IMPARTIDA
-- ============================================================

ALTER TABLE public.conferencias
ADD CONSTRAINT conferencias_fecha_rango
CHECK (
    fecha_impartida IS NULL
    OR (fecha_impartida >= '1974-01-01' AND fecha_impartida <= '2018-12-31')
);


-- ============================================================
-- BLOQUE 2: DEFAULTS PARA VIDEO_PROVIDER Y VIDEO_STATUS
-- ============================================================

ALTER TABLE public.conferencias
ALTER COLUMN video_provider SET DEFAULT 'none';

ALTER TABLE public.conferencias
ALTER COLUMN video_status SET DEFAULT 'pending';


-- ============================================================
-- BLOQUE 3: VERIFICACIÓN POST-CAMBIOS
-- ============================================================

-- 3a. Confirmar que el nuevo constraint existe
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.conferencias'::regclass
  AND conname = 'conferencias_fecha_rango';

-- 3b. Confirmar los defaults actualizados
SELECT
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conferencias'
  AND column_name IN ('video_provider', 'video_status')
ORDER BY column_name;
```

---

## 5. RESULTADOS ESPERADOS

| Verificación | Resultado esperado |
|---|---|
| Bloque 1 | Success / ALTER TABLE exitoso |
| Bloque 2 | Success / ALTER TABLE exitoso (x2) |
| 3a — Constraint | 1 fila: `conferencias_fecha_rango`, tipo `c`, definición con rango 1974–2018 |
| 3b — Defaults | 2 filas: `video_provider` con default `'none'`, `video_status` con default `'pending'` |

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
