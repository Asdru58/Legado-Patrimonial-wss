/**
 * Tipos TypeScript generados a partir del esquema SQL de Supabase
 * Proyecto: Legado Patrimonial WSS
 */

// ============================================
// Entidades de Base de Datos
// ============================================

export interface Conferencia {
    id: string
    titulo: string
    fecha_impartida: string // ISO date string (YYYY-MM-DD)
    lugar: string | null
    created_at: string
}

export interface Multimedia {
    id: string
    conferencia_id: string
    audio_url: string
    video_url: string | null
    pdf_url: string
}

export interface TranscripcionFragmento {
    id: string
    conferencia_id: string
    texto: string
    timestamp_start: number
    timestamp_end: number
    orden_secuencia: number
    embedding?: number[] // VECTOR(1536) — solo para queries internas
}

export interface GrafoTematico {
    id: string
    fragmento_id: string
    entidad: string
    created_at: string
}

// ============================================
// Tipos compuestos para la UI
// ============================================

/** Conferencia con su multimedia vinculada */
export interface ConferenciaConMultimedia extends Conferencia {
    multimedia: Multimedia | null
}

/** Conferencia completa con transcripción y multimedia */
export interface ConferenciaCompleta extends Conferencia {
    multimedia: Multimedia | null
    fragmentos: TranscripcionFragmento[]
}

/** Resultado de búsqueda semántica */
export interface ResultadoBusqueda {
    fragmento: TranscripcionFragmento
    conferencia: Conferencia
    similitud: number
}

// ============================================
// Estado del Reproductor
// ============================================

export interface EstadoReproductor {
    conferencia_activa: ConferenciaConMultimedia | null
    esta_reproduciendo: boolean
    tiempo_actual: number
    duracion: number
    volumen: number
}
