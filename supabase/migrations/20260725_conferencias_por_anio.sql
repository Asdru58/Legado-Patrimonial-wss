-- ============================================================================
-- 20260725_conferencias_por_anio.sql
-- Proyecto: Legado Patrimonial, el Septimo Sello
-- Fecha:    2026-07-25
-- Autorizado por: Asdrubal Lira
--
-- OBJETIVO
--   Corregir la causa raiz documentada en INFORME_CAUSA_CONTEO_ARCHIVO.md:
--   el Panel 1 de /archivo contaba filas recibidas por HTTP, y PostgREST
--   truncaba la respuesta en db-max-rows (1.000 filas) sin que el codigo lo
--   detectara. Resultado: 1.022 conferencias en pantalla en lugar de 5.866.
--
--   Esta funcion resuelve el GROUP BY dentro de PostgreSQL y devuelve una fila
--   por anio (~45), muy por debajo de cualquier limite de transporte. El conteo
--   pasa a ser exacto por construccion, con independencia del volumen.
--
-- CARACTER: estrictamente ADITIVA.
--   * No modifica datos, tablas, vistas, RLS, triggers ni funciones existentes.
--   * No toca buscar_conferencias, conferencias_publicas ni db-max-rows.
--   * Crea un unico objeto nuevo: public.conferencias_por_anio().
--
-- SEGURIDAD
--   * SECURITY INVOKER: se ejecuta con los permisos de quien llama, de modo que
--     las politicas RLS de public.conferencias siguen aplicandose. No escala
--     privilegios.
--   * search_path vacio: todos los nombres van calificados por esquema.
--   * Permisos minimos: solo EXECUTE para anon y authenticated. Se revoca
--     previamente a PUBLIC.
--
-- REVERSION
--   DROP FUNCTION IF EXISTS public.conferencias_por_anio();
--   No deja rastro en datos: la funcion no almacena estado propio.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.conferencias_por_anio()
RETURNS TABLE (anio integer, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    (date_part('year', c.fecha_impartida))::integer AS anio,
    count(*)                                        AS total
  FROM public.conferencias c
  WHERE c.fecha_impartida IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.conferencias_por_anio() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.conferencias_por_anio() TO anon, authenticated;

COMMENT ON FUNCTION public.conferencias_por_anio() IS
  'Panel 1 de /archivo: conteo exacto de conferencias por anio, agregado en PostgreSQL. Sustituye la consulta que transportaba filas y era truncada por db-max-rows. Aditiva: no altera objetos existentes.';

-- ----------------------------------------------------------------------------
-- Verificacion interna: la suma de la funcion debe coincidir con el conteo
-- real de conferencias con fecha. No se comparan cifras literales: se contrastan
-- dos medidas obtenidas de la propia base.
-- ----------------------------------------------------------------------------
DO $ver$
DECLARE
  v_suma_funcion bigint;
  v_conteo_real  bigint;
  v_anios        bigint;
BEGIN
  SELECT coalesce(sum(total), 0), count(*) INTO v_suma_funcion, v_anios
    FROM public.conferencias_por_anio();

  SELECT count(*) INTO v_conteo_real
    FROM public.conferencias
   WHERE fecha_impartida IS NOT NULL;

  IF v_suma_funcion <> v_conteo_real THEN
    RAISE EXCEPTION
      'Verificacion fallida: la funcion suma % y hay % conferencias con fecha.',
      v_suma_funcion, v_conteo_real;
  END IF;

  RAISE NOTICE 'conferencias_por_anio() OK: % anios, % conferencias con fecha (coincide con el conteo real).',
    v_anios, v_suma_funcion;
END $ver$;

COMMIT;
