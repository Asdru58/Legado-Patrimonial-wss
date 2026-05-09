# TABLA `episodios` — SQL PARA AUDITORÍA Y EJECUCIÓN

**Fecha:** 6 de mayo de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Correcciones incorporadas:**  
- ChatGPT — Dictamen 1: Enmienda H-001 (sanitización de embebidos aceptada como directriz de implementación, no afecta SQL)  
- ChatGPT — Dictamen 2: `is_admin()` debe incluirse explícitamente (condición vinculante)  
**Ejecutor pendiente:** Abg. Asdrúbal Lira — en SQL Editor de Supabase  
**Estado:** PENDIENTE DE AUDITORÍA del Auditor antes de ejecución

---

## CORRECCIONES INCORPORADAS

1. **`is_admin()` autosuficiente:** Se incluye `CREATE OR REPLACE FUNCTION public.is_admin()` antes de las políticas RLS. Si ya existe (por Blog, Estudios o Conferencias), se redefine sin conflicto. Si no existe, se crea desde cero.

2. **`set_updated_at()` autosuficiente:** Misma disciplina que en `articulos` y `colecciones`.

3. **Enmienda H-001 (sanitización de embebidos):** No impacta el SQL — es directriz de implementación para Antigravity (`src/lib/utils/embed.ts`, Server Actions y componente público). La tabla almacena `audio_url` y `video_url` como texto libre; la validación de whitelist ocurre en la capa de aplicación.

---

## EJECUCIÓN

Ejecutar los 4 bloques en orden en el SQL Editor de Supabase.

---

### BLOQUE 1: Funciones auxiliares

```sql
-- ============================================================
-- FUNCIONES AUXILIARES — Fase 5.5 Podcast
-- Proyecto: Legado Patrimonial WSS
-- ============================================================

-- Función is_admin() — Verifica rol de administrador via JWT
-- CREATE OR REPLACE garantiza autosuficiencia:
-- si ya existe (por Blog, Estudios, Conferencias), se redefine sin conflicto.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$ LANGUAGE sql STABLE;

-- Función set_updated_at() — Trigger de actualización automática
-- CREATE OR REPLACE garantiza autosuficiencia.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
```

---

### BLOQUE 2: Tabla + Índices + Constraints

```sql
-- ============================================================
-- TABLA episodios — Fase 5.5 Podcast
-- Proyecto: Legado Patrimonial WSS
-- ============================================================

CREATE TABLE public.episodios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tema_doctrinal TEXT,
    texto_biblico_base TEXT,
    participantes TEXT,
    audio_url TEXT,
    video_url TEXT,
    conferencia_fuente TEXT,
    extracto_referenciado TEXT,
    duracion_minutos INTEGER,
    numero_episodio INTEGER,
    temporada INTEGER DEFAULT 1 NOT NULL,
    published BOOLEAN DEFAULT false NOT NULL,
    destacado BOOLEAN DEFAULT false NOT NULL,
    fecha_publicacion DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice único en slug
CREATE UNIQUE INDEX episodios_slug_key
    ON public.episodios (slug);

-- Índice para listados públicos (solo publicados, por temporada y número)
CREATE INDEX episodios_published_numero_idx
    ON public.episodios (published, temporada DESC, numero_episodio DESC)
    WHERE published = true;

-- Formato de slug validado
ALTER TABLE public.episodios
ADD CONSTRAINT episodios_slug_format
CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Validación de duración positiva
ALTER TABLE public.episodios
ADD CONSTRAINT episodios_duracion_positiva
CHECK (duracion_minutos IS NULL OR duracion_minutos > 0);

-- Validación de número de episodio positivo
ALTER TABLE public.episodios
ADD CONSTRAINT episodios_numero_positivo
CHECK (numero_episodio IS NULL OR numero_episodio > 0);
```

---

### BLOQUE 3: Trigger de `updated_at`

```sql
-- Trigger en episodios
CREATE TRIGGER episodios_set_updated_at
    BEFORE UPDATE ON public.episodios
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
```

---

### BLOQUE 4: Políticas RLS

```sql
-- Habilitar RLS
ALTER TABLE public.episodios ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo episodios publicados
CREATE POLICY "episodios_select_published"
    ON public.episodios
    FOR SELECT
    USING (published = true);

-- Lectura admin: todos los episodios (incluye borradores)
CREATE POLICY "episodios_select_admin"
    ON public.episodios
    FOR SELECT
    USING (is_admin());

-- Inserción admin
CREATE POLICY "episodios_insert_admin"
    ON public.episodios
    FOR INSERT
    WITH CHECK (is_admin());

-- Actualización admin
CREATE POLICY "episodios_update_admin"
    ON public.episodios
    FOR UPDATE
    USING (is_admin());

-- Eliminación admin
CREATE POLICY "episodios_delete_admin"
    ON public.episodios
    FOR DELETE
    USING (is_admin());
```

---

## VERIFICACIÓN POST-EJECUCIÓN

Después de ejecutar los 4 bloques, pegar y ejecutar este bloque de verificación:

```sql
-- V1. Confirmar que la tabla existe con sus columnas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'episodios'
ORDER BY ordinal_position;

-- V2. Confirmar constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.episodios'::regclass
ORDER BY contype, conname;

-- V3. Confirmar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'episodios' AND schemaname = 'public'
ORDER BY indexname;

-- V4. Confirmar políticas RLS
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'episodios' AND schemaname = 'public'
ORDER BY policyname;

-- V5. Confirmar trigger
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'episodios'
  AND trigger_schema = 'public';

-- V6. Confirmar que is_admin() existe y funciona
SELECT public.is_admin() AS is_admin_result;
```

## RESULTADOS ESPERADOS

| Verificación | Esperado |
|---|---|
| V1 | 19 columnas con tipos correctos |
| V2 | PK, UNIQUE slug, CHECK slug_format, CHECK duracion_positiva, CHECK numero_positivo |
| V3 | `episodios_slug_key`, `episodios_published_numero_idx` |
| V4 | 5 políticas: select_published, select_admin, insert_admin, update_admin, delete_admin |
| V5 | 1 trigger: `episodios_set_updated_at` (BEFORE UPDATE) |
| V6 | Retorna `false` (ejecución desde SQL Editor no tiene JWT de admin) |

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
