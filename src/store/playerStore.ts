import { create } from 'zustand'
import type { ConferenciaConMultimedia } from '@/types'

/**
 * Store global del reproductor multimedia persistente.
 * Usa Zustand para mantener el estado del reproductor
 * a través de la navegación entre rutas de Next.js
 * sin interrumpir la reproducción.
 */

interface PlayerState {
    // Estado
    conferencia_activa: ConferenciaConMultimedia | null
    esta_reproduciendo: boolean
    tiempo_actual: number
    duracion: number
    volumen: number

    // Acciones
    cargarConferencia: (conferencia: ConferenciaConMultimedia) => void
    play: () => void
    pause: () => void
    toggle: () => void
    setTiempoActual: (tiempo: number) => void
    setDuracion: (duracion: number) => void
    setVolumen: (volumen: number) => void
    detener: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
    // Estado inicial
    conferencia_activa: null,
    esta_reproduciendo: false,
    tiempo_actual: 0,
    duracion: 0,
    volumen: 0.8,

    // Acciones
    cargarConferencia: (conferencia) =>
        set({
            conferencia_activa: conferencia,
            esta_reproduciendo: false,
            tiempo_actual: 0,
            duracion: 0,
        }),

    play: () => set({ esta_reproduciendo: true }),
    pause: () => set({ esta_reproduciendo: false }),
    toggle: () => set((state) => ({ esta_reproduciendo: !state.esta_reproduciendo })),

    setTiempoActual: (tiempo) => set({ tiempo_actual: tiempo }),
    setDuracion: (duracion) => set({ duracion }),
    setVolumen: (volumen) => set({ volumen: Math.max(0, Math.min(1, volumen)) }),

    detener: () =>
        set({
            conferencia_activa: null,
            esta_reproduciendo: false,
            tiempo_actual: 0,
            duracion: 0,
        }),
}))
