// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/app/api/estudio/entrar/route.ts
// Acuña la cookie del propietario y devuelve a la mesa.
//
// POR QUÉ UN ROUTE HANDLER Y NO EL PROXY
// El plan era acuñarla en src/proxy.ts. No se puede: Next 16.1.6 compila
// ese archivo —lo cronometra en cada petición: «proxy.ts: 118ms»— pero
// NUNCA ejecuta su función exportada. Comprobado devolviendo un 418 desde
// dentro: la respuesta seguía siendo 200. Se probó con export nombrado y
// con export por defecto, con el matcher heredado y con uno restrictivo,
// y con `.next` borrado de raíz. El proxy quedó restaurado a su contenido
// original; este camino no depende de él.
//
// Un Server Component tampoco puede escribir cookies. Un Route Handler sí,
// así que /mesa redirige aquí cuando no hay cookie, se acuña y se vuelve.
// El usuario ve una sola navegación: no hay que recargar.
//
// ADOPTAR UNA IDENTIDAD: si llega `?llave=<64 hex>`, se usa esa en vez de
// acuñar una nueva. Es el camino de vuelta para recuperar la mesa en otro
// equipo pegando la llave de recuperación.
// =========================================================

import { NextResponse, type NextRequest } from 'next/server'

import {
    COOKIE_PROPIETARIO,
    PATRON_TOKEN,
    VIDA_COOKIE_SEGUNDOS,
} from '@/lib/estudio/constantes'
import { listarDossiers } from '@/lib/services/estudio'
import { mesaHabilitada } from '@/lib/estudio/disponibilidad'

/**
 * ¿Esa llave corresponde a una mesa que ya existe?
 *
 * Se sondea con `estudio_listar_dossiers`, que NO crea nada y lanza 28000
 * ante una llave desconocida. No sirve `estudio_registrar`: esa da de alta,
 * y era justo el fallo — pegar una llave revocada creaba una mesa vacía
 * nueva y la persona creía que su trabajo se había esfumado.
 */
async function laLlaveExiste(llave: string): Promise<boolean> {
    try {
        await listarDossiers(llave, 'todos')
        return true
    } catch {
        return false
    }
}

export const dynamic = 'force-dynamic'

/** 32 bytes de crypto.getRandomValues, en hexadecimal. */
function acunarToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Solo se admiten destinos internos y de la mesa. Sin esto, un enlace
 * `?destino=https://otro.sitio` convertiría esta ruta en un redirector
 * abierto.
 */
function destinoSeguro(valor: string | null): string {
    if (!valor) return '/mesa'
    if (!valor.startsWith('/mesa')) return '/mesa'
    if (valor.startsWith('//')) return '/mesa'
    return valor
}

export async function GET(request: NextRequest) {
    if (!mesaHabilitada) {
        return NextResponse.redirect(new URL('/mesa', request.url))
    }

    const destino = destinoSeguro(request.nextUrl.searchParams.get('destino'))

    const pegada = request.nextUrl.searchParams.get('llave')?.trim().toLowerCase()
    const yaTiene = request.cookies.get(COOKIE_PROPIETARIO)?.value

    let token: string
    if (pegada && PATRON_TOKEN.test(pegada)) {
        // Adoptar la identidad de otro equipo, pero SOLO si esa mesa existe.
        // Una llave ya rotada, o inventada, no debe abrir una mesa vacía
        // haciendo creer que el trabajo se perdió.
        if (!(await laLlaveExiste(pegada))) {
            // Se acuña igualmente una llave propia: si no, /mesa rebotaría aquí
            // otra vez y el aviso se perdería por el camino. Acuñar ya no crea
            // ningún propietario, porque el alta es perezosa.
            const destinoFallo = new URL('/mesa', request.url)
            destinoFallo.searchParams.set('llave', 'desconocida')
            const fallo = NextResponse.redirect(destinoFallo)
            fallo.cookies.set({
                name: COOKIE_PROPIETARIO,
                value: yaTiene && PATRON_TOKEN.test(yaTiene) ? yaTiene : acunarToken(),
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: request.nextUrl.protocol === 'https:',
                maxAge: VIDA_COOKIE_SEGUNDOS,
            })
            return fallo
        }
        token = pegada
    } else if (yaTiene && PATRON_TOKEN.test(yaTiene)) {
        token = yaTiene // no rotar: rotarla dejaría los dossiers huérfanos
    } else {
        token = acunarToken()
    }

    // Se resuelve contra `request.url`, no contra `nextUrl.origin`: este
    // último normaliza el host a `localhost` y, si se entró por 127.0.0.1,
    // la cookie recién puesta no viaja al host nuevo y se produce un rebote.
    const respuesta = NextResponse.redirect(new URL(destino, request.url))
    respuesta.cookies.set({
        name: COOKIE_PROPIETARIO,
        value: token,
        httpOnly: true, // el JavaScript de la página no la lee
        sameSite: 'lax',
        path: '/',
        // Atado al PROTOCOLO, no a NODE_ENV: la pila local corre en HTTP y
        // una cookie `Secure` sobre HTTP el navegador la descarta en
        // silencio, sin error ni aviso.
        secure: request.nextUrl.protocol === 'https:',
        maxAge: VIDA_COOKIE_SEGUNDOS,
    })
    return respuesta
}
