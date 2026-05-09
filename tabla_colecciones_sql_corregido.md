# TABLA `colecciones` — SQL CORREGIDO PARA AUDITORÍA

**Fecha:** 15 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Correcciones incorporadas:** ChatGPT — Auditor de Código y DB  
**Ejecutor pendiente:** Abg. Asdrúbal Lira — en SQL Editor de Supabase  
**Estado:** PENDIENTE DE AUDITORÍA antes de ejecución

---

## CORRECCIÓN OBLIGATORIA INCORPORADA

**Salvedad del Auditor:** El documento debe ser autosuficiente. No asume que `public.set_updated_at()` ya existe — la redefine explícitamente con `CREATE OR REPLACE FUNCTION` antes del trigger, igual que se hizo en el SQL de `articulos`.

## DIRECTRICES INCORPORADAS A LA IMPLEMENTACIÓN

1. **Validación editorial mínima** — Se implementará en Server Actions: `titulo` no vacío, `slug` normalizado válido, y al menos uno entre `extracto`, `descripcion` o `contenido` con contenido real. No se impone a nivel SQL para mantener flexibilidad del schema.

2. **Sin queries relacionales a `conferencias`** — El bloque "Conferencias relacionadas" en `/estudios/[coleccion]/page.tsx` queda como placeholder visual. No se consultan conferencias por `serie_id` hasta que exista el proyecto editorial de poblamiento.

---

## EJECUCIÓN

Ejecutar los 3 bloques en orden en el SQL Editor de Supabase.

---

### BLOQUE 1: Tabla + Índices + Constraint

```sql
-- ============================================================
-- TABLA colecciones — Fase 5.5 Estudios
-- Proyecto: Legado Patrimonial WSS
-- ============================================================

CREATE TABLE public.colecciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    extracto TEXT,
    descripcion TEXT,
    contenido TEXT,
    categoria TEXT,
    orden_display INTEGER DEFAULT 0 NOT NULL,
    destacada BOOLEAN DEFAULT false NOT NULL,
    published BOOLEAN DEFAULT false NOT NULL,
    serie_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice único en slug
CREATE UNIQUE INDEX colecciones_slug_key
    ON public.colecciones (slug);

-- Índice para listados públicos (solo publicadas, ordenadas)
CREATE INDEX colecciones_published_orden_idx
    ON public.colecciones (published, orden_display, titulo)
    WHERE published = true;

-- Índice para futura integración relacional con series
CREATE INDEX colecciones_serie_id_idx
    ON public.colecciones (serie_id)
    WHERE serie_id IS NOT NULL;

-- Formato de slug validado
ALTER TABLE public.colecciones
ADD CONSTRAINT colecciones_slug_format
CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
```

---

### BLOQUE 2: Función y Trigger de `updated_at`

```sql
-- Función reutilizable para actualizar updated_at
-- CREATE OR REPLACE garantiza autosuficiencia del documento:
-- si la función ya existe (por el sistema de blog), la redefine sin conflicto;
-- si no existe, la crea desde cero.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger en colecciones
CREATE TRIGGER colecciones_set_updated_at
    BEFORE UPDATE ON public.colecciones
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
```

---

### BLOQUE 3: Políticas RLS

```sql
-- Habilitar RLS
ALTER TABLE public.colecciones ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo colecciones publicadas
CREATE POLICY "colecciones_select_published"
    ON public.colecciones
    FOR SELECT
    USING (published = true);

-- Lectura admin: todas las colecciones (incluye borradores)
CREATE POLICY "colecciones_select_admin"
    ON public.colecciones
    FOR SELECT
    USING (is_admin());

-- Inserción admin
CREATE POLICY "colecciones_insert_admin"
    ON public.colecciones
    FOR INSERT
    WITH CHECK (is_admin());

-- Actualización admin
CREATE POLICY "colecciones_update_admin"
    ON public.colecciones
    FOR UPDATE
    USING (is_admin());

-- Eliminación admin
CREATE POLICY "colecciones_delete_admin"
    ON public.colecciones
    FOR DELETE
    USING (is_admin());
```

---

## VERIFICACIÓN POST-EJECUCIÓN

Después de ejecutar los 3 bloques, pegar y ejecutar este bloque de verificación:

```sql
-- V1. Confirmar que la tabla existe con sus columnas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'colecciones'
ORDER BY ordinal_position;

-- V2. Confirmar constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.colecciones'::regclass
ORDER BY contype, conname;

-- V3. Confirmar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'colecciones' AND schemaname = 'public'
ORDER BY indexname;

-- V4. Confirmar políticas RLS
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'colecciones' AND schemaname = 'public'
ORDER BY policyname;

-- V5. Confirmar trigger
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'colecciones'
  AND trigger_schema = 'public';

-- V6. Confirmar FK a series
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'colecciones'
  AND tc.constraint_type = 'FOREIGN KEY';
```

## RESULTADOS ESPERADOS

| Verificación | Esperado |
|---|---|
| V1 | 13 columnas con tipos correctos |
| V2 | PK, UNIQUE slug, CHECK slug_format, FK serie_id |
| V3 | `colecciones_slug_key`, `colecciones_published_orden_idx`, `colecciones_serie_id_idx` |
| V4 | 5 políticas: select_published, select_admin, insert_admin, update_admin, delete_admin |
| V5 | 1 trigger: `colecciones_set_updated_at` (BEFORE UPDATE) |
| V6 | FK a `series(id)` con regla `SET NULL` |

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
