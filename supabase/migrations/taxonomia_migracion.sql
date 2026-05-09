-- =========================================================
-- Legado Patrimonial WSS — Fase 5.9 (Subfase A)
-- Migración: Modelo de Taxonomía (v2 — post auditoría)
-- =========================================================

-- 1. Tabla: series
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint series_nombre_not_blank check (btrim(nombre) <> '')
);

create unique index if not exists series_nombre_normalized_unique_idx
  on public.series ((lower(btrim(nombre))));

-- 2. Tabla: tematicas
create table if not exists public.tematicas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tematicas_nombre_not_blank check (btrim(nombre) <> '')
);

create unique index if not exists tematicas_nombre_normalized_unique_idx
  on public.tematicas ((lower(btrim(nombre))));

-- 3. Modificación a conferencias: columna serie_id
alter table public.conferencias
  add column if not exists serie_id uuid
  references public.series (id)
  on delete set null;

create index if not exists conferencias_serie_id_idx
  on public.conferencias (serie_id);

-- 4. Tabla Puente: conferencia_tematicas
create table if not exists public.conferencia_tematicas (
  conferencia_id uuid not null references public.conferencias (id) on delete cascade,
  tematica_id uuid not null references public.tematicas (id) on delete cascade,
  primary key (conferencia_id, tematica_id)
);

create index if not exists conferencia_tematicas_tematica_id_idx
  on public.conferencia_tematicas (tematica_id);

-- 5. RLS: series
alter table public.series enable row level security;
drop policy if exists "series_select_public" on public.series;
create policy "series_select_public" on public.series for select to public using (true);
drop policy if exists "series_insert_admin" on public.series;
create policy "series_insert_admin" on public.series for insert to authenticated with check (public.is_admin());
drop policy if exists "series_update_admin" on public.series;
create policy "series_update_admin" on public.series for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "series_delete_admin" on public.series;
create policy "series_delete_admin" on public.series for delete to authenticated using (public.is_admin());

-- 6. RLS: tematicas
alter table public.tematicas enable row level security;
drop policy if exists "tematicas_select_public" on public.tematicas;
create policy "tematicas_select_public" on public.tematicas for select to public using (true);
drop policy if exists "tematicas_insert_admin" on public.tematicas;
create policy "tematicas_insert_admin" on public.tematicas for insert to authenticated with check (public.is_admin());
drop policy if exists "tematicas_update_admin" on public.tematicas;
create policy "tematicas_update_admin" on public.tematicas for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "tematicas_delete_admin" on public.tematicas;
create policy "tematicas_delete_admin" on public.tematicas for delete to authenticated using (public.is_admin());

-- 7. RLS: conferencia_tematicas
alter table public.conferencia_tematicas enable row level security;
drop policy if exists "conferencia_tematicas_select_public" on public.conferencia_tematicas;
create policy "conferencia_tematicas_select_public" on public.conferencia_tematicas for select to public using (true);
drop policy if exists "conferencia_tematicas_insert_admin" on public.conferencia_tematicas;
create policy "conferencia_tematicas_insert_admin" on public.conferencia_tematicas for insert to authenticated with check (public.is_admin());
drop policy if exists "conferencia_tematicas_update_admin" on public.conferencia_tematicas;
create policy "conferencia_tematicas_update_admin" on public.conferencia_tematicas for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "conferencia_tematicas_delete_admin" on public.conferencia_tematicas;
create policy "conferencia_tematicas_delete_admin" on public.conferencia_tematicas for delete to authenticated using (public.is_admin());
