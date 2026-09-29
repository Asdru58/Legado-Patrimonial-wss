// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/app/api/estudio/exportar/route.ts
// Descarga en Markdown de los pasajes conservados.
//
// Solo los conservados, en el orden del buscador. Por cada uno: la cita,
// la nota debajo, y fecha, título y páginas de la conferencia.
//
// Cuando un pasaje está ausente del corpus, `estudio_exportar` cae en la
// cita de resguardo. Aquí se marca como tal: el lector tiene que saber
// que no está leyendo el corpus sino una copia corta de emergencia.
// =========================================================

import { NextResponse, type NextRequest } from 'next/server'

import { tokenDePropietario } from '@/lib/estudio/propietario'
import { exportarDossier, type FilaExportacion } from '@/lib/services/estudio'

export const dynamic = 'force-dynamic'

const AVISO: Record<string, string> = {
    cambiado:
        '> **Aviso:** el texto de este pasaje cambió en el corpus desde que se guardó.',
    no_vigente:
        '> **Aviso:** la transcripción de la que salió este pasaje dejó de ser la vigente.',
    ausente:
        '> **Aviso:** este pasaje ya no está en el corpus. Lo que sigue es la cita de resguardo guardada al conservarlo, no el texto completo.',
}

/** Nombre de archivo seguro, sin acentos ni signos. */
function nombreDeArchivo(titulo: string): string {
    const base = titulo
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
    return `${base || 'dossier'}.md`
}

function componerMarkdown(filas: FilaExportacion[]): string {
    const cabecera = filas[0]
    const fecha = new Date(cabecera.generado).toLocaleDateString('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    const partes: string[] = [
        `# ${cabecera.dossier}`,
        '',
        `**Consulta:** «${cabecera.consulta}»`,
        '',
        `**Modalidad:** ${cabecera.modo === 'semantica' ? 'semántica' : 'exacta'} · `
            + `**Exportado:** ${fecha} · **Pasajes conservados:** ${filas.length}`,
        '',
        '---',
        '',
    ]

    for (const fila of filas) {
        const paginas =
            fila.pagina_inicio === fila.pagina_fin
                ? `pág. ${fila.pagina_inicio}`
                : `págs. ${fila.pagina_inicio}-${fila.pagina_fin}`

        partes.push(`## ${fila.posicion}. ${fila.titulo ?? 'Sin título'}`)
        partes.push('')
        partes.push(`*${fila.fecha ?? 'sin fecha'} · ${paginas}*`)
        partes.push('')

        const aviso = AVISO[fila.estado_pasaje]
        if (aviso) {
            partes.push(aviso)
            partes.push('')
        }

        // La cita, como bloque de cita, respetando sus saltos de línea.
        for (const linea of fila.texto.split('\n')) {
            partes.push(`> ${linea}`)
        }
        partes.push('')

        if (fila.nota) {
            partes.push(`**Nota:** ${fila.nota}`)
            partes.push('')
        }

        partes.push('---')
        partes.push('')
    }

    return partes.join('\n')
}

export async function GET(request: NextRequest) {
    const dossierId = request.nextUrl.searchParams.get('dossier')
    if (!dossierId) {
        return NextResponse.json({ error: 'Falta el dossier.' }, { status: 400 })
    }

    const token = await tokenDePropietario()
    if (!token) {
        return NextResponse.json(
            { error: 'No hay sesión de mesa en este navegador.' },
            { status: 401 }
        )
    }

    try {
        const filas = await exportarDossier(token, dossierId)
        if (filas.length === 0) {
            return NextResponse.json(
                { error: 'Este dossier no tiene pasajes conservados.' },
                { status: 404 }
            )
        }

        return new NextResponse(componerMarkdown(filas), {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="${nombreDeArchivo(filas[0].dossier)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[exportar]', error)
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo exportar el dossier.',
            },
            { status: 500 }
        )
    }
}
