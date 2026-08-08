-- ============================================================================
-- 20260807_modelo_corpus_busqueda_piloto.sql
-- Proyecto: Legado Patrimonial, el Septimo Sello
-- Fecha:    2026-08-07
-- Autorizado por: Asdrubal Lira
--
-- OBJETIVO
--   Crear exclusivamente la estructura aislada del corpus productivo piloto:
--     * public.corpus_transcripciones
--     * public.corpus_pasajes
--     * public.corpus_pasaje_embeddings
--
-- SEGURIDAD PREVENTIVA
--   Las tres tablas nacen con RLS habilitado y sin politicas. Esta migracion no
--   concede acceso publico ni crea funciones, triggers, vistas o RPC.
--
-- FUERA DE ALCANCE
--   No carga datos y no crea indices GIN, pg_trgm, FTS, HNSW o IVFFlat.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Transcripciones canonicas versionadas
-- ----------------------------------------------------------------------------
CREATE TABLE public.corpus_transcripciones (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id               uuid        NOT NULL,
  version_transcripcion      integer     NOT NULL,
  texto_bruto                text        NOT NULL,
  sha256_texto_bruto         text        NOT NULL,
  texto_normalizado          text        NOT NULL,
  sha256_texto_normalizado   text        NOT NULL,
  version_extraccion         text        NOT NULL,
  version_normalizacion      text        NOT NULL,
  origen                     text        NOT NULL,
  numero_paginas             integer     NOT NULL,
  es_vigente                 boolean     NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  validada_at                timestamptz NOT NULL,

  CONSTRAINT corpus_transcripciones_documento_fkey
    FOREIGN KEY (documento_id)
    REFERENCES public.documentos(id)
    ON DELETE RESTRICT,

  CONSTRAINT corpus_transcripciones_version_positiva_ck
    CHECK (version_transcripcion > 0),
  CONSTRAINT corpus_transcripciones_texto_bruto_no_vacio_ck
    CHECK (btrim(texto_bruto) <> ''),
  CONSTRAINT corpus_transcripciones_texto_normalizado_no_vacio_ck
    CHECK (btrim(texto_normalizado) <> ''),
  CONSTRAINT corpus_transcripciones_sha256_bruto_formato_ck
    CHECK (sha256_texto_bruto ~ '^[0-9a-f]{64}$'),
  CONSTRAINT corpus_transcripciones_sha256_normalizado_formato_ck
    CHECK (sha256_texto_normalizado ~ '^[0-9a-f]{64}$'),
  CONSTRAINT corpus_transcripciones_version_extraccion_no_vacia_ck
    CHECK (btrim(version_extraccion) <> ''),
  CONSTRAINT corpus_transcripciones_version_normalizacion_no_vacia_ck
    CHECK (btrim(version_normalizacion) <> ''),
  CONSTRAINT corpus_transcripciones_origen_no_vacio_ck
    CHECK (btrim(origen) <> ''),
  CONSTRAINT corpus_transcripciones_numero_paginas_positivo_ck
    CHECK (numero_paginas > 0),

  CONSTRAINT corpus_transcripciones_documento_version_uk
    UNIQUE (documento_id, version_transcripcion),
  CONSTRAINT corpus_transcripciones_documento_hashes_uk
    UNIQUE (documento_id, sha256_texto_bruto, sha256_texto_normalizado)
);

CREATE UNIQUE INDEX corpus_transcripciones_documento_vigente_uk
  ON public.corpus_transcripciones (documento_id)
  WHERE es_vigente = true;

-- ----------------------------------------------------------------------------
-- 2. Pasajes derivados y regenerables
-- ----------------------------------------------------------------------------
CREATE TABLE public.corpus_pasajes (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transcripcion_id         uuid        NOT NULL,
  version_fragmentacion    text        NOT NULL,
  orden                    integer     NOT NULL,
  char_start               integer     NOT NULL,
  char_end                 integer     NOT NULL,
  texto                    text        NOT NULL,
  texto_plegado            text        NOT NULL,
  sha256_texto             text        NOT NULL,
  numero_palabras          integer     NOT NULL,
  pagina_inicio            integer     NOT NULL,
  pagina_fin               integer     NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT corpus_pasajes_transcripcion_fkey
    FOREIGN KEY (transcripcion_id)
    REFERENCES public.corpus_transcripciones(id)
    ON DELETE CASCADE,

  CONSTRAINT corpus_pasajes_version_fragmentacion_no_vacia_ck
    CHECK (btrim(version_fragmentacion) <> ''),
  CONSTRAINT corpus_pasajes_orden_positivo_ck
    CHECK (orden > 0),
  CONSTRAINT corpus_pasajes_char_start_no_negativo_ck
    CHECK (char_start >= 0),
  CONSTRAINT corpus_pasajes_intervalo_caracteres_ck
    CHECK (char_end > char_start),
  CONSTRAINT corpus_pasajes_texto_no_vacio_ck
    CHECK (btrim(texto) <> ''),
  CONSTRAINT corpus_pasajes_texto_plegado_no_vacio_ck
    CHECK (btrim(texto_plegado) <> ''),
  CONSTRAINT corpus_pasajes_sha256_texto_formato_ck
    CHECK (sha256_texto ~ '^[0-9a-f]{64}$'),
  CONSTRAINT corpus_pasajes_numero_palabras_positivo_ck
    CHECK (numero_palabras > 0),
  CONSTRAINT corpus_pasajes_pagina_inicio_positiva_ck
    CHECK (pagina_inicio > 0),
  CONSTRAINT corpus_pasajes_intervalo_paginas_ck
    CHECK (pagina_fin >= pagina_inicio),

  CONSTRAINT corpus_pasajes_transcripcion_version_orden_uk
    UNIQUE (transcripcion_id, version_fragmentacion, orden),
  CONSTRAINT corpus_pasajes_transcripcion_version_intervalo_uk
    UNIQUE (transcripcion_id, version_fragmentacion, char_start, char_end)
);

-- ----------------------------------------------------------------------------
-- 3. Embeddings derivados por pasaje
-- ----------------------------------------------------------------------------
CREATE TABLE public.corpus_pasaje_embeddings (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  pasaje_id     uuid         NOT NULL,
  modelo        text         NOT NULL,
  revision      text         NOT NULL,
  dimension     integer      NOT NULL,
  vector        vector(1024) NOT NULL,
  normalizado   boolean      NOT NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT corpus_pasaje_embeddings_pasaje_fkey
    FOREIGN KEY (pasaje_id)
    REFERENCES public.corpus_pasajes(id)
    ON DELETE CASCADE,

  CONSTRAINT corpus_pasaje_embeddings_modelo_no_vacio_ck
    CHECK (btrim(modelo) <> ''),
  CONSTRAINT corpus_pasaje_embeddings_revision_no_vacia_ck
    CHECK (btrim(revision) <> ''),
  CONSTRAINT corpus_pasaje_embeddings_dimension_1024_ck
    CHECK (dimension = 1024),

  CONSTRAINT corpus_pasaje_embeddings_pasaje_modelo_revision_uk
    UNIQUE (pasaje_id, modelo, revision)
);

-- ----------------------------------------------------------------------------
-- 4. RLS preventivo: tablas cerradas hasta una migracion posterior de politicas
-- ----------------------------------------------------------------------------
ALTER TABLE public.corpus_transcripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_pasajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_pasaje_embeddings ENABLE ROW LEVEL SECURITY;

COMMIT;
