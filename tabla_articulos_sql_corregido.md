# TABLA `articulos` — SQL CORREGIDO PARA EJECUCIÓN

**Fecha:** 14 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Correcciones incorporadas:** ChatGPT — Auditor de Código y DB  
**Ejecutor:** Abg. Asdrúbal Lira — en SQL Editor de Supabase

---

## CORRECCIONES INCORPORADAS

1. **Política RLS de SELECT para admin** — Añadida. El admin puede ver todos los artículos, incluyendo borradores.
2. **Trigger de `updated_at`** — Añadido. Se actualiza automáticamente en cada UPDATE sin depender de que el código lo haga manualmente.

## DIRECTRICES INCORPORADAS DEL AUDITOR

3. **CRUD admin sin `SERVICE_ROLE_KEY`** — El CRUD usará el cliente server con sesión + RLS + `is_admin()`, no `SERVICE_ROLE_KEY`.
4. **Slug normalizado en capa de aplicación** — Se implementará en las Server Actions, no en SQL.
5. **Render de markdown conservador** — Se implementará sin dependencias externas, con transformación controlada.

---

## EJECUCIÓN

Ejecutar los 3 bloques en orden en el SQL Editor de Supabase.

---

### BLOQUE 1: Tabla + Índices + Constraint

```sql
-- ============================================================
-- TABLA articulos — Fase 5.5 Blog
-- Proyecto: Legado Patrimonial WSS
-- ============================================================

CREATE TABLE public.articulos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    extracto TEXT,
    contenido TEXT NOT NULL,
    categoria TEXT,
    autor TEXT DEFAULT 'Legado Patrimonial WSS',
    fecha_publicacion DATE,
    tiempo_lectura TEXT,
    destacado BOOLEAN DEFAULT false NOT NULL,
    published BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice único en slug
CREATE UNIQUE INDEX articulos_slug_key
    ON public.articulos (slug);

-- Índice para listados públicos
CREATE INDEX articulos_published_fecha_idx
    ON public.articulos (published, fecha_publicacion DESC)
    WHERE published = true;

-- Formato de slug validado
ALTER TABLE public.articulos
ADD CONSTRAINT articulos_slug_format
CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
```

---

### BLOQUE 2: Trigger de `updated_at`

```sql
-- Función reutilizable para actualizar updated_at
-- (Si ya existe en el proyecto por conferencias, este CREATE
-- OR REPLACE simplemente la redefine sin conflicto)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger en articulos
CREATE TRIGGER articulos_set_updated_at
    BEFORE UPDATE ON public.articulos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
```

---

### BLOQUE 3: Políticas RLS

```sql
-- Habilitar RLS
ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo artículos publicados
CREATE POLICY "articulos_select_published"
    ON public.articulos
    FOR SELECT
    USING (published = true);

-- Lectura admin: todos los artículos (incluye borradores)
CREATE POLICY "articulos_select_admin"
    ON public.articulos
    FOR SELECT
    USING (is_admin());

-- Inserción admin
CREATE POLICY "articulos_insert_admin"
    ON public.articulos
    FOR INSERT
    WITH CHECK (is_admin());

-- Actualización admin
CREATE POLICY "articulos_update_admin"
    ON public.articulos
    FOR UPDATE
    USING (is_admin());

-- Eliminación admin
CREATE POLICY "articulos_delete_admin"
    ON public.articulos
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
WHERE table_schema = 'public' AND table_name = 'articulos'
ORDER BY ordinal_position;

-- V2. Confirmar constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.articulos'::regclass
ORDER BY contype, conname;

-- V3. Confirmar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'articulos' AND schemaname = 'public'
ORDER BY indexname;

-- V4. Confirmar políticas RLS
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'articulos' AND schemaname = 'public'
ORDER BY policyname;

-- V5. Confirmar trigger
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'articulos'
  AND trigger_schema = 'public';
```

## RESULTADOS ESPERADOS

| Verificación | Esperado |
|---|---|
| V1 | 13 columnas con tipos correctos |
| V2 | PK, UNIQUE slug, CHECK slug_format |
| V3 | `articulos_slug_key`, `articulos_published_fecha_idx` |
| V4 | 5 políticas: select_published, select_admin, insert_admin, update_admin, delete_admin |
| V5 | 1 trigger: `articulos_set_updated_at` (BEFORE UPDATE) |

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
