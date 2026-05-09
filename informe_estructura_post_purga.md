# Informe de Estructura Post-Purga: Tabla `conferencias`

**Fecha de Generación:** 06 de abril de 2026
**Fase Correspondiente:** R-2 (Subfase C - Verificación)
**Estado:** Confirmado intacto post-purga

Este documento detalla la estructura confirmada de la tabla `public.conferencias` tras la ejecución exitosa de la purga masiva de registros. Se verifica que el esquema, las restricciones (constraints) y los índices se mantienen sin alteraciones.

---

## 1. Columnas (21 en total)

| Columna | Tipo de Dato | ¿Permite NULL? |
| :--- | :--- | :--- |
| `id` | uuid | NO |
| `slug` | text | NO |
| `titulo` | text | NO |
| `extracto` | text | SÍ |
| `descripcion` | text | SÍ |
| `fecha_impartida` | date | SÍ |
| `ponente_nombre` | text | SÍ |
| `ponente_rol` | text | SÍ |
| `audio_url` | text | SÍ |
| `audio_duracion` | integer | SÍ |
| `pdf_url` | text | SÍ |
| `video_provider` | text | NO |
| `video_provider_id` | text | SÍ |
| `video_fallback_provider` | text | SÍ |
| `video_fallback_url` | text | SÍ |
| `video_status` | text | NO |
| `video_checked_at` | timestamp with time zone | SÍ |
| `fts` | tsvector | SÍ |
| `created_at` | timestamp with time zone | NO |
| `updated_at` | timestamp with time zone | NO |
| `serie_id` | uuid | SÍ |

---

## 2. Restricciones (Constraints - 11 en total)

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `conferencias_pkey` | Primary Key | `PRIMARY KEY (id)` |
| `conferencias_slug_key` | Unique | `UNIQUE (slug)` |
| `conferencias_serie_id_fkey` | Foreign Key | `FOREIGN KEY (serie_id) REFERENCES series(id) ON DELETE SET NULL` |
| `conferencias_audio_duracion_nonnegative` | Check | `CHECK (((audio_duracion IS NULL) OR (audio_duracion >= 0)))` |
| `conferencias_slug_format` | Check | `CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))` |
| `conferencias_video_fallback_pair_consistent` | Check | `CHECK ((((video_fallback_provider IS NULL) AND (video_fallback_url IS NULL)) OR ((video_fallback_provider IS NOT NULL) AND (video_fallback_url IS NOT NULL))))` |
| `conferencias_video_fallback_provider_check` | Check | `CHECK (((video_fallback_provider IS NULL) OR (video_fallback_provider = ANY (ARRAY['r2'::text, 's3'::text]))))` |
| `conferencias_video_fallback_requires_provider` | Check | `CHECK (((video_provider <> 'none'::text) OR ((video_fallback_provider IS NULL) AND (video_fallback_url IS NULL))))` |
| `conferencias_video_provider_check` | Check | `CHECK ((video_provider = ANY (ARRAY['none'::text, 'youtube'::text, 'r2'::text, 's3'::text])))` |
| `conferencias_video_provider_id_required` | Check | `CHECK ((((video_provider = 'none'::text) AND (video_provider_id IS NULL)) OR ((video_provider <> 'none'::text) AND (video_provider_id IS NOT NULL))))` |
| `conferencias_video_status_check` | Check | `CHECK ((video_status = ANY (ARRAY['pending'::text, 'active'::text, 'unavailable'::text, 'processing'::text, 'disabled'::text])))` |

---

## 3. Índices (9 en total)

| Nombre | Definición (`CREATE INDEX...`) |
| :--- | :--- |
| `conferencias_pkey` | `ON public.conferencias USING btree (id)` (UNIQUE) |
| `conferencias_slug_key` | `ON public.conferencias USING btree (slug)` (UNIQUE) |
| `conferencias_fecha_impartida_idx` | `ON public.conferencias USING btree (fecha_impartida DESC)` |
| `conferencias_fts_gin_idx` | `ON public.conferencias USING gin (fts)` |
| `conferencias_ponente_nombre_trgm_idx`| `ON public.conferencias USING gin (ponente_nombre gin_trgm_ops)` |
| `conferencias_serie_id_idx` | `ON public.conferencias USING btree (serie_id)` |
| `conferencias_slug_idx` | `ON public.conferencias USING btree (slug)` |
| `conferencias_status_fecha_idx` | `ON public.conferencias USING btree (video_status, fecha_impartida DESC)` |
| `conferencias_video_status_idx` | `ON public.conferencias USING btree (video_status)` |
