// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/components/estudio/EstadoPasaje.tsx
// Presentación de los CUATRO estados de un pasaje guardado.
//
// Se distinguen TIPOGRÁFICAMENTE, no solo por color: en la paleta del
// portal el fondo es casi negro y no hay token monoespaciado, así que
// cada estado lleva su rótulo, su borde y su tratamiento de texto.
//
//   vigente     sin rótulo, borde limpio, texto normal
//   cambiado    rótulo, borde ámbar sólido a la izquierda, texto normal
//   no_vigente  rótulo, borde discontinuo a la izquierda, texto en cursiva
//   ausente     rótulo, borde discontinuo completo, sin texto que mostrar
//
// El `switch` no deja hueco: un valor imprevisto cae en el caso por
// defecto y se ve como aviso, nunca como blanco.
// =========================================================

import type { EstadoPasaje } from '@/lib/services/estudio'

type Presentacion = {
    rotulo: string | null
    explicacion: string | null
    /** Estilo del contenedor de la cita. */
    caja: React.CSSProperties
    /** Estilo del texto de la cita. */
    texto: React.CSSProperties
    tono: string
}

const AMBAR = '#d9a441'
const GRIS = '#8a8a9e'
const ROJO = '#c96a5a'

export function presentacionDe(estado: EstadoPasaje | string): Presentacion {
    switch (estado) {
        case 'vigente':
            return {
                rotulo: null,
                explicacion: null,
                caja: { borderLeft: '2px solid rgba(212, 175, 55, 0.25)' },
                texto: { color: 'var(--color-text-primary)' },
                tono: 'var(--color-gold)',
            }

        case 'cambiado':
            return {
                rotulo: 'Texto modificado',
                explicacion:
                    'El pasaje sigue en el corpus, pero su texto ya no es el que guardaste.',
                caja: { borderLeft: `3px solid ${AMBAR}` },
                texto: { color: 'var(--color-text-primary)' },
                tono: AMBAR,
            }

        case 'no_vigente':
            return {
                rotulo: 'Versión reemplazada',
                explicacion:
                    'La transcripción de la que salió este pasaje dejó de ser la vigente. Lo que lees no es la versión en curso del documento.',
                caja: { borderLeft: `3px dashed ${GRIS}` },
                texto: { color: 'var(--color-text-secondary)', fontStyle: 'italic' },
                tono: GRIS,
            }

        case 'ausente':
            return {
                rotulo: 'Pasaje retirado',
                explicacion:
                    'Este pasaje ya no está en el corpus. Lo que se muestra es la cita de resguardo que se guardó al conservarlo: una copia corta, no el texto completo. Tu nota se conserva intacta.',
                caja: {
                    border: `1px dashed ${ROJO}`,
                    borderLeft: `3px solid ${ROJO}`,
                    opacity: 0.85,
                },
                texto: { color: 'var(--color-text-muted)', fontStyle: 'italic' },
                tono: ROJO,
            }

        // Sin hueco: si la función llegara a emitir un valor nuevo, se ve.
        default:
            return {
                rotulo: `Estado desconocido: ${String(estado)}`,
                explicacion:
                    'La base devolvió un estado que esta pantalla no conoce. Conviene revisarlo.',
                caja: { border: `1px dashed ${ROJO}` },
                texto: { color: 'var(--color-text-muted)' },
                tono: ROJO,
            }
    }
}

export function RotuloEstado({ estado }: { estado: EstadoPasaje | string }) {
    const p = presentacionDe(estado)
    if (!p.rotulo) return null

    return (
        <span
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded"
            style={{
                color: p.tono,
                border: `1px solid ${p.tono}`,
                background: 'transparent',
            }}
        >
            {p.rotulo}
        </span>
    )
}

export function ExplicacionEstado({ estado }: { estado: EstadoPasaje | string }) {
    const p = presentacionDe(estado)
    if (!p.explicacion) return null

    return (
        <p
            className="mt-2 text-xs leading-relaxed"
            style={{ color: p.tono }}
        >
            {p.explicacion}
        </p>
    )
}
