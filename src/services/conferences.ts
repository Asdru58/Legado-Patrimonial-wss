import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import type { ConferenciaConMultimedia, Multimedia } from '@/types';

// ============================================
// Tipos de respuesta del servicio
// ============================================

export interface PaginatedConferences {
    data: ConferenciaConMultimedia[];
    count: number | null;
    error: string | null;
}

// ============================================
// Helpers internos
// ============================================

/**
 * Normaliza la relación multimedia que Supabase devuelve
 * como array (por ser relación 1:N) al tipo esperado por la UI.
 */
function normalizeMultimedia(raw: unknown): Multimedia | null {
    if (Array.isArray(raw) && raw.length > 0) {
        return raw[0] as Multimedia;
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Multimedia;
    }
    return null;
}

// ============================================
// Funciones públicas
// ============================================

/**
 * Obtiene conferencias paginadas con su multimedia vinculada.
 * Usa el cliente de **navegador** (Client Components).
 *
 * @param page  - Página actual (1-indexed)
 * @param limit - Cantidad de resultados por página
 */
export async function getConferences(
    page: number = 1,
    limit: number = 12
): Promise<PaginatedConferences> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createBrowserClient();

    const { data, error, count } = await supabase
        .from('conferencias')
        .select(
            `
      id,
      titulo,
      fecha_impartida,
      lugar,
      created_at,
      multimedia (
        id,
        conferencia_id,
        audio_url,
        video_url,
        pdf_url
      )
    `,
            { count: 'exact' }
        )
        .order('fecha_impartida', { ascending: false })
        .range(from, to);

    if (error) {
        return { data: [], count: null, error: error.message };
    }

    const conferences: ConferenciaConMultimedia[] = (data ?? []).map((item) => ({
        id: item.id,
        titulo: item.titulo,
        fecha_impartida: item.fecha_impartida,
        lugar: item.lugar,
        created_at: item.created_at,
        multimedia: normalizeMultimedia(item.multimedia),
    }));

    return { data: conferences, count, error: null };
}

/**
 * Obtiene una conferencia por ID con su multimedia vinculada.
 * Usa el cliente de **servidor** (Server Components) para
 * habilitar SSR, SEO y metadata dinámica.
 *
 * @param id - UUID de la conferencia
 */
export async function getConferenceById(
    id: string
): Promise<ConferenciaConMultimedia | null> {
    const supabaseServer = await createServerSupabaseClient();

    const { data, error } = await supabaseServer
        .from('conferencias')
        .select(
            `
      id,
      titulo,
      fecha_impartida,
      lugar,
      created_at,
      multimedia (
        id,
        conferencia_id,
        audio_url,
        video_url,
        pdf_url
      )
    `
        )
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        id: data.id,
        titulo: data.titulo,
        fecha_impartida: data.fecha_impartida,
        lugar: data.lugar,
        created_at: data.created_at,
        multimedia: normalizeMultimedia(data.multimedia),
    };
}
