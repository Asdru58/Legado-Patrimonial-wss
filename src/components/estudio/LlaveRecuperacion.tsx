'use client'

// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/components/estudio/LlaveRecuperacion.tsx
// La llave de recuperación: verla, copiarla y cambiarla.
//
// A DEMANDA, CUANTAS VECES HAGA FALTA
// Decisión del Administrador, 2026-09-19 y ratificada el 21: mostrarla una
// única vez es un riesgo operativo. Si la página se recarga por error o no
// da tiempo a copiarla, se pierde la identidad para siempre. Ninguna
// columna controla cuántas veces se ha visto.
//
// La cookie es HttpOnly: el JavaScript de esta página NO puede leerla. El
// token llega como prop desde el Server Component, que sí lo tiene.
//
// LA VENTANA DE LA ROTACIÓN — corrección 5
// Entre que la base acepta la llave nueva y que el navegador tiene la
// cookie repuesta hay un hueco. Si la reposición falla, esa persona queda
// fuera de su propia mesa y no puede ver la llave nueva, porque este panel
// solo se abre desde dentro. Sería el peor fallo del módulo: perder el
// trabajo por intentar protegerlo.
//
// Por eso la acción devuelve SIEMPRE la llave nueva, junto con si la cookie
// se pudo reponer. Aquí se muestra en la misma respuesta, destacada, y NO
// se esconde aunque la reposición haya fallado: se puede copiar y entrar a
// mano por la pantalla de recuperación.
// =========================================================

import { useState, useTransition } from 'react'
import {
    Check,
    Copy,
    KeyRound,
    RefreshCw,
    ShieldAlert,
    TriangleAlert,
} from 'lucide-react'

import { accionRotarLlave } from '@/lib/estudio/acciones'

type Rotada = { llaveNueva: string; cookieRepuesta: boolean; cuando: string }

function BotonCopiar({ valor, etiqueta }: { valor: string; etiqueta: string }) {
    const [copiado, setCopiado] = useState(false)
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(valor)
                    setCopiado(true)
                    setTimeout(() => setCopiado(false), 2500)
                } catch {
                    // Sin portapapeles: la llave está a la vista y se selecciona
                    // a mano. No se avisa de nada.
                }
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--color-gold)' }}
            aria-label={etiqueta}
        >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
            {copiado ? 'Copiada' : 'Copiar'}
        </button>
    )
}

function Llave({ valor }: { valor: string }) {
    return (
        <code
            className="flex-1 p-3 rounded-lg text-xs break-all select-all leading-relaxed"
            style={{ background: 'rgba(0, 0, 0, 0.35)', color: 'var(--color-gold-light)' }}
        >
            {valor}
        </code>
    )
}

export function LlaveRecuperacion({ token }: { token: string }) {
    const [confirmando, setConfirmando] = useState(false)
    const [rotada, setRotada] = useState<Rotada | null>(null)
    const [fallo, setFallo] = useState<string | null>(null)
    const [pendiente, empezar] = useTransition()

    function rotar() {
        setFallo(null)
        empezar(async () => {
            const r = await accionRotarLlave()
            if (r.ok) {
                setRotada(r.valor)
                setConfirmando(false)
            } else {
                setFallo(r.error)
                setConfirmando(false)
            }
        })
    }

    // ---- después de rotar: la llave nueva manda sobre todo lo demás ----
    if (rotada) {
        return (
            <section
                className="mt-10 rounded-2xl border p-5"
                style={{
                    background: 'rgba(212, 175, 55, 0.06)',
                    borderColor: 'var(--color-gold)',
                }}
            >
                <h2
                    className="flex items-center gap-2 text-base font-medium mb-3"
                    style={{ color: 'var(--color-gold)' }}
                >
                    <KeyRound size={18} />
                    Esta es tu llave nueva. Cópiala ahora.
                </h2>

                {!rotada.cookieRepuesta && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-3 mb-3 rounded-lg"
                        style={{ background: 'rgba(201, 106, 90, 0.12)' }}
                    >
                        <TriangleAlert size={16} style={{ color: '#c96a5a' }} className="mt-0.5" />
                        <p className="text-sm leading-relaxed" style={{ color: '#e08b7c' }}>
                            La llave cambió en el servidor, pero este navegador no pudo
                            guardarla. <strong>Cópiala antes de cerrar esta página</strong> y
                            entra con ella desde la mesa. Si cierras sin copiarla, perderás
                            el acceso a tus dossiers.
                        </p>
                    </div>
                )}

                <div className="flex items-start gap-2">
                    <Llave valor={rotada.llaveNueva} />
                    <BotonCopiar valor={rotada.llaveNueva} etiqueta="Copiar la llave nueva" />
                </div>

                <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    La llave anterior dejó de servir en el acto. Si usabas la mesa en otro
                    equipo, tendrás que volver a entrar allí con esta.
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Quien tenga esta llave entra en tu mesa como si fuera tú. No la
                    compartas.
                </p>
            </section>
        )
    }

    // ---- panel normal, plegado ----
    return (
        <details
            className="mt-10 rounded-2xl border p-5"
            style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'var(--color-border)',
            }}
        >
            <summary
                className="flex items-center gap-2 cursor-pointer text-sm select-none"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                <KeyRound size={15} style={{ color: 'var(--color-gold)' }} />
                Llave de recuperación
            </summary>

            <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                Tu mesa vive en este navegador. Si lo limpias, pierdes el acceso a tus
                dossiers. Guarda esta llave en lugar seguro: pegándola en otro equipo
                recuperas tu mesa tal cual.
            </p>

            <div className="mt-3 flex items-start gap-2">
                <Llave valor={token} />
                <BotonCopiar valor={token} etiqueta="Copiar la llave de recuperación" />
            </div>

            <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Quien tenga esta llave entra en tu mesa como si fuera tú. No la
                compartas.
            </p>

            {/* ---- cambiar la llave ---- */}
            <div
                className="mt-5 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
            >
                {fallo && (
                    <p role="alert" className="text-sm mb-3" style={{ color: '#e08b7c' }}>
                        {fallo}
                    </p>
                )}

                {!confirmando ? (
                    <button
                        type="button"
                        onClick={() => setConfirmando(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--color-text-secondary)',
                        }}
                    >
                        <RefreshCw size={14} />
                        Cambiar la llave
                    </button>
                ) : (
                    <div
                        className="flex flex-col gap-3 p-4 rounded-xl"
                        style={{ background: 'rgba(201, 106, 90, 0.08)' }}
                    >
                        <div className="flex items-start gap-2">
                            <ShieldAlert
                                size={18}
                                style={{ color: '#c96a5a' }}
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <strong className="block text-sm mb-1" style={{ color: '#e08b7c' }}>
                                    ¿Cambiar la llave?
                                </strong>
                                <p
                                    className="text-sm leading-relaxed"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    La llave actual dejará de servir de inmediato. Tus
                                    dossiers, notas y decisiones no se tocan.
                                    <strong> Si usas la mesa en otro equipo, tendrás que
                                    volver a entrar allí con la llave nueva.</strong>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={rotar}
                                disabled={pendiente}
                                className="px-4 py-2 rounded-full text-sm"
                                style={{ background: 'rgba(201, 106, 90, 0.25)', color: '#e08b7c' }}
                            >
                                {pendiente ? 'Cambiando…' : 'Sí, cambiar la llave'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmando(false)}
                                className="px-3 py-2 rounded-full text-sm"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </details>
    )
}
