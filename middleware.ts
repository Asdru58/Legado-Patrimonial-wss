// =========================================================
// Legado Patrimonial WSS — Fase 5.7
// src/middleware.ts
// Parches aplicados: A (claim admin), B (getClaims), D (Cache-Control)
// Decisión: se mantiene middleware.ts (Next.js 15).
//           Migrar a proxy.ts con codemod al saltar a Next.js 16.
// =========================================================

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ---------------------------------------------------------
  // Parche B: getClaims() en lugar de getUser().
  // Verifica el JWT localmente (firma + expiración) sin
  // roundtrip HTTP al servidor Auth en cada request.
  // ---------------------------------------------------------
  const { data, error } = await supabase.auth.getClaims();

  // ---------------------------------------------------------
  // Parche D: Cache-Control en rutas autenticadas.
  // Impide que un CDN cachee respuestas con Set-Cookie,
  // evitando fugas de sesión entre usuarios.
  // ---------------------------------------------------------
  if (request.nextUrl.pathname.startsWith("/admin")) {
    supabaseResponse.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate"
    );
  }

  // ---------------------------------------------------------
  // Parche A: verificación del claim admin.
  // No basta con que exista un usuario autenticado;
  // debe portar { role: "admin" } en app_metadata.
  // ---------------------------------------------------------
  const isAdmin =
    !error &&
    data?.claims?.app_metadata?.role === "admin";

  if (request.nextUrl.pathname.startsWith("/admin") && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Ejecuta middleware en todas las rutas excepto:
     * - _next/static  (archivos estáticos del build)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico
     * - assets estáticos comunes (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
