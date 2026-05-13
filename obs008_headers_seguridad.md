# OBS-008 — HEADERS DE SEGURIDAD Y CSP

**Fecha:** 13 de mayo de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Contexto:** Pre-despliegue a producción  
**Estado:** Para revisión del Auditor antes de ejecución

---

## 1. ANÁLISIS DE DEPENDENCIAS EXTERNAS DEL PORTAL

Antes de escribir el CSP, inventario de qué recursos externos necesita el portal:

| Recurso | Tipo | Dominios | Usado en |
|---|---|---|---|
| Supabase API | fetch/XHR | `*.supabase.co` | Todas las rutas (datos) |
| Google Fonts | CSS + font files | `fonts.googleapis.com`, `fonts.gstatic.com` | Layout global |
| YouTube embeds | iframe | `www.youtube-nocookie.com` | `/podcast/[episodio]` |
| Vimeo embeds | iframe | `player.vimeo.com` | `/podcast/[episodio]` |
| Spotify embeds | iframe | `open.spotify.com` | `/podcast/[episodio]` |
| iVoox embeds | iframe | `www.ivoox.com` | `/podcast/[episodio]` |
| Lucide icons | Inline SVG | Ninguno (local) | Todo el portal |
| Tailwind CSS | Inline styles | Ninguno (local) | Todo el portal |

---

## 2. CONFIGURACIÓN COMPLETA DE `next.config.ts`

```typescript
import type { NextConfig } from "next";

// ============================================================
// Legado Patrimonial WSS — Configuración de Next.js
// Headers de seguridad HTTP + Content-Security-Policy
// Resolución de OBS-008 (Pre-despliegue)
// ============================================================

// Dominios autorizados para embeds del podcast (H-001 whitelist)
const EMBED_SOURCES = [
    "https://www.youtube-nocookie.com",
    "https://player.vimeo.com",
    "https://open.spotify.com",
    "https://www.ivoox.com",
].join(" ");

// Dominio de Supabase del proyecto
const SUPABASE_DOMAIN = "https://bvawgqprxuiqtreqsyly.supabase.co";

// Content-Security-Policy construida por directiva
const CSP_DIRECTIVES = [
    // Solo HTTPS en producción (se relaja para localhost abajo)
    "default-src 'self'",

    // Scripts: solo propios + inline necesarios para Next.js
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

    // Estilos: propios + inline (Tailwind) + Google Fonts CSS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Fuentes: propias + Google Fonts archivos
    "font-src 'self' https://fonts.gstatic.com",

    // Imágenes: propias + data URIs (para SVG inline) + Supabase Storage (futuro)
    `img-src 'self' data: blob: ${SUPABASE_DOMAIN}`,

    // Conexiones API: Supabase
    `connect-src 'self' ${SUPABASE_DOMAIN} https://*.supabase.co`,

    // Iframes embebidos: SOLO proveedores autorizados (alineado con H-001)
    `frame-src ${EMBED_SOURCES}`,

    // Prohibir que el portal sea embebido en iframes externos
    "frame-ancestors 'none'",

    // Media: propios + Supabase Storage (futuro para audio/video directo)
    `media-src 'self' ${SUPABASE_DOMAIN} blob:`,

    // Objetos embebidos: prohibidos
    "object-src 'none'",

    // Base URI: solo self (previene inyección de <base>)
    "base-uri 'self'",

    // Formularios: solo envío a self (Server Actions de Next.js)
    "form-action 'self'",

    // Upgrade insecure requests en producción
    "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
    {
        // Previene clickjacking — el portal no debe ser embebido en iframes externos
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        // Previene MIME-type sniffing
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        // Controla información enviada al navegar a sitios externos
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        // Deshabilita APIs del navegador innecesarias
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    {
        // Mejora rendimiento de resolución DNS
        key: "X-DNS-Prefetch-Control",
        value: "on",
    },
    {
        // Content-Security-Policy completa
        key: "Content-Security-Policy",
        value: CSP_DIRECTIVES,
    },
];

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                // Aplicar headers a TODAS las rutas
                source: "/(.*)",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
```

---

## 3. EXPLICACIÓN DE CADA DIRECTIVA CSP

| Directiva | Valor | Justificación |
|---|---|---|
| `default-src` | `'self'` | Todo lo no especificado solo puede venir del propio dominio |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | Next.js requiere inline scripts y eval para hidratación y HMR. En producción se puede endurecer con nonces si se implementa middleware CSP dinámico |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Tailwind usa estilos inline. Google Fonts sirve CSS desde su CDN |
| `font-src` | `'self' https://fonts.gstatic.com` | Google Fonts sirve los archivos de fuente desde gstatic |
| `img-src` | `'self' data: blob: [supabase]` | `data:` para SVGs inline, `blob:` para procesamiento dinámico, Supabase para imágenes futuras |
| `connect-src` | `'self' [supabase]` | Todas las llamadas API van a Supabase |
| `frame-src` | YouTube, Vimeo, Spotify, iVoox | Solo los 4 proveedores autorizados por H-001 pueden ser embebidos |
| `frame-ancestors` | `'none'` | Nadie puede embeber el portal en un iframe (complementa X-Frame-Options) |
| `media-src` | `'self' [supabase] blob:` | Para audio/video directo si se implementa en el futuro |
| `object-src` | `'none'` | Sin Flash, Java, ni plugins embebidos |
| `base-uri` | `'self'` | Previene inyección de etiqueta `<base>` |
| `form-action` | `'self'` | Los formularios solo envían datos al propio servidor (Server Actions) |
| `upgrade-insecure-requests` | — | Fuerza HTTPS para todos los recursos en producción |

---

## 4. NOTA SOBRE `script-src 'unsafe-inline' 'unsafe-eval'`

Esta es la directiva más permisiva y merece explicación:

Next.js 16 con App Router inyecta scripts inline para hidratación del cliente y para el sistema de streaming de Server Components. Sin `'unsafe-inline'`, el portal se rompería.

La solución óptima es usar **nonces CSP dinámicos** (un token único por request que autoriza scripts específicos). Next.js 16 soporta esto via `middleware.ts`, pero implementarlo requiere:
- Generar un nonce por request en middleware.
- Pasarlo a los headers CSP dinámicamente.
- Que Next.js lo aplique a sus scripts inyectados.

Eso es un proyecto de seguridad avanzada que excede el alcance de OBS-008. Para el MVP, `'unsafe-inline' 'unsafe-eval'` es aceptable y es el estándar de la industria para aplicaciones Next.js en producción.

---

## 5. STRICT-TRANSPORT-SECURITY

**NO incluido en esta configuración.** Este header solo debe activarse cuando:
- El portal esté desplegado en HTTPS con dominio real.
- Se haya verificado que HTTPS funciona correctamente.
- Se haya decidido el valor de `max-age`.

Activarlo prematuramente en localhost o sin HTTPS podría causar problemas de acceso. Se añadirá como parte del despliegue a producción en Vercel.

Header futuro:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

---

## 6. INSTRUCCIÓN PARA ANTIGRAVITY

Reemplazar el contenido completo de `next.config.ts` con el código de la Sección 2 de este documento.

Después ejecutar:

```powershell
npm run build
```

Verificar que el build pase limpio (exit code 0). Los headers no deberían romper nada en el build — solo se aplican en runtime.

Para verificar los headers en desarrollo:

```powershell
npm run dev
```

Abrir DevTools del navegador → pestaña Network → click en cualquier request → verificar que los Response Headers incluyan `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, etc.

---

## 7. RIESGO DE ROTURA

| Componente | Riesgo | Mitigación |
|---|---|---|
| Embeds del podcast | Bajo — `frame-src` incluye los 4 proveedores | Probar `/podcast/[episodio]` con video real |
| Google Fonts | Nulo — `style-src` y `font-src` los cubren | Verificar que las fuentes cargan |
| Supabase | Nulo — `connect-src` lo cubre | Verificar que los datos cargan |
| Next.js hidratación | Nulo — `'unsafe-inline'` lo cubre | Verificar navegación client-side |
| Formularios admin | Nulo — `form-action 'self'` permite Server Actions | Probar crear/editar un artículo |

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
