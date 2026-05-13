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
