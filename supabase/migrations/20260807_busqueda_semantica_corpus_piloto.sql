-- ============================================================================
-- Busqueda Semantica BGE-M3 sobre el corpus productivo piloto
--
-- Crea exclusivamente:
--   * RPC publica buscar_corpus_semantica.
--
-- La consulta recibe un vector ya generado fuera de PostgreSQL. La RPC usa
-- distancia coseno exacta sobre los embeddings BGE-M3 congelados, selecciona
-- el mejor pasaje de cada conferencia y pagina por conferencias.
-- No crea indices HNSW o IVFFlat y no modifica las busquedas Exacta o Lexica.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Precondiciones de pgvector verificadas para search_path vacio
-- ----------------------------------------------------------------------------
DO $preconditions$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_extension AS extension
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = extension.extnamespace
    WHERE extension.extname = 'vector'
      AND namespace.nspname = 'public'
  ) THEN
    RAISE EXCEPTION
      'La extension vector debe existir en el esquema public';
  END IF;

  IF pg_catalog.to_regtype('public.vector') IS NULL THEN
    RAISE EXCEPTION
      'El tipo public.vector debe existir';
  END IF;

  IF pg_catalog.to_regprocedure(
    'public.vector_dims(public.vector)'
  ) IS NULL THEN
    RAISE EXCEPTION
      'La funcion public.vector_dims(public.vector) debe existir';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_operator AS operator
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = operator.oprnamespace
    WHERE namespace.nspname = 'public'
      AND operator.oprname = '<=>'
      AND operator.oprleft = pg_catalog.to_regtype('public.vector')
      AND operator.oprright = pg_catalog.to_regtype('public.vector')
  ) THEN
    RAISE EXCEPTION
      'El operador public.<=>(public.vector, public.vector) debe existir';
  END IF;
END
$preconditions$;

-- ----------------------------------------------------------------------------
-- 2. RPC de Busqueda Semantica independiente de Exacta y Lexica
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.buscar_corpus_semantica(
  consulta_vector public.vector,
  resultado_limit integer DEFAULT 20,
  resultado_offset integer DEFAULT 0
)
RETURNS TABLE (
  conferencia_id uuid,
  documento_id uuid,
  titulo text,
  fecha date,
  slug text,
  pasaje_id uuid,
  orden integer,
  pagina_inicio integer,
  pagina_fin integer,
  texto text,
  similitud double precision,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  limite_efectivo integer;
  offset_efectivo integer;
BEGIN
  IF consulta_vector IS NULL THEN
    RAISE EXCEPTION 'El vector de consulta no puede ser NULL'
      USING ERRCODE = '22023';
  END IF;

  IF public.vector_dims(consulta_vector) <> 1024 THEN
    RAISE EXCEPTION 'El vector de consulta debe tener 1024 dimensiones'
      USING ERRCODE = '22023';
  END IF;

  limite_efectivo := LEAST(
    GREATEST(COALESCE(resultado_limit, 20), 1),
    100
  );
  offset_efectivo := GREATEST(
    COALESCE(resultado_offset, 0),
    0
  );

  RETURN QUERY
  WITH candidatos AS MATERIALIZED (
    SELECT
      conferencia.id AS conferencia_id,
      documento.id AS documento_id,
      conferencia.titulo,
      conferencia.fecha_impartida AS fecha,
      conferencia.slug,
      pasaje.id AS pasaje_id,
      pasaje.orden,
      pasaje.pagina_inicio,
      pasaje.pagina_fin,
      pasaje.texto,
      1.0::double precision - (
        embedding.vector OPERATOR(public.<=>) consulta_vector
      ) AS similitud,
      pg_catalog.row_number() OVER (
        PARTITION BY conferencia.id
        ORDER BY
          embedding.vector OPERATOR(public.<=>) consulta_vector ASC,
          pasaje.orden ASC,
          pasaje.id ASC
      ) AS posicion_en_conferencia
    FROM public.corpus_pasaje_embeddings AS embedding
    JOIN public.corpus_pasajes AS pasaje
      ON pasaje.id = embedding.pasaje_id
    JOIN public.corpus_transcripciones AS transcripcion
      ON transcripcion.id = pasaje.transcripcion_id
    JOIN public.documentos AS documento
      ON documento.id = transcripcion.documento_id
    JOIN public.conferencias_publicas AS conferencia
      ON conferencia.id = documento.conferencia_id
    WHERE transcripcion.es_vigente = true
      AND pasaje.version_fragmentacion =
        'fragmentacion_paginada_250_40_v1'
      AND embedding.modelo = 'BAAI/bge-m3'
      AND embedding.revision =
        '142964af7e05de16511657561de8e8750fc153a0'
      AND embedding.dimension = 1024
      AND embedding.normalizado = true
  ),
  mejores_por_conferencia AS MATERIALIZED (
    SELECT
      candidatos.conferencia_id,
      candidatos.documento_id,
      candidatos.titulo,
      candidatos.fecha,
      candidatos.slug,
      candidatos.pasaje_id,
      candidatos.orden,
      candidatos.pagina_inicio,
      candidatos.pagina_fin,
      candidatos.texto,
      candidatos.similitud
    FROM candidatos
    WHERE candidatos.posicion_en_conferencia = 1
  ),
  totales AS (
    SELECT pg_catalog.count(*) AS total_count
    FROM mejores_por_conferencia
  )
  SELECT
    mejores.conferencia_id,
    mejores.documento_id,
    mejores.titulo,
    mejores.fecha,
    mejores.slug,
    mejores.pasaje_id,
    mejores.orden,
    mejores.pagina_inicio,
    mejores.pagina_fin,
    mejores.texto,
    mejores.similitud,
    totales.total_count
  FROM mejores_por_conferencia AS mejores
  CROSS JOIN totales
  ORDER BY
    mejores.similitud DESC,
    mejores.conferencia_id ASC
  LIMIT limite_efectivo
  OFFSET offset_efectivo;
END
$function$;

COMMENT ON FUNCTION public.buscar_corpus_semantica(
  public.vector,
  integer,
  integer
) IS
  'Clasifica conferencias por el mejor pasaje BGE-M3 del corpus piloto mediante distancia coseno exacta.';

-- La RPC atraviesa el RLS cerrado con una superficie de lectura estrictamente
-- acotada. No se concede acceso directo a ninguna tabla del corpus.
REVOKE ALL ON FUNCTION public.buscar_corpus_semantica(
  public.vector,
  integer,
  integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.buscar_corpus_semantica(
  public.vector,
  integer,
  integer
) TO anon, authenticated;

COMMIT;
