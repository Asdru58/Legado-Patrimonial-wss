import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/test-connection
 * Fase 3 — Verifica el flujo completo: RLS + datos de prueba.
 * Consulta conferencias con su multimedia vinculada y valida
 * que las políticas de lectura pública estén activas.
 */
export async function GET() {
    const resultados: Record<string, unknown> = {
        fase: 'Fase 3 — Validación RLS + Datos de Prueba',
        timestamp: new Date().toISOString(),
    }

    try {
        const supabase = await createClient()

        // 1. Verificar lectura de conferencias (RLS debe permitir SELECT)
        const { data: conferencias, error: errConf } = await supabase
            .from('conferencias')
            .select('*')
            .order('fecha_impartida', { ascending: false })
            .limit(10)

        if (errConf) {
            return NextResponse.json(
                {
                    ...resultados,
                    status: 'ERROR',
                    test_rls_conferencias: 'FALLIDO',
                    error: errConf.message,
                    diagnostico:
                        'RLS puede estar habilitado sin políticas de lectura. Ejecuta el SQL de Fase 3.',
                },
                { status: 500 }
            )
        }

        resultados.test_rls_conferencias = 'OK'
        resultados.conferencias_encontradas = conferencias?.length ?? 0
        resultados.conferencias = conferencias

        // 2. Verificar lectura de multimedia (RLS + FK)
        const { data: multimedia, error: errMulti } = await supabase
            .from('multimedia')
            .select('*')
            .limit(10)

        if (errMulti) {
            return NextResponse.json(
                {
                    ...resultados,
                    status: 'PARCIAL',
                    test_rls_multimedia: 'FALLIDO',
                    error_multimedia: errMulti.message,
                },
                { status: 500 }
            )
        }

        resultados.test_rls_multimedia = 'OK'
        resultados.multimedia_encontrados = multimedia?.length ?? 0
        resultados.multimedia = multimedia

        // 3. Verificar JOIN: conferencia con multimedia vinculada
        const { data: conferenciaConMultimedia, error: errJoin } =
            await supabase
                .from('conferencias')
                .select(
                    `
                    id,
                    titulo,
                    fecha_impartida,
                    lugar,
                    multimedia (
                        id,
                        audio_url,
                        video_url,
                        pdf_url
                    )
                `
                )
                .limit(5)

        if (errJoin) {
            resultados.test_join = 'FALLIDO'
            resultados.error_join = errJoin.message
        } else {
            resultados.test_join = 'OK'
            resultados.conferencias_con_multimedia = conferenciaConMultimedia
        }

        // 4. Verificar otras tablas (pueden estar vacías pero deben ser legibles)
        const { error: errTransc } = await supabase
            .from('transcripciones_fragmentos')
            .select('id')
            .limit(1)

        const { error: errGrafo } = await supabase
            .from('grafo_tematico')
            .select('id')
            .limit(1)

        resultados.test_rls_transcripciones = errTransc
            ? `FALLIDO: ${errTransc.message}`
            : 'OK'
        resultados.test_rls_grafo = errGrafo
            ? `FALLIDO: ${errGrafo.message}`
            : 'OK'

        // 5. Resumen final
        const todosOk =
            !errConf && !errMulti && !errJoin && !errTransc && !errGrafo
        const hayDatos = (conferencias?.length ?? 0) > 0

        resultados.status = todosOk ? 'OK' : 'PARCIAL'
        resultados.resumen = {
            rls_activo: todosOk,
            datos_prueba_presentes: hayDatos,
            tablas_legibles: {
                conferencias: !errConf,
                multimedia: !errMulti,
                transcripciones_fragmentos: !errTransc,
                grafo_tematico: !errGrafo,
            },
            join_funcionando: !errJoin,
        }

        if (!hayDatos) {
            resultados.aviso =
                'RLS permite lectura pero no hay datos de prueba. ¿Ejecutaste la sección 3 del SQL?'
        }

        return NextResponse.json(resultados, {
            status: todosOk ? 200 : 207,
        })
    } catch (err) {
        return NextResponse.json(
            {
                ...resultados,
                status: 'ERROR_CRITICO',
                error:
                    err instanceof Error ? err.message : 'Error desconocido',
                diagnostico:
                    'Error de conexión. Verifica NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local',
            },
            { status: 500 }
        )
    }
}
