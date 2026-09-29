'use client'

// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/components/estudio/ListaPasajes.tsx
// Las tarjetas de un dossier, con sus atajos de teclado.
//
// ATAJOS
//   C conservar · D descartar · L leído · J/K y flechas mover · Z deshacer
//
// OBLIGATORIO: el manejador ignora TODOS los atajos cuando el foco está
// en un input, un textarea o un contenteditable. Sin ese filtro,
// escribir «cuando» dentro de una nota descartaría el pasaje al teclear
// la `d`. Es un fallo que aparece el primer día de uso.
//
// SOBRE Z: `seleccion_anterior` guarda UN estado, no una pila. Z deshace
// la última decisión y nada más. Tras deshacer se olvida cuál era, de
// modo que una segunda Z seguida no hace nada en vez de inventarse algo.
// =========================================================

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookmarkCheck, Check, Eye, Trash2, Undo2 } from 'lucide-react'

import {
    accionAnotar,
    accionDecidir,
    accionDeshacer,
    accionMarcarLeido,
} from '@/lib/estudio/acciones'
import type { ItemDossier, Seleccion } from '@/lib/services/estudio'
import {
    ExplicacionEstado,
    presentacionDe,
    RotuloEstado,
} from '@/components/estudio/EstadoPasaje'

type Cambio =
    | { tipo: 'seleccion'; itemId: string; valor: Seleccion }
    | { tipo: 'leido'; itemId: string; valor: boolean }
    | { tipo: 'nota'; itemId: string; valor: string | null }

function reducir(estado: ItemDossier[], cambio: Cambio): ItemDossier[] {
    return estado.map((i) => {
        if (i.item_id !== cambio.itemId) return i
        if (cambio.tipo === 'seleccion') return { ...i, seleccion: cambio.valor }
        if (cambio.tipo === 'leido') return { ...i, leido: cambio.valor }
        return { ...i, nota: cambio.valor }
    })
}

/** ¿El foco está donde se escribe? Entonces los atajos no existen. */
function escribiendo(): boolean {
    const activo = document.activeElement as HTMLElement | null
    if (!activo) return false
    const etiqueta = activo.tagName
    return (
        etiqueta === 'INPUT' ||
        etiqueta === 'TEXTAREA' ||
        etiqueta === 'SELECT' ||
        activo.isContentEditable
    )
}

export function ListaPasajes({
    dossierId,
    items,
}: {
    dossierId: string
    items: ItemDossier[]
}) {
    const router = useRouter()
    const [optimistas, aplicar] = useOptimistic(items, reducir)
    const [, empezar] = useTransition()
    const [cursor, setCursor] = useState(0)
    const [ultimoDecidido, setUltimoDecidido] = useState<string | null>(null)
    const refs = useRef<Array<HTMLElement | null>>([])

    const decidir = useCallback(
        (itemId: string, valor: Seleccion) => {
            empezar(async () => {
                aplicar({ tipo: 'seleccion', itemId, valor })
                const r = await accionDecidir(dossierId, itemId, valor)
                if (r.ok) {
                    setUltimoDecidido(itemId)
                    router.refresh()
                }
            })
        },
        [aplicar, dossierId, router]
    )

    const alternarLeido = useCallback(
        (itemId: string, actual: boolean) => {
            empezar(async () => {
                aplicar({ tipo: 'leido', itemId, valor: !actual })
                const r = await accionMarcarLeido(dossierId, itemId, !actual)
                if (r.ok) router.refresh()
            })
        },
        [aplicar, dossierId, router]
    )

    const deshacer = useCallback(() => {
        if (!ultimoDecidido) return // segunda Z seguida: no se inventa nada
        const itemId = ultimoDecidido
        setUltimoDecidido(null)
        empezar(async () => {
            const r = await accionDeshacer(dossierId, itemId)
            if (r.ok) {
                aplicar({
                    tipo: 'seleccion',
                    itemId,
                    valor: r.valor ?? 'pendiente',
                })
                router.refresh()
            }
        })
    }, [aplicar, dossierId, router, ultimoDecidido])

    // ---- atajos -----------------------------------------------------------
    useEffect(() => {
        function alPulsar(evento: KeyboardEvent) {
            if (escribiendo()) return
            if (evento.ctrlKey || evento.metaKey || evento.altKey) return
            if (optimistas.length === 0) return

            const actual = optimistas[Math.min(cursor, optimistas.length - 1)]
            if (!actual) return

            const tecla = evento.key.toLowerCase()
            switch (tecla) {
                case 'j':
                case 'arrowdown':
                    evento.preventDefault()
                    setCursor((c) => Math.min(c + 1, optimistas.length - 1))
                    break
                case 'k':
                case 'arrowup':
                    evento.preventDefault()
                    setCursor((c) => Math.max(c - 1, 0))
                    break
                case 'c':
                    evento.preventDefault()
                    decidir(actual.item_id, 'conservado')
                    break
                case 'd':
                    evento.preventDefault()
                    decidir(actual.item_id, 'descartado')
                    break
                case 'l':
                    evento.preventDefault()
                    alternarLeido(actual.item_id, actual.leido)
                    break
                case 'z':
                    evento.preventDefault()
                    deshacer()
                    break
                default:
                    break
            }
        }

        window.addEventListener('keydown', alPulsar)
        return () => window.removeEventListener('keydown', alPulsar)
    }, [alternarLeido, cursor, decidir, deshacer, optimistas])

    // Llevar la tarjeta enfocada a la vista al moverse con el teclado.
    useEffect(() => {
        refs.current[cursor]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [cursor])

    if (optimistas.length === 0) {
        return (
            <p
                className="py-16 text-center text-sm"
                style={{ color: 'var(--color-text-muted)' }}
            >
                No hay pasajes en esta vista.
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-5">
            {optimistas.map((item, indice) => (
                <TarjetaPasaje
                    key={item.item_id}
                    ref={(el) => {
                        refs.current[indice] = el
                    }}
                    item={item}
                    enfocada={indice === cursor}
                    dossierId={dossierId}
                    onEnfocar={() => setCursor(indice)}
                    onDecidir={decidir}
                    onAlternarLeido={alternarLeido}
                    onAnotar={(itemId, nota) =>
                        empezar(async () => {
                            aplicar({ tipo: 'nota', itemId, valor: nota || null })
                            await accionAnotar(dossierId, itemId, nota)
                            router.refresh()
                        })
                    }
                />
            ))}
        </div>
    )
}

// ============================================
// Tarjeta
// ============================================

type PropsTarjeta = {
    item: ItemDossier
    enfocada: boolean
    dossierId: string
    onEnfocar: () => void
    onDecidir: (itemId: string, valor: Seleccion) => void
    onAlternarLeido: (itemId: string, actual: boolean) => void
    onAnotar: (itemId: string, nota: string) => void
    ref?: React.Ref<HTMLElement>
}

function TarjetaPasaje({
    item,
    enfocada,
    onEnfocar,
    onDecidir,
    onAlternarLeido,
    onAnotar,
    ref,
}: PropsTarjeta) {
    const p = presentacionDe(item.estado_pasaje)
    const [nota, setNota] = useState(item.nota ?? '')

    const atenuada = item.seleccion === 'descartado'

    return (
        <article
            ref={ref}
            onClick={onEnfocar}
            className="rounded-2xl border p-5 transition-all"
            style={{
                background: enfocada
                    ? 'rgba(212, 175, 55, 0.05)'
                    : 'var(--color-bg-card)',
                borderColor: enfocada
                    ? 'var(--color-border-hover)'
                    : 'var(--color-border)',
                opacity: atenuada ? 0.55 : 1,
            }}
        >
            {/* cabecera */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                    className="text-xs tabular-nums"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    #{item.posicion}
                </span>
                {item.slug ? (
                    <Link
                        href={`/conferencia/${item.slug}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {item.titulo ?? 'Sin título'}
                    </Link>
                ) : (
                    <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {item.titulo ?? 'Sin título'}
                    </span>
                )}
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {item.fecha ?? '—'} · págs. {item.pagina_inicio}
                    {item.pagina_fin !== item.pagina_inicio && `-${item.pagina_fin}`}
                </span>
                <span className="ml-auto flex items-center gap-2">
                    <RotuloEstado estado={item.estado_pasaje} />
                    {item.leido && (
                        <span
                            className="text-[10px] uppercase tracking-wide"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            leído
                        </span>
                    )}
                </span>
            </div>

            {/* cita */}
            {item.texto ? (
                <blockquote className="pl-4 py-1" style={p.caja}>
                    <p className="text-sm leading-relaxed" style={p.texto}>
                        {item.texto}
                    </p>
                </blockquote>
            ) : item.cita_resguardo ? (
                /* CORRECCIÓN 2. El pasaje ya no está en el corpus, pero la copia
                   corta que se guardó al conservarlo sí. Se distingue del texto
                   normal por tres cosas a la vez, no solo por color: un rótulo
                   propio encima, comillas latinas, y un remate de puntos
                   suspensivos que recuerda que está cortada. */
                <div className="px-4 py-3 rounded-lg" style={p.caja}>
                    <p
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        Cita de resguardo · copia de seguridad, no el corpus
                    </p>
                    <p className="text-sm leading-relaxed" style={p.texto}>
                        «{item.cita_resguardo.trimEnd()}…»
                    </p>
                </div>
            ) : (
                <div className="px-4 py-3 rounded-lg" style={p.caja}>
                    <p className="text-sm" style={p.texto}>
                        Sin texto disponible en el corpus, y sin cita de resguardo.
                    </p>
                </div>
            )}

            <ExplicacionEstado estado={item.estado_pasaje} />

            {/* nota */}
            {item.seleccion === 'conservado' && (
                <div className="mt-4">
                    <label
                        className="block text-xs mb-1.5"
                        style={{ color: 'var(--color-text-muted)' }}
                        htmlFor={`nota-${item.item_id}`}
                    >
                        Por qué lo guardas
                    </label>
                    <textarea
                        id={`nota-${item.item_id}`}
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        onBlur={() => {
                            if ((item.nota ?? '') !== nota) onAnotar(item.item_id, nota)
                        }}
                        rows={2}
                        placeholder="Escribe aquí. Los atajos quedan desactivados mientras escribes."
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
                        style={{
                            background: 'rgba(0,0,0,0.3)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                        }}
                    />
                </div>
            )}

            {/* acciones */}
            <div className="flex items-center gap-2 mt-4">
                <Boton
                    activo={item.seleccion === 'conservado'}
                    onClick={() =>
                        onDecidir(
                            item.item_id,
                            item.seleccion === 'conservado' ? 'pendiente' : 'conservado'
                        )
                    }
                    icono={<BookmarkCheck size={14} />}
                    tecla="C"
                >
                    Conservar
                </Boton>
                <Boton
                    activo={item.seleccion === 'descartado'}
                    onClick={() =>
                        onDecidir(
                            item.item_id,
                            item.seleccion === 'descartado' ? 'pendiente' : 'descartado'
                        )
                    }
                    icono={<Trash2 size={14} />}
                    tecla="D"
                >
                    Descartar
                </Boton>
                <Boton
                    activo={item.leido}
                    onClick={() => onAlternarLeido(item.item_id, item.leido)}
                    icono={item.leido ? <Check size={14} /> : <Eye size={14} />}
                    tecla="L"
                >
                    {item.leido ? 'Leído' : 'Marcar leído'}
                </Boton>
            </div>
        </article>
    )
}

function Boton({
    activo,
    onClick,
    icono,
    tecla,
    children,
}: {
    activo: boolean
    onClick: () => void
    icono: React.ReactNode
    tecla: string
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors"
            style={
                activo
                    ? { background: 'rgba(212, 175, 55, 0.16)', color: 'var(--color-gold)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)' }
            }
        >
            {icono}
            {children}
            <kbd
                className="ml-1 text-[10px] opacity-60"
                style={{ fontFamily: 'inherit' }}
            >
                {tecla}
            </kbd>
        </button>
    )
}

export function PistaDeAtajos() {
    return (
        <p
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-5"
            style={{ color: 'var(--color-text-muted)' }}
        >
            <span className="inline-flex items-center gap-1">
                <Undo2 size={12} /> Z deshace la última decisión
            </span>
            <span>C conservar</span>
            <span>D descartar</span>
            <span>L leído</span>
            <span>J/K o flechas para moverte</span>
            <span className="italic">
                Los atajos se apagan mientras escribes una nota.
            </span>
        </p>
    )
}
