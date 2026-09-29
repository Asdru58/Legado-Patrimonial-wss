// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/lib/services/estudio.ts
// Capa de servicio: única vía de interacción con el esquema de la
// estación. Todo pasa por funciones SECURITY DEFINER; el portal no
// toca estudio_propietario, estudio_dossier ni estudio_dossier_item
// directamente, porque `anon` no tiene ni un privilegio sobre ellas.
//
// Ninguna función acepta un propietario_id: siempre lo derivan del
// token. Pasar un dossier_id ajeno devuelve «dossier no encontrado».
//
// Esquema aplicado con COMMIT el 2026-09-18. Ver
// artifacts/estacion_estudio/PROTOCOLO_ESTACION_ESTUDIO.md
// =========================================================

import 'server-only'

import { createClient } from '@/lib/supabase/server'

// ============================================
// Tipos
// ============================================

/**
 * Los CUATRO estados de un pasaje guardado. No son tres.
 *
 * Leído del cuerpo instalado de estudio_abrir_dossier el 2026-09-19;
 * el CASE evalúa en este orden:
 *
 *   ausente     pas.id IS NULL — ya no está en el corpus
 *   no_vigente  su transcripción dejó de ser la vigente
 *   vigente     el hash del texto coincide con el guardado
 *   cambiado    (ELSE) existe pero el texto cambió
 *
 * `no_vigente` es el único que no se pudo probar: provocarlo exigiría
 * tocar corpus_transcripciones. La interfaz lo pinta igual.
 */
export type EstadoPasaje = 'vigente' | 'cambiado' | 'no_vigente' | 'ausente'

export type ModoBusqueda = 'semantica' | 'exacta'
export type EstadoDossier = 'activo' | 'archivado'
export type Seleccion = 'pendiente' | 'conservado' | 'descartado'
export type FiltroVista = 'todos' | 'conservados' | 'pendientes' | 'descartados'

export type Propietario = {
    propietario_id: string
    nombre: string
    dossiers: number
    nuevo: boolean
}

export type ResumenDossier = {
    dossier_id: string
    nombre: string
    consulta: string
    modo: ModoBusqueda
    estado: EstadoDossier
    total: number
    leidos: number
    conservados: number
    descartados: number
    creado_at: string
    actualizado_at: string
}

export type ItemDossier = {
    item_id: string
    posicion: number
    similitud: number | null
    pasaje_id: string
    conferencia_id: string
    titulo: string | null
    fecha: string | null
    slug: string | null
    pagina_inicio: number
    pagina_fin: number
    /** null cuando el pasaje ya no está en el corpus. */
    texto: string | null
    /**
     * La copia corta guardada al conservar el pasaje.
     *
     * Llega SOLO cuando `estado_pasaje` es `ausente`; en los otros tres
     * hay texto vivo en el corpus y mandar las dos versiones sería enviar
     * el mismo pasaje por duplicado. Corrección 2, aplicada el 2026-09-21.
     */
    cita_resguardo: string | null
    estado_pasaje: EstadoPasaje
    leido: boolean
    seleccion: Seleccion
    nota: string | null
    resaltados: unknown[]
}

export type FilaExportacion = {
    dossier: string
    consulta: string
    modo: ModoBusqueda
    generado: string
    posicion: number
    fecha: string | null
    titulo: string | null
    slug: string | null
    pagina_inicio: number
    pagina_fin: number
    /** Cuando el pasaje está ausente, aquí viene la cita de resguardo. */
    texto: string
    estado_pasaje: EstadoPasaje
    nota: string | null
}

/** Lo que el botón de guardar envía por ítem. Nada de textos. */
export type ItemAGuardar = {
    pasaje_id: string
    posicion: number
    similitud: number | null
}

// ============================================
// Errores
// ============================================

export class EstacionNoDisponible extends Error {
    constructor(detalle: string) {
        super(detalle)
        this.name = 'EstacionNoDisponible'
    }
}

/**
 * PostgREST cachea el esquema. Si las funciones se crearon después de
 * arrancarlo responde 404/PGRST202, y desde la interfaz no hay forma de
 * adivinarlo. Se traduce a un mensaje que dice qué hacer.
 */
function traducirError(error: { code?: string; message: string }): never {
    if (error.code === 'PGRST202') {
        throw new EstacionNoDisponible(
            'PostgREST no conoce las funciones de la estación. Recargar su ' +
            "caché de esquema con: NOTIFY pgrst, 'reload schema'"
        )
    }
    throw new EstacionNoDisponible(error.message)
}

/** PostgREST devuelve los count() bigint como cadena. */
function entero(valor: number | string): number {
    return Number(valor)
}

// ============================================
// Lectura
// ============================================

/**
 * Alta idempotente del propietario. Sirve también para ADOPTAR una
 * identidad en otro equipo: pegar un token ya registrado devuelve el
 * mismo propietario, con sus dossiers.
 */
export async function registrarPropietario(
    token: string,
    nombre?: string
): Promise<Propietario> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_registrar', {
        p_token: token,
        p_nombre: nombre ?? null,
    })
    if (error) traducirError(error)

    const filas = (data ?? []) as Propietario[]
    if (filas.length !== 1) {
        throw new EstacionNoDisponible(
            `estudio_registrar devolvió ${filas.length} filas, se esperaba 1`
        )
    }
    return { ...filas[0], dossiers: entero(filas[0].dossiers) }
}

export async function listarDossiers(
    token: string,
    estado: EstadoDossier | 'todos' = 'activo'
): Promise<ResumenDossier[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_listar_dossiers', {
        p_token: token,
        p_estado: estado,
    })
    if (error) traducirError(error)

    return ((data ?? []) as ResumenDossier[]).map((fila) => ({
        ...fila,
        total: entero(fila.total),
        leidos: entero(fila.leidos),
        conservados: entero(fila.conservados),
        descartados: entero(fila.descartados),
    }))
}

export async function abrirDossier(
    token: string,
    dossierId: string,
    filtro: FiltroVista = 'todos'
): Promise<ItemDossier[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_abrir_dossier', {
        p_token: token,
        p_dossier_id: dossierId,
        p_filtro: filtro,
    })
    if (error) traducirError(error)
    return (data ?? []) as ItemDossier[]
}

export async function exportarDossier(
    token: string,
    dossierId: string
): Promise<FilaExportacion[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_exportar', {
        p_token: token,
        p_dossier_id: dossierId,
    })
    if (error) traducirError(error)
    return (data ?? []) as FilaExportacion[]
}

// ============================================
// Escritura
// ============================================

export async function crearDossier(
    token: string,
    datos: {
        nombre: string
        consulta: string
        modo: ModoBusqueda
        parametros: Record<string, unknown>
        items: ItemAGuardar[]
    }
): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_crear_dossier', {
        p_token: token,
        p_nombre: datos.nombre,
        p_consulta: datos.consulta,
        p_modo: datos.modo,
        p_parametros: datos.parametros,
        // Solo tres campos por ítem. El texto, el hash y la cita de
        // resguardo los toma la función de corpus_pasajes por JOIN.
        p_items: datos.items.map((i) => ({
            pasaje_id: i.pasaje_id,
            posicion: i.posicion,
            similitud: i.similitud,
        })),
    })
    if (error) traducirError(error)
    return data as string
}

export async function renombrarDossier(
    token: string,
    dossierId: string,
    nombre: string
): Promise<boolean> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_renombrar_dossier', {
        p_token: token,
        p_dossier_id: dossierId,
        p_nombre: nombre,
    })
    if (error) traducirError(error)
    return Boolean(data)
}

export async function archivarDossier(
    token: string,
    dossierId: string,
    archivar: boolean
): Promise<boolean> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_archivar_dossier', {
        p_token: token,
        p_dossier_id: dossierId,
        p_archivar: archivar,
    })
    if (error) traducirError(error)
    return Boolean(data)
}

export async function marcarLeido(
    token: string,
    itemId: string,
    leido: boolean
): Promise<boolean> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_marcar_leido', {
        p_token: token,
        p_item_id: itemId,
        p_leido: leido,
    })
    if (error) traducirError(error)
    return Boolean(data)
}

export async function decidir(
    token: string,
    itemId: string,
    seleccion: Seleccion
): Promise<boolean> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_decidir', {
        p_token: token,
        p_item_id: itemId,
        p_seleccion: seleccion,
    })
    if (error) traducirError(error)
    return Boolean(data)
}

/**
 * Deshacer, un solo nivel.
 *
 * `seleccion_anterior` guarda UN estado, no una pila. Pulsar Z dos veces
 * seguidas no inventa nada: la segunda devuelve el mismo valor, porque
 * la función pone `seleccion_anterior` a NULL al deshacer y el
 * COALESCE cae en 'pendiente'.
 */
export async function deshacer(
    token: string,
    itemId: string
): Promise<Seleccion | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_deshacer', {
        p_token: token,
        p_item_id: itemId,
    })
    if (error) traducirError(error)
    return (data as Seleccion | null) ?? null
}

export async function anotar(
    token: string,
    itemId: string,
    nota: string
): Promise<boolean> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_anotar', {
        p_token: token,
        p_item_id: itemId,
        p_nota: nota,
    })
    if (error) traducirError(error)
    return Boolean(data)
}

/**
 * Cambia la llave de un propietario. La anterior deja de servir en el acto.
 *
 * No toca dossiers, notas ni ítems: el propietario es el mismo, solo cambia
 * su credencial. Devuelve la marca de tiempo del cambio.
 */
export async function rotarLlave(
    token: string,
    tokenNuevo: string
): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('estudio_rotar_llave', {
        p_token: token,
        p_token_nuevo: tokenNuevo,
    })
    if (error) traducirError(error)
    return data as string
}
