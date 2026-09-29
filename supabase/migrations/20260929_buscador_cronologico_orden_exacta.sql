-- =====================================================================================================================
-- Migracion 20260928_buscador_cronologico · SUPABASE · SOLO ORDEN · DISENO PARA REVISION. NO EJECUTADA.
-- NO APLICAR hasta auditar de nuevo esa instancia: la guardia exige la huella 20260807 (fb15ae795df224b2fc109945c702c53c).
-- A') buscar_corpus_exacta: la definicion de 20260807 con UN SOLO cambio de comportamiento: conferencias por
--     fecha ASC NULLS LAST, desempate conferencia_id ASC. La coincidencia (terminos por espacios, union \s+) y el orden de
--     pasajes dentro de cada conferencia (numero_ocurrencias DESC, orden) NO cambian. Huella resultante: f04a5e828d8c14a004bc7faf5424d8a9.
-- B') buscador_huella_corpus() + buscar_corpus_exacta_v2 con la MISMA coincidencia que A'.
-- Sin semantica v3 (inviable con statement_timeout = 3 s). Generado por g_ddl.py. Reversion: 03_REVERSION_SUPABASE_01b.sql.
-- =====================================================================================================================
BEGIN;
-- GUARDIA: la migracion se detiene SOLA si la firma, el tipo de retorno o la huella previa no son los aprobados.
DO $guardia$
DECLARE f pg_catalog.regprocedure; h text; a text; r text;
BEGIN
  f := pg_catalog.to_regprocedure('public.buscar_corpus_exacta(text,integer,integer)');
  IF f IS NULL THEN RAISE EXCEPTION 'MIGRACION DETENIDA (supabase 01b): no existe buscar_corpus_exacta(text,integer,integer)'; END IF;
  SELECT pg_catalog.md5(p.prosrc), pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)
    INTO h, a, r FROM pg_catalog.pg_proc p WHERE p.oid = f;
  IF a <> 'consulta text, resultado_limit integer DEFAULT 20, resultado_offset integer DEFAULT 0' THEN RAISE EXCEPTION 'MIGRACION DETENIDA (supabase 01b): argumentos no aprobados: %', a; END IF;
  IF r <> 'TABLE(conferencia_id uuid, documento_id uuid, titulo text, fecha date, slug text, pasaje_id uuid, orden integer, pagina_inicio integer, pagina_fin integer, texto text, numero_ocurrencias integer, total_count bigint)' THEN RAISE EXCEPTION 'MIGRACION DETENIDA (supabase 01b): retorno no aprobado: %', r; END IF;
  IF h NOT IN ('fb15ae795df224b2fc109945c702c53c') THEN RAISE EXCEPTION 'MIGRACION DETENIDA (supabase 01b): huella previa no aprobada: %', h; END IF;
  IF pg_catalog.to_regprocedure('public.buscar_corpus_exacta_v2(text,integer,integer,integer,integer,text,text)') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.buscador_huella_corpus()') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.buscador_marcar_revision()') IS NOT NULL
     OR pg_catalog.to_regclass('public.buscador_revision_corpus') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname = 'trg_buscador_revision') THEN
    RAISE EXCEPTION 'MIGRACION DETENIDA (supabase 01b): los objetos nuevos ya existen';
  END IF;
END $guardia$;

CREATE OR REPLACE FUNCTION public.buscar_corpus_exacta(consulta text, resultado_limit integer DEFAULT 20, resultado_offset integer DEFAULT 0)
 RETURNS TABLE(conferencia_id uuid, documento_id uuid, titulo text, fecha date, slug text, pasaje_id uuid, orden integer, pagina_inicio integer, pagina_fin integer, texto text, numero_ocurrencias integer, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
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
      ) AS mejor_numero_ocurrencias,
      pg_catalog.min(resultados.fecha) AS fecha
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
      conferencias_coincidentes.mejor_numero_ocurrencias,
      conferencias_coincidentes.fecha
    FROM conferencias_coincidentes
    ORDER BY
      conferencias_coincidentes.fecha ASC NULLS LAST,
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
    conferencias_de_la_pagina.fecha ASC NULLS LAST,
    resultados.conferencia_id ASC,
    resultados.numero_ocurrencias DESC,
    resultados.orden ASC,
    resultados.pasaje_id ASC;
END
$function$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Revision TRANSACCIONAL del corpus navegable (revision 4 del diseno). Sustituye a la secuencia de la revision 3, que
-- no era transaccional (nextval es visible al instante y no se revierte: una escritura abierta podia avanzar el
-- contador antes de confirmar sus cambios).
--   * Una sola fila (id = 1) con un contador. Un disparador BEFORE ... FOR EACH STATEMENT la actualiza dentro de la
--     MISMA transaccion que cambia el corpus: el nuevo valor solo es visible cuando esos cambios se confirman, y es
--     invisible si se revierten. Toma el bloqueo del contador ANTES que los de las filas de la sentencia.
--   * Coste: las transacciones que escriben en el corpus se serializan sobre esa fila (una espera a que la otra
--     confirme). Las lecturas no esperan nunca. Se mide en el ensayo.
--   * Coherencia de cada llamada: las funciones de busqueda son STABLE; en PostgreSQL todas sus sentencias usan la
--     instantanea de la consulta que las llama, asi que la huella y los resultados de una misma llamada salen del
--     mismo estado confirmado (se prueba en el ensayo).
--   * Limites declarados: no ve cambios hechos con los disparadores desactivados (session_replication_role = replica)
--     ni DDL. No modifica ningun disparador existente (f2_*): solo anade disparadores nuevos, de sentencia.
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE public.buscador_revision_corpus (
  id          smallint PRIMARY KEY CHECK (id = 1),
  revision    bigint NOT NULL CHECK (revision >= 0),
  cambiado_at timestamptz NOT NULL
);
INSERT INTO public.buscador_revision_corpus (id, revision, cambiado_at) VALUES (1, 0, pg_catalog.clock_timestamp());
REVOKE ALL ON public.buscador_revision_corpus FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.buscador_revision_corpus FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.buscador_revision_corpus FROM authenticated'; END IF;
END $$;

CREATE FUNCTION public.buscador_marcar_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.buscador_revision_corpus
     SET revision = revision + 1, cambiado_at = pg_catalog.clock_timestamp()
   WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'buscador_revision_corpus sin su fila unica: la revision del corpus no puede marcarse';
  END IF;
  RETURN NULL;
END
$function$;
REVOKE ALL ON FUNCTION public.buscador_marcar_revision() FROM PUBLIC;

CREATE TRIGGER trg_buscador_revision BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.conferencias
  FOR EACH STATEMENT EXECUTE FUNCTION public.buscador_marcar_revision();
CREATE TRIGGER trg_buscador_revision BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.documentos
  FOR EACH STATEMENT EXECUTE FUNCTION public.buscador_marcar_revision();
CREATE TRIGGER trg_buscador_revision BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.corpus_transcripciones
  FOR EACH STATEMENT EXECUTE FUNCTION public.buscador_marcar_revision();
CREATE TRIGGER trg_buscador_revision BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.corpus_pasajes
  FOR EACH STATEMENT EXECUTE FUNCTION public.buscador_marcar_revision();
CREATE TRIGGER trg_buscador_revision BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.corpus_pasaje_embeddings
  FOR EACH STATEMENT EXECUTE FUNCTION public.buscador_marcar_revision();

CREATE FUNCTION public.buscador_huella_corpus()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT pg_catalog.md5('buscador_2026-09-28_r4:' || r.revision::text)
  FROM public.buscador_revision_corpus AS r WHERE r.id = 1
$function$;
REVOKE ALL ON FUNCTION public.buscador_huella_corpus() FROM PUBLIC;

CREATE FUNCTION public.buscar_corpus_exacta_v2(
    consulta text,
    resultado_limit integer DEFAULT 50,
    resultado_offset integer DEFAULT 0,
    anio_desde integer DEFAULT NULL,
    anio_hasta integer DEFAULT NULL,
    ordenar_por text DEFAULT 'antiguos',
    huella_esperada text DEFAULT NULL)
 RETURNS TABLE(conferencia_id uuid, documento_id uuid, titulo text, fecha date, slug text, pasaje_id uuid, orden integer,
               pagina_inicio integer, pagina_fin integer, texto text, numero_ocurrencias integer, posicion bigint,
               total_count bigint, huella_corpus text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  consulta_limpia text;
  consulta_plegada text;
  patron_exacto text;
  limite_efectivo integer;
  offset_efectivo integer;
  fecha_desde date;
  fecha_hasta date;
  hay_filtro boolean;
  huella text;
BEGIN
  IF ordenar_por IS NULL OR ordenar_por NOT IN ('antiguos', 'recientes', 'relevancia') THEN
    RAISE EXCEPTION 'ordenar_por debe ser antiguos, recientes o relevancia' USING ERRCODE = '22023';
  END IF;
  IF (anio_desde IS NOT NULL AND (anio_desde < 1974 OR anio_desde > 2018))
     OR (anio_hasta IS NOT NULL AND (anio_hasta < 1974 OR anio_hasta > 2018)) THEN
    RAISE EXCEPTION 'los anos deben estar entre 1974 y 2018' USING ERRCODE = '22023';
  END IF;
  IF anio_desde IS NOT NULL AND anio_hasta IS NOT NULL AND anio_desde > anio_hasta THEN
    RAISE EXCEPTION 'el ano inicial no puede ser posterior al final' USING ERRCODE = '22023';
  END IF;
  huella := public.buscador_huella_corpus();
  IF huella_esperada IS NOT NULL AND huella_esperada <> huella THEN
    RAISE EXCEPTION 'El corpus cambio durante la navegacion; la busqueda debe reiniciarse desde la primera pagina'
      USING ERRCODE = 'P0001', HINT = 'huella_corpus_cambiada';
  END IF;
  hay_filtro  := anio_desde IS NOT NULL OR anio_hasta IS NOT NULL;
  fecha_desde := pg_catalog.make_date(COALESCE(anio_desde, 1974), 1, 1);
  fecha_hasta := pg_catalog.make_date(COALESCE(anio_hasta, 2018), 12, 31);

  consulta_limpia := pg_catalog.regexp_replace(
    pg_catalog.regexp_replace(COALESCE(consulta, ''), '^[[:space:]]+', ''), '[[:space:]]+$', '');
  IF consulta_limpia = '' THEN
    RAISE EXCEPTION 'La consulta exacta no puede estar vacia' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.char_length(consulta_limpia) > 200 THEN
    RAISE EXCEPTION 'La consulta exacta no puede superar 200 caracteres' USING ERRCODE = '22023';
  END IF;
  consulta_plegada := pg_catalog.lower(public.unaccent_immutable(consulta_limpia));
  WITH tokens AS (
    SELECT token.valor, token.posicion
    FROM pg_catalog.regexp_split_to_table(consulta_plegada, '[[:space:]]+') WITH ORDINALITY AS token(valor, posicion)
    WHERE token.valor <> ''
  ),
  tokens_escapados AS (
    SELECT tokens.posicion,
           pg_catalog.string_agg(
             CASE WHEN pg_catalog.strpos(pg_catalog.chr(92) || '.^$|()[]{}*+?', caracter.valor) > 0
                  THEN pg_catalog.chr(92) || caracter.valor ELSE caracter.valor END,
             '' ORDER BY caracter.posicion) AS valor
    FROM tokens
    CROSS JOIN LATERAL (
      SELECT posicion_caracter AS posicion, pg_catalog.substr(tokens.valor, posicion_caracter, 1) AS valor
      FROM pg_catalog.generate_series(1, pg_catalog.char_length(tokens.valor)) AS serie(posicion_caracter)
    ) AS caracter
    GROUP BY tokens.posicion
  )
  SELECT pg_catalog.string_agg(tokens_escapados.valor, pg_catalog.chr(92) || 's+' ORDER BY tokens_escapados.posicion)
  INTO patron_exacto FROM tokens_escapados;
  IF patron_exacto IS NULL OR patron_exacto = '' THEN
    RAISE EXCEPTION 'La consulta exacta debe contener al menos una palabra' USING ERRCODE = '22023';
  END IF;
  limite_efectivo := LEAST(GREATEST(COALESCE(resultado_limit, 50), 1), 100);   -- tamano de PAGINA, no del conjunto
  offset_efectivo := GREATEST(COALESCE(resultado_offset, 0), 0);                -- sin tope: se llega al ultimo resultado

  RETURN QUERY
  WITH resultados AS MATERIALIZED (
    SELECT conferencia.id AS conferencia_id, documento.id AS documento_id, conferencia.titulo,
           conferencia.fecha_impartida AS fecha, conferencia.slug, pasaje.id AS pasaje_id, pasaje.orden,
           pasaje.pagina_inicio, pasaje.pagina_fin, pasaje.texto, coincidencias.numero_ocurrencias
    FROM public.corpus_pasajes AS pasaje
    JOIN public.corpus_transcripciones AS transcripcion ON transcripcion.id = pasaje.transcripcion_id
    JOIN public.documentos AS documento ON documento.id = transcripcion.documento_id
    JOIN public.conferencias_publicas AS conferencia ON conferencia.id = documento.conferencia_id
    CROSS JOIN LATERAL (
      SELECT pg_catalog.count(*)::integer AS numero_ocurrencias
      FROM pg_catalog.regexp_matches(pasaje.texto_plegado, patron_exacto, 'g') AS coincidencia
    ) AS coincidencias
    WHERE transcripcion.es_vigente = true
      AND pasaje.version_fragmentacion = 'fragmentacion_paginada_250_40_v1'
      AND (NOT hay_filtro OR conferencia.fecha_impartida BETWEEN fecha_desde AND fecha_hasta)
      AND pasaje.texto_plegado ~ patron_exacto
      AND coincidencias.numero_ocurrencias > 0
  ),
  conferencias_coincidentes AS MATERIALIZED (
    SELECT resultados.conferencia_id, pg_catalog.min(resultados.fecha) AS fecha,
           pg_catalog.max(resultados.numero_ocurrencias) AS mejor_numero_ocurrencias
    FROM resultados GROUP BY resultados.conferencia_id
  ),
  ordenadas AS MATERIALIZED (
    SELECT cc.conferencia_id, cc.fecha,
           pg_catalog.row_number() OVER (ORDER BY
             CASE WHEN ordenar_por = 'relevancia' THEN cc.mejor_numero_ocurrencias END DESC NULLS LAST,
             CASE WHEN ordenar_por = 'recientes' THEN cc.fecha END DESC NULLS LAST,
             cc.fecha ASC NULLS LAST,
             cc.conferencia_id ASC) AS posicion,
           pg_catalog.count(*) OVER () AS total_count
    FROM conferencias_coincidentes AS cc
  )
  SELECT resultados.conferencia_id, resultados.documento_id, resultados.titulo, resultados.fecha, resultados.slug,
         resultados.pasaje_id, resultados.orden, resultados.pagina_inicio, resultados.pagina_fin, resultados.texto,
         resultados.numero_ocurrencias, ordenadas.posicion, ordenadas.total_count, huella
  FROM ordenadas
  JOIN resultados ON resultados.conferencia_id = ordenadas.conferencia_id
  WHERE ordenadas.posicion > offset_efectivo AND ordenadas.posicion <= offset_efectivo + limite_efectivo
  ORDER BY ordenadas.posicion ASC, resultados.numero_ocurrencias DESC, resultados.orden ASC, resultados.pasaje_id ASC;
END
$function$;

REVOKE ALL ON FUNCTION public.buscar_corpus_exacta_v2(text, integer, integer, integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_corpus_exacta_v2(text, integer, integer, integer, integer, text, text) TO anon, authenticated, service_role;
DO $acl$
DECLARE a text[]; b text[];
BEGIN
  SELECT pg_catalog.array_agg(x.grantee::regrole::text ORDER BY 1) INTO a FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(p.proacl) x
   WHERE p.oid = 'public.buscar_corpus_exacta(text,integer,integer)'::regprocedure AND x.privilege_type = 'EXECUTE';
  SELECT pg_catalog.array_agg(x.grantee::regrole::text ORDER BY 1) INTO b FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(p.proacl) x
   WHERE p.oid = 'public.buscar_corpus_exacta_v2(text,integer,integer,integer,integer,text,text)'::regprocedure AND x.privilege_type = 'EXECUTE';
  IF a IS DISTINCT FROM b THEN RAISE EXCEPTION 'MIGRACION DETENIDA: permisos distintos % / %', a, b; END IF;
END $acl$;
-- COMPROBACION FINAL: la exacta debe quedar exactamente con la huella esperada.
DO $fin$ BEGIN
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = 'public.buscar_corpus_exacta(text,integer,integer)'::regprocedure) <> 'f04a5e828d8c14a004bc7faf5424d8a9' THEN
    RAISE EXCEPTION 'MIGRACION DETENIDA (supabase 01b): la exacta no quedo con la huella esperada f04a5e828d8c14a004bc7faf5424d8a9';
  END IF;
END $fin$;
NOTIFY pgrst, 'reload schema';
COMMIT;
