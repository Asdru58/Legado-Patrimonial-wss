'use client'

// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/components/estudio/GuardarBusqueda.tsx
// Botón «Guardar búsqueda en la Mesa» de la página de resultados.
//
// EL PAYLOAD LLEVA TRES CAMPOS POR ÍTEM: pasaje_id, posicion y similitud.
// Nada de textos por la red. `estudio_crear_dossier` toma el texto, el
// hash y la cita de resguardo de corpus_pasajes mediante JOIN; lo que se
// mandara de más se ignoraría, así que solo engordaría la petición.
// =========================================================

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { BookmarkPlus, Check, TriangleAlert, X } from 'lucide-react'

import { accionGuardarBusqueda } from '@/lib/estudio/acciones'
import type { ItemAGuardar, ModoBusqueda } from '@/lib/services/estudio'

type Props = {
    consulta: string
    modo: ModoBusqueda
    items: ItemAGuardar[]
    parametros?: Record<string, unknown>
}


/**
 * CORRECCIÓN 1, segunda parte. Antes un guardado fallido se anunciaba con
 * una línea roja pequeña que se perdía entre los resultados. Ahora ocupa su
 * propio recuadro, con icono, título y qué hacer.
 */
function AvisoDeFallo({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
    return (
        <div
            role="alert"
            className="flex flex-col gap-2 p-4 rounded-2xl border self-start w-full max-w-xl"
            style={{ background: 'rgba(201, 106, 90, 0.08)', borderColor: '#c96a5a' }}
        >
            <div className="flex items-center gap-2">
                <TriangleAlert size={16} style={{ color: '#c96a5a' }} />
                <strong className="text-sm" style={{ color: '#e08b7c' }}>
                    No se guardó la búsqueda
                </strong>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {mensaje}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Nada se ha perdido: los resultados siguen en pantalla. Puedes intentarlo
                otra vez, y si vuelve a fallar, recarga la página.
            </p>
            <button
                type="button"
                onClick={onReintentar}
                className="self-start mt-1 px-4 py-2 rounded-full text-sm"
                style={{ background: 'rgba(212, 175, 55, 0.14)', color: 'var(--color-gold)' }}
            >
                Intentarlo otra vez
            </button>
        </div>
    )
}

export function GuardarBusqueda({ consulta, modo, items, parametros }: Props) {
    const [abierto, setAbierto] = useState(false)
    const [nombre, setNombre] = useState('')
    const [creado, setCreado] = useState<string | null>(null)
    const [fallo, setFallo] = useState<string | null>(null)
    const [pendiente, empezar] = useTransition()

    if (items.length === 0) return null

    function guardar() {
        const limpio = nombre.trim() || consulta.slice(0, 60)
        setFallo(null)
        empezar(async () => {
            const r = await accionGuardarBusqueda({
                nombre: limpio,
                consulta,
                modo,
                parametros: parametros ?? {},
                items,
            })
            if (r.ok) {
                setCreado(r.valor)
                setAbierto(false)
            } else {
                setFallo(r.error)
            }
        })
    }

    if (fallo) {
        return <AvisoDeFallo mensaje={fallo} onReintentar={() => { setFallo(null); setAbierto(true) }} />
    }

    if (creado) {
        return (
            <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm"
                style={{
                    background: 'rgba(212, 175, 55, 0.12)',
                    color: 'var(--color-gold)',
                }}
            >
                <Check size={15} />
                Guardada en tu mesa
                <Link href={`/mesa/${creado}`} className="underline">
                    Abrir el dossier
                </Link>
            </div>
        )
    }

    if (!abierto) {
        return (
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => setAbierto(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-colors self-start"
                    style={{
                        background: 'rgba(212, 175, 55, 0.12)',
                        color: 'var(--color-gold)',
                    }}
                >
                    <BookmarkPlus size={15} />
                    Guardar búsqueda en la Mesa
                    <span className="opacity-70">({items.length})</span>
                </button>
            </div>
        )
    }

    return (
        <div
            className="flex flex-col gap-3 p-4 rounded-2xl border self-start w-full max-w-md"
            style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border-hover)',
            }}
        >
            <label
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
                htmlFor="nombre-dossier"
            >
                Nombre del dossier
            </label>
            <input
                id="nombre-dossier"
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') guardar()
                    if (e.key === 'Escape') setAbierto(false)
                }}
                placeholder={consulta.slice(0, 60)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                    background: 'rgba(0,0,0,0.35)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                }}
            />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Se guardarán los {items.length} resultados de esta página, con su
                puesto. El texto no viaja: se lee del corpus cada vez.
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={guardar}
                    disabled={pendiente}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
                    style={{
                        background: 'rgba(212, 175, 55, 0.16)',
                        color: 'var(--color-gold)',
                    }}
                >
                    <Check size={14} />
                    {pendiente ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    <X size={14} />
                    Cancelar
                </button>
            </div>
        </div>
    )
}
