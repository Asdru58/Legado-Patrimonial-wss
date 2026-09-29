'use client'

// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/components/estudio/AccionesDossier.tsx
// Renombrar y archivar un dossier, desde la tarjeta o desde su cabecera.
// =========================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Check, Pencil, X } from 'lucide-react'

import { accionArchivar, accionRenombrar } from '@/lib/estudio/acciones'
import type { EstadoDossier } from '@/lib/services/estudio'

type Props = {
    dossierId: string
    nombre: string
    estado: EstadoDossier
}

export function AccionesDossier({ dossierId, nombre, estado }: Props) {
    const router = useRouter()
    const [editando, setEditando] = useState(false)
    const [borrador, setBorrador] = useState(nombre)
    const [fallo, setFallo] = useState<string | null>(null)
    const [pendiente, empezar] = useTransition()

    function guardarNombre() {
        const limpio = borrador.trim()
        if (!limpio || limpio === nombre) {
            setEditando(false)
            setBorrador(nombre)
            return
        }
        empezar(async () => {
            const r = await accionRenombrar(dossierId, limpio)
            if (r.ok) {
                setEditando(false)
                router.refresh()
            } else {
                setFallo(r.error)
            }
        })
    }

    function alternarArchivo() {
        empezar(async () => {
            const r = await accionArchivar(dossierId, estado === 'activo')
            if (r.ok) router.refresh()
            else setFallo(r.error)
        })
    }

    if (editando) {
        return (
            <div className="flex items-center gap-2">
                <input
                    autoFocus
                    value={borrador}
                    onChange={(e) => setBorrador(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') guardarNombre()
                        if (e.key === 'Escape') {
                            setEditando(false)
                            setBorrador(nombre)
                        }
                    }}
                    className="px-2 py-1 rounded text-sm outline-none"
                    style={{
                        background: 'rgba(0,0,0,0.35)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-hover)',
                    }}
                    aria-label="Nuevo nombre del dossier"
                />
                <button
                    type="button"
                    onClick={guardarNombre}
                    disabled={pendiente}
                    className="p-1.5 rounded"
                    style={{ color: 'var(--color-gold)' }}
                    aria-label="Guardar el nombre"
                >
                    <Check size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setEditando(false)
                        setBorrador(nombre)
                    }}
                    className="p-1.5 rounded"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label="Cancelar"
                >
                    <X size={15} />
                </button>
                {fallo && (
                    <span className="text-xs" style={{ color: '#c96a5a' }}>
                        {fallo}
                    </span>
                )}
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => setEditando(true)}
                className="p-1.5 rounded transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-text-muted)' }}
                title="Renombrar"
                aria-label={`Renombrar «${nombre}»`}
            >
                <Pencil size={14} />
            </button>
            <button
                type="button"
                onClick={alternarArchivo}
                disabled={pendiente}
                className="p-1.5 rounded transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-text-muted)' }}
                title={estado === 'activo' ? 'Archivar' : 'Devolver a activos'}
                aria-label={
                    estado === 'activo'
                        ? `Archivar «${nombre}»`
                        : `Devolver «${nombre}» a activos`
                }
            >
                {estado === 'activo' ? (
                    <Archive size={14} />
                ) : (
                    <ArchiveRestore size={14} />
                )}
            </button>
            {fallo && (
                <span className="text-xs ml-1" style={{ color: '#c96a5a' }}>
                    {fallo}
                </span>
            )}
        </div>
    )
}
