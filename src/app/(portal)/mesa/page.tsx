// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/app/(portal)/mesa/page.tsx
// Server Component: la mesa. Lista de dossiers guardados.
//
// La ruta es /mesa y no /estudio, para no confundirse con /estudios,
// que son las colecciones temáticas.
//
// La cookie del propietario la acuña /api/estudio/entrar: un Server
// Component no puede escribir cookies, y el proxy de Next 16 no llega a
// ejecutarse (ver el comentario de ese Route Handler). Aquí solo se lee;
// si falta, se redirige allí y se vuelve.
// =========================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, BookOpen, FolderOpen, Search } from 'lucide-react'

import { tokenDePropietario } from '@/lib/estudio/propietario'
import {
    listarDossiers,
    type EstadoDossier,
    type ResumenDossier,
} from '@/lib/services/estudio'
import { AccionesDossier } from '@/components/estudio/AccionesDossier'
import { LlaveRecuperacion } from '@/components/estudio/LlaveRecuperacion'
import { mesaHabilitada } from '@/lib/estudio/disponibilidad'
import { MesaNoDisponible } from '@/components/estudio/MesaNoDisponible'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Mesa de estudio | Legado Patrimonial, el Séptimo Sello',
    description:
        'Retoma tus búsquedas guardadas: los pasajes que conservaste, lo que ya leíste y tus notas.',
}

type Props = { searchParams: Promise<{ estado?: string; llave?: string }> }

type Filtro = EstadoDossier | 'todos'

function esFiltro(valor: string | undefined): valor is Filtro {
    return valor === 'activo' || valor === 'archivado' || valor === 'todos'
}

function fechaLegible(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

/**
 * CORRECCIÓN 3. La barra cuenta DECISIONES —conservados más descartados—,
 * no lecturas. Con la medida anterior, quien trabajaba cincuenta pasajes
 * con C y D sin pulsar L veía la barra casi en cero y el dossier parecía
 * sin empezar.
 *
 * La marca de leído conserva su sentido propio, «lo leí, aún no decido»,
 * y ni conservar ni descartar la tocan por dentro.
 *
 * EL RÓTULO DICE «CLASIFICADOS», fijado por el Administrador el 2026-09-22.
 * Es la palabra formal del módulo para esta cuenta: se dice igual aquí y en
 * la cabecera del dossier, y no se cambia en un sitio sin cambiarlo en el
 * otro. Los demás contadores —leídos, conservados, descartados— conservan
 * cada uno su nombre.
 */
function BarraProgreso({
    conservados,
    descartados,
    total,
}: {
    conservados: number
    descartados: number
    total: number
}) {
    const clasificados = conservados + descartados
    const porcentaje = total > 0 ? Math.round((clasificados / total) * 100) : 0
    return (
        <div className="flex items-center gap-3">
            <div
                className="h-1.5 flex-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(255, 255, 255, 0.07)' }}
                role="progressbar"
                aria-valuenow={clasificados}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`${clasificados} de ${total} pasajes clasificados`}
            >
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${porcentaje}%`,
                        background:
                            'linear-gradient(90deg, var(--color-gold-dark), var(--color-gold))',
                    }}
                />
            </div>
            <span
                className="text-xs tabular-nums whitespace-nowrap"
                style={{ color: 'var(--color-text-muted)' }}
            >
                {clasificados} de {total} clasificados
            </span>
        </div>
    )
}

function TarjetaDossier({ dossier }: { dossier: ResumenDossier }) {
    return (
        <article
            className="p-5 rounded-2xl border transition-colors"
            style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                opacity: dossier.estado === 'archivado' ? 0.7 : 1,
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <Link
                    href={`/mesa/${dossier.dossier_id}`}
                    className="text-lg font-medium leading-snug hover:underline"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {dossier.nombre}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                    <span
                        className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-full"
                        style={{
                            color: 'var(--color-gold)',
                            background: 'rgba(212, 175, 55, 0.1)',
                        }}
                    >
                        {dossier.modo === 'semantica' ? 'semántica' : 'exacta'}
                    </span>
                    <AccionesDossier
                        dossierId={dossier.dossier_id}
                        nombre={dossier.nombre}
                        estado={dossier.estado}
                    />
                </div>
            </div>

            <p
                className="text-sm italic mb-4 line-clamp-2"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                «{dossier.consulta}»
            </p>

            <BarraProgreso
                conservados={dossier.conservados}
                descartados={dossier.descartados}
                total={dossier.total}
            />

            <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
            >
                <span>{dossier.total} pasajes</span>
                <span>{dossier.leidos} leídos</span>
                <span style={{ color: 'var(--color-gold)' }}>
                    {dossier.conservados} conservados
                </span>
                <span>{dossier.descartados} descartados</span>
                <span className="ml-auto">{fechaLegible(dossier.actualizado_at)}</span>
            </div>
        </article>
    )
}

export default async function MesaPage({ searchParams }: Props) {
    if (!mesaHabilitada) return <MesaNoDisponible />

    const { estado, llave } = await searchParams
    const filtro: Filtro = esFiltro(estado) ? estado : 'activo'

    const token = await tokenDePropietario()

    // Sin cookie todavía: se pasa por el Route Handler, que sí puede
    // escribirla, y vuelve aquí. Una sola navegación, sin recargar.
    if (!token) redirect('/api/estudio/entrar?destino=/mesa')

    let dossiers: ResumenDossier[] = []
    let fallo: string | null = null

    try {
        dossiers = await listarDossiers(token, filtro)
    } catch (error) {
        // ALTA PEREZOSA. Antes esta página daba de alta al propietario en cada
        // visita, y eso creaba una mesa vacía por cada persona que se limitara
        // a asomarse —incluida la que pegaba una llave revocada, que se
        // encontraba con una mesa nueva y creía haber perdido su trabajo—.
        //
        // Ahora el alta la hace únicamente el guardado, que es cuando hay algo
        // que guardar. Una llave sin registrar no es un error: es una mesa que
        // todavía no existe, y se pinta vacía.
        const mensaje = error instanceof Error ? error.message : ''
        if (mensaje.includes('token no reconocido')) {
            dossiers = []
        } else {
            fallo = mensaje || 'La estación de estudio no respondió.'
            console.error('[MesaPage]', error)
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="mb-8">
                <h1
                    className="text-3xl font-light mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    Mesa de estudio
                </h1>
                <p
                    className="text-sm leading-relaxed max-w-2xl"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    Aquí vuelven tus búsquedas guardadas: lo que ya leíste, lo que
                    conservaste y por qué lo conservaste.
                </p>
            </header>

            {llave === 'desconocida' && (
                <div
                    role="alert"
                    className="mb-6 p-4 rounded-2xl border"
                    style={{ background: 'rgba(201, 106, 90, 0.08)', borderColor: '#c96a5a' }}
                >
                    <strong className="block text-sm mb-1" style={{ color: '#e08b7c' }}>
                        Esa llave no corresponde a ninguna mesa
                    </strong>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        Puede estar mal copiada, o ser una llave que se cambió por otra.
                        No se ha creado ninguna mesa nueva. Comprueba la llave y vuelve a
                        intentarlo.
                    </p>
                </div>
            )}

            <nav className="flex items-center gap-2 mb-6 text-sm">
                {(
                    [
                        ['activo', 'Activos', BookOpen],
                        ['archivado', 'Archivados', Archive],
                        ['todos', 'Todos', FolderOpen],
                    ] as const
                ).map(([valor, etiqueta, Icono]) => (
                    <Link
                        key={valor}
                        href={`/mesa?estado=${valor}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                        style={
                            filtro === valor
                                ? {
                                      background: 'rgba(212, 175, 55, 0.14)',
                                      color: 'var(--color-gold)',
                                  }
                                : { color: 'var(--color-text-muted)' }
                        }
                    >
                        <Icono size={14} />
                        {etiqueta}
                    </Link>
                ))}
            </nav>

            {fallo ? (
                <div
                    role="alert"
                    className="rounded-2xl border p-8 text-center"
                    style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(212, 175, 55, 0.22)',
                    }}
                >
                    <h2
                        className="text-lg mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        La estación no está disponible
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {fallo}
                    </p>
                </div>
            ) : dossiers.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border"
                    style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                >
                    <div
                        className="w-16 h-16 mb-4 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(212, 175, 55, 0.1)' }}
                    >
                        <FolderOpen size={24} style={{ color: 'var(--color-gold)' }} />
                    </div>
                    <h2
                        className="text-xl font-medium mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {filtro === 'archivado'
                            ? 'No tienes dossiers archivados'
                            : 'Tu mesa está vacía'}
                    </h2>
                    <p
                        className="max-w-md text-sm leading-relaxed mb-6"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {filtro === 'archivado'
                            ? 'Los dossiers que archives aparecerán aquí, sin borrarse.'
                            : 'Busca en el archivo y guarda la búsqueda: sus resultados quedarán aquí para retomarlos mañana.'}
                    </p>
                    {filtro !== 'archivado' && (
                        <Link
                            href="/archivo/busqueda"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition-colors"
                            style={{
                                background: 'rgba(212, 175, 55, 0.12)',
                                color: 'var(--color-gold)',
                            }}
                        >
                            <Search size={15} />
                            Ir a la búsqueda
                        </Link>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {dossiers.map((dossier) => (
                        <TarjetaDossier key={dossier.dossier_id} dossier={dossier} />
                    ))}
                </div>
            )}

            {!fallo && <LlaveRecuperacion token={token} />}
        </div>
    )
}
