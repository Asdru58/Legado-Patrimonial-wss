// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/lib/estudio/propietario.ts
// Lectura del token del propietario desde el servidor.
//
// El token NUNCA sale de aquí hacia el cliente salvo que una página
// lo pida explícitamente para mostrarlo como clave de recuperación.
// No viaja jamás en una URL.
// =========================================================

import 'server-only'

import { cookies } from 'next/headers'

import {
    COOKIE_PROPIETARIO,
    PATRON_TOKEN,
    VIDA_COOKIE_SEGUNDOS,
} from '@/lib/estudio/constantes'

/**
 * Devuelve el token de la cookie, o null si no hay o está malformado.
 *
 * En las rutas cubiertas por el middleware nunca debería ser null: el
 * middleware la acuña antes de que la página se renderice. Devolver null
 * en vez de lanzar deja que la página muestre un aviso legible si alguien
 * llega con las cookies bloqueadas.
 */
export async function tokenDePropietario(): Promise<string | null> {
    const almacen = await cookies()
    const valor = almacen.get(COOKIE_PROPIETARIO)?.value
    if (!valor || !PATRON_TOKEN.test(valor)) return null
    return valor
}

/**
 * Los cuatro primeros y los cuatro últimos caracteres, para poder
 * referirse a un token sin escribirlo entero en un registro.
 */
export function huellaDeToken(token: string): string {
    return `${token.slice(0, 4)}…${token.slice(-4)}`
}

/** 32 bytes en hexadecimal, como en el Route Handler de entrada. */
export function acunarToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Devuelve el token, acuñándolo y escribiéndolo en la cookie si no había.
 *
 * SOLO desde una Server Action o un Route Handler: son los dos únicos
 * sitios donde `cookies()` admite escritura. Desde un Server Component
 * el `set` lanza, y por eso `tokenDePropietario` se queda en solo lectura.
 *
 * Existe por la corrección 1: quien entra directo al buscador sin pasar
 * por /mesa no tiene cookie, y antes el guardado fallaba sin remedio.
 */
export async function asegurarToken(): Promise<string> {
    const almacen = await cookies()
    const actual = almacen.get(COOKIE_PROPIETARIO)?.value
    if (actual && PATRON_TOKEN.test(actual)) return actual

    const token = acunarToken()
    almacen.set({
        name: COOKIE_PROPIETARIO,
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // Por protocolo, no por NODE_ENV: sobre HTTP una cookie `Secure`
        // el navegador la descarta en silencio.
        secure: (await cabeceraEsHttps()) ? true : false,
        maxAge: VIDA_COOKIE_SEGUNDOS,
    })
    return token
}

/** `x-forwarded-proto` cuando hay proxy delante; si no, se asume HTTP local. */
async function cabeceraEsHttps(): Promise<boolean> {
    const { headers } = await import('next/headers')
    const h = await headers()
    return (h.get('x-forwarded-proto') ?? '').split(',')[0].trim() === 'https'
}

/**
 * Repone la cookie con un token concreto. La usa la rotación de llave:
 * la base ya acepta la nueva, y aquí se deja puesta en el navegador.
 */
export async function reponerToken(token: string): Promise<boolean> {
    if (!PATRON_TOKEN.test(token)) return false
    try {
        const almacen = await cookies()
        almacen.set({
            name: COOKIE_PROPIETARIO,
            value: token,
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: (await cabeceraEsHttps()) ? true : false,
            maxAge: VIDA_COOKIE_SEGUNDOS,
        })
        return true
    } catch {
        // Si la reposición falla, el usuario todavía tiene la llave nueva
        // en pantalla y puede entrar a mano. Ver la corrección 5.
        return false
    }
}
