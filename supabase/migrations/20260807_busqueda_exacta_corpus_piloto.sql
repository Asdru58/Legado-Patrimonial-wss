-- ============================================================================
-- Busqueda Exacta sobre el corpus productivo piloto
--
-- Crea exclusivamente:
--   * indice GIN trigram sobre corpus_pasajes.texto_plegado;
--   * RPC publica buscar_corpus_exacta.
--
-- La RPC lexical buscar_conferencias y las tablas historicas no se modifican.
-- La coincidencia ocurre por pasaje: una frase que atraviese por completo una
-- frontera entre pasajes puede no encontrarse en esta primera equivalencia.
-- Esta version reproduce el piloto y no exige limites de palabra: una frase
-- tambien puede coincidir dentro de una cadena mayor.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Precondiciones de la representacion validada
-- ----------------------------------------------------------------------------
DO $preconditions$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_extension AS extension
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = extension.extnamespace
    WHERE extension.extname = 'pg_trgm'
      AND namespace.nspname = 'public'
  ) THEN
    RAISE EXCEPTION
      'La extension pg_trgm debe existir en el esquema public';
  END IF;

  IF pg_catalog.to_regprocedure('public.unaccent_immutable(text)') IS NULL THEN
    RAISE EXCEPTION
      'La funcion public.unaccent_immutable(text) debe existir';
  END IF;
END
$preconditions$;

-- ----------------------------------------------------------------------------
-- 2. Indice para el operador regex (~) utilizado por la RPC
-- ----------------------------------------------------------------------------
CREATE INDEX corpus_pasajes_texto_plegado_trgm_gin_idx
  ON public.corpus_pasajes
  USING gin (texto_plegado public.gin_trgm_ops);

COMMENT ON INDEX public.corpus_pasajes_texto_plegado_trgm_gin_idx IS
  'Acelera coincidencias exactas por regex sobre texto_plegado mediante pg_trgm.';

-- ----------------------------------------------------------------------------
-- 3. RPC de Busqueda Exacta independiente de buscar_conferencias
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.buscar_corpus_exacta(
  consulta text,
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
  numero_ocurrencias integer,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  consulta_limpia text;
  consulta_plegada text;
  patron_exacto text;
  limite_efectivo integer;
  offset_efectivo integer;
BEGIN
  -- Equivale a strip(): elimina espacios exteriores, incluidos saltos y tabs.
  consulta_limpia := pg_catalog.regexp_replace(
    pg_catalog.regexp_replace(
      COALESCE(consulta, ''),
      '^[[:space:]]+',
      ''
    ),
    '[[:space:]]+$',
    ''
  );

  IF consulta_limpia = '' THEN
    RAISE EXCEPTION 'La consulta exacta no puede estar vacia'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.char_length(consulta_limpia) > 200 THEN
    RAISE EXCEPTION 'La consulta exacta no puede superar 200 caracteres'
      USING ERRCODE = '22023';
  END IF;

  -- Misma finalidad que plegar() en el piloto: minusculas y sin diacriticos.
  consulta_plegada := pg_catalog.lower(
    public.unaccent_immutable(consulta_limpia)
  );

  -- Cada termino se trata literalmente y los espacios se reproducen como \s+,
  -- igual que en el motor Exacto validado. La construccion caracter por caracter
  -- impide que signos de la consulta se interpreten como metacaracteres regex.
  WITH tokens AS (
    SELECT token.valor, token.posicion
    FROM pg_catalog.regexp_split_to_table(
      consulta_plegada,
      '[[:space:]]+'
    ) WITH ORDINALITY AS token(valor, posicion)
    WHERE token.valor <> ''
  ),
  tokens_escapados AS (
    SELECT
      tokens.posicion,
      pg_catalog.string_agg(
        CASE
          WHEN pg_catalog.strpos(
            pg_catalog.chr(92) || '.^$|()[]{}*+?',
            caracter.valor
          ) > 0
            THEN pg_catalog.chr(92) || caracter.valor
          ELSE caracter.valor
        END,
        '' ORDER BY caracter.posicion
      ) AS valor
    FROM tokens
    CROSS JOIN LATERAL (
      SELECT
        posicion_caracter AS posicion,
        pg_catalog.substr(tokens.valor, posicion_caracter, 1) AS valor
      FROM pg_catalog.generate_series(
        1,
        pg_catalog.char_length(tokens.valor)
      ) AS serie(posicion_caracter)
    ) AS caracter
    GROUP BY tokens.posicion
  )
  SELECT pg_catalog.string_agg(
    tokens_escapados.valor,
    pg_catalog.chr(92) || 's+'
    ORDER BY tokens_escapados.posicion
  )
  INTO patron_exacto
  FROM tokens_escapados;

  IF patron_exacto IS NULL OR patron_exacto = '' THEN
    RAISE EXCEPTION 'La consulta exacta no puede estar vacia'
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
  WITH resultados AS MATERIALIZED (
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
      coincidencias.numero_ocurrencias
    FROM public.corpus_pasajes AS pasaje
    JOIN public.corpus_transcripciones AS transcripcion
      ON transcripcion.id = pasaje.transcripcion_id
    JOIN public.documentos AS documento
      ON documento.id = transcripcion.documento_id
    JOIN public.conferencias_publicas AS conferencia
      ON conferencia.id = documento.conferencia_id
    CROSS JOIN LATERAL (
      SELECT pg_catalog.count(*)::integer AS numero_ocurrencias
      FROM pg_catalog.regexp_matches(
        pasaje.texto_plegado,
        patron_exacto,
        'g'
      ) AS coincidencia
    ) AS coincidencias
    WHERE transcripcion.es_vigente = true
      AND pasaje.version_fragmentacion =
        'fragmentacion_paginada_250_40_v1'
      AND pasaje.texto_plegado ~ patron_exacto
      AND coincidencias.numero_ocurrencias > 0
  ),
  conferencias_coincidentes AS MATERIALIZED (
    SELECT
      resultados.conferencia_id,
      pg_catalog.max(
        resultados.numero_ocurrencias
      ) AS mejor_numero_ocurrencias
    FROM resultados
    GROUP BY resultados.conferencia_id
  ),
  totales AS (
    SELECT pg_catalog.count(*) AS total_count
    FROM conferencias_coincidentes
  ),
  conferencias_de_la_pagina AS MATERIALIZED (
    SELECT
      conferencias_coincidentes.conferencia_id,
      conferencias_coincidentes.mejor_numero_ocurrencias
    FROM conferencias_coincidentes
    ORDER BY
      conferencias_coincidentes.mejor_numero_ocurrencias DESC,
      conferencias_coincidentes.conferencia_id ASC
    LIMIT limite_efectivo
    OFFSET offset_efectivo
  )
  SELECT
    resultados.conferencia_id,
    resultados.documento_id,
    resultados.titulo,
    resultados.fecha,
    resultados.slug,
    resultados.pasaje_id,
    resultados.orden,
    resultados.pagina_inicio,
    resultados.pagina_fin,
    resultados.texto,
    resultados.numero_ocurrencias,
    totales.total_count
  FROM conferencias_de_la_pagina
  JOIN resultados
    ON resultados.conferencia_id =
      conferencias_de_la_pagina.conferencia_id
  CROSS JOIN totales
  ORDER BY
    conferencias_de_la_pagina.mejor_numero_ocurrencias DESC,
    resultados.conferencia_id ASC,
    resultados.numero_ocurrencias DESC,
    resultados.orden ASC,
    resultados.pasaje_id ASC;
END
$function$;

COMMENT ON FUNCTION public.buscar_corpus_exacta(text, integer, integer) IS
  'Busca una frase completa en pasajes piloto vigentes y devuelve el total de conferencias distintas, sin FTS ni embeddings.';

-- La RPC atraviesa el RLS cerrado con una superficie de lectura estrictamente
-- acotada. No se concede acceso directo a ninguna tabla del corpus.
REVOKE ALL ON FUNCTION public.buscar_corpus_exacta(
  text,
  integer,
  integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.buscar_corpus_exacta(
  text,
  integer,
  integer
) TO anon, authenticated;

COMMIT;
