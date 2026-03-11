import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Endpoint de verificación de salud.
 * Comprueba la conexión a Supabase y lista las tablas disponibles.
 */
export async function GET() {
    try {
        const supabase = await createClient()

        // Verificar conexión leyendo conferencias (debería devolver array vacío)
        const { data, error } = await supabase
            .from('conferencias')
            .select('id')
            .limit(1)

        if (error) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'No se pudo conectar a Supabase',
                    error: error.message,
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            status: 'ok',
            proyecto: 'Legado Patrimonial WSS',
            supabase_conectado: true,
            tablas_verificadas: ['conferencias', 'multimedia', 'transcripciones_fragmentos', 'grafo_tematico'],
            conferencias_count: data?.length ?? 0,
            timestamp: new Date().toISOString(),
        })
    } catch (err) {
        return NextResponse.json(
            {
                status: 'error',
                message: err instanceof Error ? err.message : 'Error desconocido',
            },
            { status: 500 }
        )
    }
}
