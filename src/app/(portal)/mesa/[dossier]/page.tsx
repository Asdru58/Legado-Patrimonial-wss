// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/app/(portal)/mesa/[dossier]/page.tsx
// Server Component: un dossier abierto, con su filtro de vista.
// =========================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'

import { tokenDePropietario } from '@/lib/estudio/propietario'
import {
    abrirDossier,
    listarDossiers,
    type FiltroVista,
    type ItemDossier,
} from '@/lib/services/estudio'
import { AccionesDossier } from '@/components/estudio/AccionesDossier'
import { ListaPasajes, PistaDeAtajos } from '@/components/estudio/ListaPasajes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Dossier | Mesa de estudio',
}

const FILTROS: Array<{ valor: FiltroVista; etiqueta: string }> = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'conservados', etiqueta: 'Conservados' },
    { valor: 'pendientes', etiqueta: 'Pendientes' },
    { valor: 'descartados', etiqueta: 'Descartados' },
]

function esFiltro(valor: string | undefined): valor is FiltroVista {
    return FILTROS.some((f) => f.valor === valor)
}

type Props = {
    params: Promise<{ dossier: string }>
    searchParams: Promise<{ vista?: string }>
}

export default async function DossierPage({ params, searchParams }: Props) {
    const { dossier: dossierId } = await params
    const { vista } = await searchParams
    const filtro: FiltroVista = esFiltro(vista) ? vista : 'todos'

    const token = await tokenDePropietario()
    if (!token) redirect(`/api/estudio/entrar?destino=/mesa/${dossierId}`)

    let items: ItemDossier[] = []
    let resumen = null
    let fallo: string | null = null

    try {
        // El resumen sale del listado: trae los contadores ya calculados y
        // confirma de paso que el dossier es de quien lo pide.
        const todos = await listarDossiers(token, 'todos')
        resumen = todos.find((d) => d.dossier_id === dossierId) ?? null
        if (!resumen) notFound()
        items = await abrirDossier(token, dossierId, filtro)
    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_NOT_FOUND') throw error
        fallo =
            error instanceof Error
                ? error.message
                : 'La estación de estudio no respondió.'
        console.error('[DossierPage]', error)
    }

    if (fallo || !resumen) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link
                    href="/mesa"
                    className="inline-flex items-center gap-1.5 text-sm mb-6"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    <ArrowLeft size={14} /> Volver a la mesa
                </Link>
                <div
                    role="alert"
                    className="rounded-2xl border p-8 text-center"
                    style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(212, 175, 55, 0.22)',
                    }}
                >
                    <h1
                        className="text-xl mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        No se pudo abrir el dossier
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {fallo}
                    </p>
                </div>
            </div>
        )
    }

    // CORRECCIÓN 3: el avance se mide en decisiones, no en lecturas.
    // La marca de leído se muestra aparte, con su sentido propio.
    //
    // «Clasificados» es la palabra fijada por el Administrador el 2026-09-22,
    // la misma que usa la barra de /mesa. Si cambia, cambia en los dos sitios.
    const clasificados = resumen.conservados + resumen.descartados
    const progreso =
        resumen.total > 0 ? Math.round((clasificados / resumen.total) * 100) : 0

    return (
        <div className="max-w-3xl mx-auto px-6 py-12">
            <Link
                href="/mesa"
                className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--color-gold)]"
                style={{ color: 'var(--color-text-muted)' }}
            >
                <ArrowLeft size={14} /> Volver a la mesa
            </Link>

            <header className="mb-8">
                <div className="flex items-start justify-between gap-4 mb-2">
                    <h1
                        className="text-2xl font-light"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {resumen.nombre}
                    </h1>
                    <AccionesDossier
                        dossierId={resumen.dossier_id}
                        nombre={resumen.nombre}
                        estado={resumen.estado}
                    />
                </div>

                <p
                    className="text-sm italic mb-4"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    «{resumen.consulta}»
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {clasificados} de {resumen.total} clasificados ({progreso}%)
                    </span>
                    <span style={{ color: 'var(--color-gold)' }}>
                        {resumen.conservados} conservados
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                        {resumen.descartados} descartados
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                        {resumen.leidos} leídos
                    </span>
                    {resumen.estado === 'archivado' && (
                        <span
                            className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide"
                            style={{
                                color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            archivado
                        </span>
                    )}
                    {resumen.conservados > 0 && (
                        <a
                            href={`/api/estudio/exportar?dossier=${resumen.dossier_id}`}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                            style={{
                                background: 'rgba(212, 175, 55, 0.12)',
                                color: 'var(--color-gold)',
                            }}
                        >
                            <Download size={13} />
                            Exportar conservados
                        </a>
                    )}
                </div>
            </header>

            <nav className="flex flex-wrap items-center gap-2 mb-6 text-sm">
                {FILTROS.map((f) => (
                    <Link
                        key={f.valor}
                        href={`/mesa/${dossierId}?vista=${f.valor}`}
                        className="px-3 py-1.5 rounded-full transition-colors"
                        style={
                            filtro === f.valor
                                ? {
                                      background: 'rgba(212, 175, 55, 0.14)',
                                      color: 'var(--color-gold)',
                                  }
                                : { color: 'var(--color-text-muted)' }
                        }
                    >
                        {f.etiqueta}
                    </Link>
                ))}
            </nav>

            <PistaDeAtajos />

            <ListaPasajes dossierId={dossierId} items={items} />
        </div>
    )
}
