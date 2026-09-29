// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/lib/estudio/acciones.ts
// Server Actions. Son la única vía por la que el cliente escribe.
//
// El token NUNCA viaja al cliente para estas llamadas: cada acción lo
// lee de la cookie en el servidor. Un componente de cliente solo manda
// identificadores.
// =========================================================

'use server'

import { revalidatePath } from 'next/cache'

import {
    acunarToken,
    asegurarToken,
    reponerToken,
    tokenDePropietario,
} from '@/lib/estudio/propietario'
import {
    anotar,
    archivarDossier,
    registrarPropietario,
    rotarLlave,
    crearDossier,
    decidir,
    deshacer,
    marcarLeido,
    renombrarDossier,
    type ItemAGuardar,
    type ModoBusqueda,
    type Seleccion,
} from '@/lib/services/estudio'

export type Resultado<T = void> =
    | { ok: true; valor: T }
    | { ok: false; error: string }

async function conToken<T>(
    trabajo: (token: string) => Promise<T>
): Promise<Resultado<T>> {
    const token = await tokenDePropietario()
    if (!token) {
        return {
            ok: false,
            error: 'No hay sesión de mesa en este navegador. Recarga la página.',
        }
    }
    try {
        return { ok: true, valor: await trabajo(token) }
    } catch (error) {
        console.error('[acciones estudio]', error)
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'La estación de estudio no respondió.',
        }
    }
}

// ============================================
// Dossier
// ============================================

/**
 * Guardar una búsqueda en la mesa.
 *
 * CORRECCIÓN 1. Antes daba por hecho que el navegador ya tenía cookie y que
 * el propietario estaba dado de alta. Las dos cosas fallan en el camino más
 * natural: entrar por primera vez, ir al buscador desde la barra de
 * navegación y pulsar guardar sin haber pisado /mesa.
 *
 *   - `asegurarToken` acuña la cookie si no la hay. Una Server Action SÍ
 *     puede escribir cookies; un Server Component no.
 *   - `registrarPropietario` da de alta. Es idempotente, así que llamarla
 *     de más no rompe nada, y sin ella `estudio_crear_dossier` rechazaba
 *     la llave con «token no reconocido».
 */
export async function accionGuardarBusqueda(datos: {
    nombre: string
    consulta: string
    modo: ModoBusqueda
    parametros: Record<string, unknown>
    items: ItemAGuardar[]
}): Promise<Resultado<string>> {
    try {
        const token = await asegurarToken()
        await registrarPropietario(token)
        const id = await crearDossier(token, datos)
        revalidatePath('/mesa')
        return { ok: true, valor: id }
    } catch (error) {
        console.error('[accionGuardarBusqueda]', error)
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'La estación de estudio no respondió.',
        }
    }
}

/**
 * Rotar la llave.
 *
 * LA VENTANA DELICADA: entre que la base acepta la llave nueva y que el
 * navegador tiene la cookie repuesta hay un hueco. Si la reposición fallara,
 * la persona quedaría fuera de su propia mesa y no podría ver la llave nueva,
 * porque el panel solo se abre desde dentro.
 *
 * Por eso esta acción devuelve SIEMPRE la llave nueva, haya ido bien o mal la
 * cookie, junto con `cookieRepuesta`. La pantalla la muestra en la misma
 * respuesta y no la esconde aunque falle: se puede copiar y entrar a mano.
 */
export async function accionRotarLlave(): Promise<
    Resultado<{ llaveNueva: string; cookieRepuesta: boolean; cuando: string }>
> {
    const actual = await tokenDePropietario()
    if (!actual) {
        return {
            ok: false,
            error: 'No hay sesión de mesa en este navegador. Recarga la página.',
        }
    }

    const llaveNueva = acunarToken()
    let cuando: string
    try {
        cuando = await rotarLlave(actual, llaveNueva)
    } catch (error) {
        console.error('[accionRotarLlave] la base rechazó la rotación', error)
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'No se pudo cambiar la llave. La actual sigue sirviendo.',
        }
    }

    // A partir de aquí la llave nueva YA es la buena en la base. Pase lo que
    // pase con la cookie, hay que devolvérsela al usuario.
    const cookieRepuesta = await reponerToken(llaveNueva)
    if (cookieRepuesta) revalidatePath('/mesa')

    return { ok: true, valor: { llaveNueva, cookieRepuesta, cuando } }
}

export async function accionRenombrar(
    dossierId: string,
    nombre: string
): Promise<Resultado<boolean>> {
    const limpio = nombre.trim()
    if (!limpio) return { ok: false, error: 'El nombre no puede quedar vacío.' }

    const resultado = await conToken((token) =>
        renombrarDossier(token, dossierId, limpio)
    )
    if (resultado.ok) {
        revalidatePath('/mesa')
        revalidatePath(`/mesa/${dossierId}`)
    }
    return resultado
}

export async function accionArchivar(
    dossierId: string,
    archivar: boolean
): Promise<Resultado<boolean>> {
    const resultado = await conToken((token) =>
        archivarDossier(token, dossierId, archivar)
    )
    if (resultado.ok) {
        revalidatePath('/mesa')
        revalidatePath(`/mesa/${dossierId}`)
    }
    return resultado
}

// ============================================
// Ítems
// ============================================

export async function accionMarcarLeido(
    dossierId: string,
    itemId: string,
    leido: boolean
): Promise<Resultado<boolean>> {
    const resultado = await conToken((token) => marcarLeido(token, itemId, leido))
    if (resultado.ok) revalidatePath(`/mesa/${dossierId}`)
    return resultado
}

export async function accionDecidir(
    dossierId: string,
    itemId: string,
    seleccion: Seleccion
): Promise<Resultado<boolean>> {
    const resultado = await conToken((token) => decidir(token, itemId, seleccion))
    if (resultado.ok) revalidatePath(`/mesa/${dossierId}`)
    return resultado
}

/** Un solo nivel. Ver el comentario de `deshacer` en el servicio. */
export async function accionDeshacer(
    dossierId: string,
    itemId: string
): Promise<Resultado<Seleccion | null>> {
    const resultado = await conToken((token) => deshacer(token, itemId))
    if (resultado.ok) revalidatePath(`/mesa/${dossierId}`)
    return resultado
}

export async function accionAnotar(
    dossierId: string,
    itemId: string,
    nota: string
): Promise<Resultado<boolean>> {
    const resultado = await conToken((token) => anotar(token, itemId, nota))
    if (resultado.ok) revalidatePath(`/mesa/${dossierId}`)
    return resultado
}
