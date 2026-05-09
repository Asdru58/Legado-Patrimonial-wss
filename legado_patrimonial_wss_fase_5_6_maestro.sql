-- =========================================================
-- Legado Patrimonial WSS
-- Fase 5.6 — Esquema Maestro Definitivo para Supabase
-- Base: Arquitecto (Opción A Extendida — esquema plano)
-- Auditoría: Claude (parches de seguridad, integridad,
--            FTS ponderado y escalabilidad)
-- =========================================================

-- =========================================================
-- 1. Extensiones
-- =========================================================
create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- =========================================================
-- 2. Función genérica para updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- =========================================================
-- 3. Función helper para verificar rol admin vía JWT
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;

-- =========================================================
-- 4. Tabla principal: conferencias
-- =========================================================
create table if not exists public.conferencias (
  id uuid primary key default gen_random_uuid(),

  -- Identificación y contenido
  slug text not null unique,
  titulo text not null,
  extracto text,
  descripcion text,
  fecha_impartida date,
  ponente_nombre text,
  ponente_rol text,

  -- Audio y PDF
  audio_url text,
  audio_duracion integer,
  pdf_url text,

  -- Video (modelo oficial)
  video_provider text not null default 'none'
    check (video_provider in ('none', 'youtube', 'r2', 's3')),
  video_provider_id text,
  video_fallback_provider text
    check (video_fallback_provider is null
           or video_fallback_provider in ('r2', 's3')),
  video_fallback_url text,
  video_status text not null default 'pending'
    check (video_status in (
      'pending', 'active', 'unavailable', 'processing', 'disabled'
    )),
  video_checked_at timestamptz,

  -- Full Text Search — ponderado (A > B > C)
  fts tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(extracto, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(ponente_nombre, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(descripcion, '')), 'C')
  ) stored,

  -- Timestamps
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  -- =======================================================
  -- Constraints de integridad
  -- =======================================================

  -- Audio: duración no negativa
  constraint conferencias_audio_duracion_nonnegative
    check (audio_duracion is null or audio_duracion >= 0),

  -- Slug: solo minúsculas, números y guiones
  constraint conferencias_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Video: provider_id obligatorio si hay provider, y nulo si no
  constraint conferencias_video_provider_id_required
    check (
      (video_provider = 'none' and video_provider_id is null)
      or
      (video_provider <> 'none' and video_provider_id is not null)
    ),

  -- Video: fallback como par consistente (ambos o ninguno)
  constraint conferencias_video_fallback_pair_consistent
    check (
      (video_fallback_provider is null and video_fallback_url is null)
      or
      (video_fallback_provider is not null and video_fallback_url is not null)
    ),

  -- Video: no puede existir fallback sin un provider primario
  constraint conferencias_video_fallback_requires_provider
    check (
      video_provider <> 'none'
      or (video_fallback_provider is null and video_fallback_url is null)
    )
);

-- =========================================================
-- 5. Índices
-- =========================================================

-- FTS: búsqueda de texto completo
create index if not exists conferencias_fts_gin_idx
  on public.conferencias
  using gin (fts);

-- Paginación cronológica (cursor-based)
create index if not exists conferencias_fecha_impartida_idx
  on public.conferencias (fecha_impartida desc);

-- Monitoreo de estado de video
create index if not exists conferencias_video_status_idx
  on public.conferencias (video_status);

-- Lookup por slug
create index if not exists conferencias_slug_idx
  on public.conferencias (slug);

-- Búsqueda parcial por nombre de ponente (ILIKE '%texto%')
create index if not exists conferencias_ponente_nombre_trgm_idx
  on public.conferencias
  using gin (ponente_nombre gin_trgm_ops);

-- Consulta combinada: conferencias activas por fecha
create index if not exists conferencias_status_fecha_idx
  on public.conferencias (video_status, fecha_impartida desc);

-- =========================================================
-- 6. Trigger updated_at
-- =========================================================
drop trigger if exists trg_conferencias_set_updated_at
  on public.conferencias;

create trigger trg_conferencias_set_updated_at
before update on public.conferencias
for each row
execute function public.set_updated_at();

-- =========================================================
-- 7. Row Level Security
-- =========================================================
alter table public.conferencias enable row level security;

-- Lectura pública (archivo de consulta abierta)
drop policy if exists "conferencias_select_public"
  on public.conferencias;
create policy "conferencias_select_public"
  on public.conferencias
  for select
  to public
  using (true);

-- Escritura restringida a administradores (JWT claim)
drop policy if exists "conferencias_insert_admin"
  on public.conferencias;
create policy "conferencias_insert_admin"
  on public.conferencias
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "conferencias_update_admin"
  on public.conferencias;
create policy "conferencias_update_admin"
  on public.conferencias
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "conferencias_delete_admin"
  on public.conferencias;
create policy "conferencias_delete_admin"
  on public.conferencias
  for delete
  to authenticated
  using (public.is_admin());

-- =========================================================
-- FIN DEL ESQUEMA MAESTRO
-- =========================================================
-- Nota operativa: para que las políticas de escritura
-- funcionen, el usuario administrador debe tener en su
-- app_metadata del JWT:  { "role": "admin" }
--
-- Esto se configura en Supabase con:
--   await supabase.auth.admin.updateUserById(userId, {
--     app_metadata: { role: 'admin' }
--   });
-- =========================================================
