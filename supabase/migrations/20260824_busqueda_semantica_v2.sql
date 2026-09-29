BEGIN;

CREATE FUNCTION public.buscar_corpus_semantica_v2(
  consulta_vector public.vector,
  resultado_limit integer DEFAULT 20,
  resultado_offset integer DEFAULT 0,
  prefiltro_k integer DEFAULT 2000
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
SET ivfflat.probes = '12'
AS $function$
DECLARE
  limite_efectivo integer;
  offset_efectivo integer;
  k_efectivo integer;
BEGIN
  IF consulta_vector IS NULL THEN
    RAISE EXCEPTION 'El vector de consulta no puede ser NULL'
      USING ERRCODE = '22023';
  END IF;

  IF public.vector_dims(consulta_vector) <> 1024 THEN
    RAISE EXCEPTION 'El vector de consulta debe tener 1024 dimensiones'
      USING ERRCODE = '22023';
  END IF;

  limite_efectivo := LEAST(GREATEST(COALESCE(resultado_limit, 20), 1), 100);
  offset_efectivo := GREATEST(COALESCE(resultado_offset, 0), 0);
  k_efectivo      := LEAST(GREATEST(COALESCE(prefiltro_k, 2000), 100), 10000);

  RETURN QUERY
  WITH vecinos AS MATERIALIZED (
    SELECT
      embedding.pasaje_id,
      (embedding.vector OPERATOR(public.<=>) consulta_vector) AS distancia
    FROM public.corpus_pasaje_embeddings AS embedding
    WHERE embedding.modelo = 'BAAI/bge-m3'
      AND embedding.revision = '142964af7e05de16511657561de8e8750fc153a0'
      AND embedding.dimension = 1024
      AND embedding.normalizado = true
    ORDER BY embedding.vector OPERATOR(public.<=>) consulta_vector
    LIMIT k_efectivo
  ),
  enriquecidos AS MATERIALIZED (
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
      1.0::double precision - vecino.distancia AS similitud,
      pg_catalog.row_number() OVER (
        PARTITION BY conferencia.id
        ORDER BY
          vecino.distancia ASC,
          pasaje.orden ASC,
          pasaje.id ASC
      ) AS posicion_en_conferencia
    FROM vecinos AS vecino
    JOIN public.corpus_pasajes AS pasaje
      ON pasaje.id = vecino.pasaje_id
    JOIN public.corpus_transcripciones AS transcripcion
      ON transcripcion.id = pasaje.transcripcion_id
    JOIN public.documentos AS documento
      ON documento.id = transcripcion.documento_id
    JOIN public.conferencias_publicas AS conferencia
      ON conferencia.id = documento.conferencia_id
    WHERE transcripcion.es_vigente = true
      AND pasaje.version_fragmentacion = 'fragmentacion_paginada_250_40_v1'
  ),
  mejores_por_conferencia AS MATERIALIZED (
    SELECT
      enriquecidos.conferencia_id,
      enriquecidos.documento_id,
      enriquecidos.titulo,
      enriquecidos.fecha,
      enriquecidos.slug,
      enriquecidos.pasaje_id,
      enriquecidos.orden,
      enriquecidos.pagina_inicio,
      enriquecidos.pagina_fin,
      enriquecidos.texto,
      enriquecidos.similitud
    FROM enriquecidos
    WHERE enriquecidos.posicion_en_conferencia = 1
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

COMMENT ON FUNCTION public.buscar_corpus_semantica_v2(
  public.vector, integer, integer, integer
) IS
  'Busqueda semantica en dos etapas: prefiltro ANN sobre indice IVFFlat y enriquecimiento posterior. total_count refleja las conferencias alcanzadas por el prefiltro.';

REVOKE ALL ON FUNCTION public.buscar_corpus_semantica_v2(
  public.vector, integer, integer, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.buscar_corpus_semantica_v2(
  public.vector, integer, integer, integer
) TO anon, authenticated;

COMMIT;
