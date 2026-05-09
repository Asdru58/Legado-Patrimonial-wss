-- =========================================================
-- Legado Patrimonial WSS — Fase 5.8
-- RPC: buscar_conferencias (v2)
-- Búsqueda FTS con ranking real, filtros integrados
-- y total_count exacto vía count(*) over()
--
-- Parche de auditoría: filtros de formato y período
-- movidos dentro de la RPC para garantizar paginación
-- matemáticamente correcta.
--
-- Ejecutar en el SQL Editor de Supabase.
-- Si la v1 ya existe, este CREATE OR REPLACE la reemplaza.
-- =========================================================

create or replace function public.buscar_conferencias(
  termino text,
  formato text default null,
  fecha_desde date default null,
  fecha_hasta date default null,
  resultado_limit integer default 20,
  resultado_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  titulo text,
  extracto text,
  descripcion text,
  fecha_impartida date,
  ponente_nombre text,
  ponente_rol text,
  audio_url text,
  audio_duracion integer,
  pdf_url text,
  video_provider text,
  video_provider_id text,
  video_status text,
  video_checked_at timestamptz,
  video_fallback_provider text,
  video_fallback_url text,
  created_at timestamptz,
  updated_at timestamptz,
  rank real,
  total_count bigint
)
language sql
stable
as $$
  select
    c.id,
    c.slug,
    c.titulo,
    c.extracto,
    c.descripcion,
    c.fecha_impartida,
    c.ponente_nombre,
    c.ponente_rol,
    c.audio_url,
    c.audio_duracion,
    c.pdf_url,
    c.video_provider,
    c.video_provider_id,
    c.video_status,
    c.video_checked_at,
    c.video_fallback_provider,
    c.video_fallback_url,
    c.created_at,
    c.updated_at,
    ts_rank(c.fts, plainto_tsquery('spanish', termino)) as rank,
    count(*) over() as total_count
  from public.conferencias c
  where c.fts @@ plainto_tsquery('spanish', termino)
    and (
      fecha_desde is null
      or c.fecha_impartida >= fecha_desde
    )
    and (
      fecha_hasta is null
      or c.fecha_impartida <= fecha_hasta
    )
    and (
      formato is null
      or (formato = 'audio' and c.audio_url is not null)
      or (formato = 'video' and c.video_provider <> 'none' and c.video_status = 'active')
      or (formato = 'pdf' and c.pdf_url is not null)
    )
  order by rank desc, c.fecha_impartida desc
  limit resultado_limit
  offset resultado_offset;
$$;
