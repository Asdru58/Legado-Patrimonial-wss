# Informe Estructural del Frontend — Legado Patrimonial WSS

**Fecha de generación:** 8 de abril de 2026, 21:45 (UTC-4)  
**Método de obtención:** Salida directa de `tree /F /A` y `Get-ChildItem` de Windows + lectura de archivos de configuración  
**Fidelidad:** 100% — datos sin procesamiento ni inferencia

---

## 1. Diagnóstico Inicial

| Comando ejecutado | Resultado |
|---|---|
| `Get-ChildItem app -Force` | ❌ **No existe.** Error: `No se encuentra la ruta 'Legado Patrimonial WSS\app'` |
| `Get-ChildItem src -Force` | ✅ **Existe.** Contiene 7 subcarpetas + 1 archivo raíz |

> [!IMPORTANT]
> El proyecto usa la convención `src/app/` (App Router dentro de `src/`). **No** existe carpeta `app/` en la raíz.

---

## 2. Stack Tecnológico (de `package.json`)

| Categoría | Paquete | Versión |
|---|---|---|
| **Framework** | `next` | `16.1.6` |
| **UI** | `react` / `react-dom` | `19.2.3` |
| **Backend as Service** | `@supabase/supabase-js` | `^2.98.0` |
| **Auth SSR** | `@supabase/ssr` | `^0.8.0` |
| **Iconos** | `lucide-react` | `^1.0.1` |
| **Estado global** | `zustand` | `^5.0.11` |
| **CSS** | `tailwindcss` (v4) + `@tailwindcss/postcss` | `^4` |
| **Lenguaje** | `typescript` | `^5` |
| **Linting** | `eslint` + `eslint-config-next` | `^9` / `16.1.6` |
| **DB directa (scripts)** | `pg` | `^8.20.0` |

---

## 3. Archivos de Configuración Raíz

| Archivo | Propósito | Detalle relevante |
|---|---|---|
| `package.json` | Dependencias y scripts | Scripts: `dev`, `build`, `start`, `lint` |
| `next.config.ts` | Config de Next.js | Vacía (sin opciones personalizadas) |
| `tsconfig.json` | Config TypeScript | Path alias: `@/*` → `./src/*`, target ES2017 |
| `postcss.config.mjs` | PostCSS | Plugin: `@tailwindcss/postcss` |
| `eslint.config.mjs` | ESLint | Core Web Vitals + TypeScript rules |
| `middleware.ts` | Middleware de autenticación | Fase 5.7 — Parches A (claim admin), B (getClaims), D (Cache-Control) |
| `next-env.d.ts` | Tipos auto-generados de Next.js | — |
| `.env.local` | Variables de entorno | 1,123 bytes (Supabase URL + keys) |
| `.gitignore` | Exclusiones Git | — |

### Detalle del `middleware.ts` (88 líneas)
- Usa `@supabase/ssr` con `createServerClient`
- Verifica JWT localmente con `getClaims()` (sin roundtrip HTTP)
- Protege rutas `/admin/*`: requiere `app_metadata.role === "admin"`
- Redirige a `/login?redirectTo=...` si no es admin
- Aplica `Cache-Control: private, no-store` en rutas admin
- Matcher excluye: `_next/static`, `_next/image`, `favicon.ico`, archivos estáticos

---

## 4. Árbol Completo de `src/` (salida textual de `tree /F /A`)

```
src/
|   proxy.ts
|
+---app/
|   |   favicon.ico
|   |   globals.css
|   |   layout.tsx
|   |   page.tsx
|   |
|   +---admin/
|   |   |   admin-sidebar.tsx
|   |   |   layout.tsx
|   |   |   page.tsx
|   |   |
|   |   \---conferencias/
|   |       |   error.tsx
|   |       |   loading.tsx
|   |       |   not-found.tsx
|   |       |   page.tsx
|   |       |
|   |       +---nueva/
|   |       |       actions.ts
|   |       |       crear-form.tsx
|   |       |       page.tsx
|   |       |
|   |       \---[id]/
|   |           \---editar/
|   |                   actions.ts
|   |                   editar-form.tsx
|   |                   page.tsx
|   |
|   +---alabanza/
|   |       page.tsx
|   |
|   +---api/
|   |   +---health/
|   |   |       route.ts
|   |   |
|   |   \---test-connection/
|   |           route.ts
|   |
|   +---archivo/
|   |       ArchivoControls.tsx
|   |       ArchivoPageClient.tsx
|   |       error.tsx
|   |       loading.tsx
|   |       not-found.tsx
|   |       page.tsx
|   |       Pagination.tsx
|   |       SearchBar.tsx
|   |
|   +---blog/
|   |       page.tsx
|   |
|   +---conferencia/
|   |   \---[slug]/
|   |           ConferenciaDetalleClient.tsx
|   |           error.tsx
|   |           loading.tsx
|   |           not-found.tsx
|   |           page.tsx
|   |
|   +---el-legado/
|   |       page.tsx
|   |
|   +---estudios/
|   |       page.tsx
|   |
|   +---login/
|   |       actions.ts
|   |       layout.tsx
|   |       login-form.tsx
|   |       page.tsx
|   |
|   \---podcast/
|           page.tsx
|
+---components/
|   +---layout/
|   |       index.ts
|   |       Navbar.tsx
|   |
|   +---player/
|   |       index.ts
|   |       PersistentPlayer.tsx
|   |
|   \---ui/
|           ConferenceCard.tsx
|           ConferenceDetail.tsx
|           DashboardGrid.tsx
|           HeroSection.tsx
|           index.ts
|           SidebarFilters.tsx
|
+---hooks/
|       index.ts
|       useConferencias.ts
|
+---lib/
|   |   storage.ts
|   |   supabase-client.ts
|   |   supabase-server.ts
|   |
|   +---services/
|   |       conferences.ts
|   |
|   \---supabase/
|           client.ts
|           middleware.ts
|           server.ts
|
+---services/
|       conferences.ts
|
+---store/
|       index.ts
|       playerStore.ts
|
\---types/
        database.ts
        index.ts
```

---

## 5. Mapa de Rutas del App Router

| Ruta URL | Tipo | Archivos | Descripción |
|---|---|---|---|
| `/` | Pública | `page.tsx`, `layout.tsx`, `globals.css` | Página principal (home) |
| `/archivo` | Pública | `page.tsx`, `ArchivoPageClient.tsx`, `ArchivoControls.tsx`, `SearchBar.tsx`, `Pagination.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx` | Archivo público de conferencias con búsqueda y paginación |
| `/conferencia/[slug]` | Pública dinámica | `page.tsx`, `ConferenciaDetalleClient.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx` | Detalle individual de conferencia |
| `/el-legado` | Pública | `page.tsx` | Sección "El Legado" |
| `/alabanza` | Pública | `page.tsx` | Sección de alabanza |
| `/estudios` | Pública | `page.tsx` | Sección de estudios |
| `/blog` | Pública | `page.tsx` | Blog |
| `/podcast` | Pública | `page.tsx` | Podcast |
| `/login` | Pública | `page.tsx`, `layout.tsx`, `login-form.tsx`, `actions.ts` | Autenticación con Supabase |
| `/admin` | Protegida | `page.tsx`, `layout.tsx`, `admin-sidebar.tsx` | Dashboard administrativo |
| `/admin/conferencias` | Protegida | `page.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx` | Lista de conferencias (CRUD) |
| `/admin/conferencias/nueva` | Protegida | `page.tsx`, `crear-form.tsx`, `actions.ts` | Formulario de creación |
| `/admin/conferencias/[id]/editar` | Protegida | `page.tsx`, `editar-form.tsx`, `actions.ts` | Formulario de edición |
| `/api/health` | API Route | `route.ts` | Health check |
| `/api/test-connection` | API Route | `route.ts` | Test de conexión a Supabase |

**Total:** 10 rutas de página + 2 rutas dinámicas + 2 API routes = **14 rutas**

---

## 6. Inventario de Componentes

| Componente | Ruta | Propósito |
|---|---|---|
| `Navbar.tsx` | `components/layout/` | Barra de navegación principal |
| `PersistentPlayer.tsx` | `components/player/` | Reproductor de audio persistente |
| `ConferenceCard.tsx` | `components/ui/` | Tarjeta de conferencia (para listados) |
| `ConferenceDetail.tsx` | `components/ui/` | Vista detallada de conferencia |
| `DashboardGrid.tsx` | `components/ui/` | Grid del panel admin |
| `HeroSection.tsx` | `components/ui/` | Sección hero de la home |
| `SidebarFilters.tsx` | `components/ui/` | Filtros laterales del archivo |

**Barrel exports:** Cada subcarpeta (`layout/`, `player/`, `ui/`) tiene un `index.ts` para re-exportar.

---

## 7. Capas de Datos y Servicios

| Capa | Archivo | Propósito |
|---|---|---|
| **Supabase Client (browser)** | `lib/supabase/client.ts` | Cliente Supabase para componentes client |
| **Supabase Server (RSC)** | `lib/supabase/server.ts` | Cliente Supabase para Server Components |
| **Supabase Middleware** | `lib/supabase/middleware.ts` | Helper para middleware de auth |
| **Supabase Client (legacy)** | `lib/supabase-client.ts` | Versión anterior del cliente browser |
| **Supabase Server (legacy)** | `lib/supabase-server.ts` | Versión anterior del cliente server |
| **Storage** | `lib/storage.ts` | Manejo de Supabase Storage |
| **Conferences Service (lib)** | `lib/services/conferences.ts` | Servicio de conferencias (con RPC `buscar_conferencias`) |
| **Conferences Service (legacy)** | `services/conferences.ts` | Servicio de conferencias (versión anterior) |
| **Hook** | `hooks/useConferencias.ts` | Hook React para consumir conferencias |
| **Player Store** | `store/playerStore.ts` | Estado global Zustand del reproductor |
| **Types** | `types/database.ts`, `types/index.ts` | Tipos TypeScript del schema de Supabase |
| **Proxy** | `proxy.ts` (raíz src) | Preparación para migración de middleware a Next.js 16 |

> [!WARNING]
> Existen archivos duplicados/legacy: `lib/supabase-client.ts` vs `lib/supabase/client.ts` y `services/conferences.ts` vs `lib/services/conferences.ts`. Esto puede causar confusión sobre cuál es el activo.

---

## 8. Carpeta `public/` (Assets Estáticos)

```
public/
|   file.svg
|   globe.svg
|   next.svg          ← Default de Next.js
|   vercel.svg        ← Default de Next.js
|   window.svg
|
\---images/
        hero-dr-william.png
        photo_2026-03-05_22-53-48.jpg
        photo_2026-03-05_22-53-56.jpg
        photo_2026-03-05_22-54-17.jpg
        photo_2026-03-05_22-54-27.jpg
        pngtree-majestic-lion-in-natural-habitat-with-realistic-details-ai-image_20304785.webp
        watermark.png
        wss_lampara.jpg
        youtube_thumbnail_17336.webp
        youtube_thumbnail_17877.webp
        youtube_thumbnail_20792.webp
```

**Total:** 5 SVGs raíz (3 son defaults de Next.js) + 11 imágenes en `images/`

---

## 9. Carpeta `supabase/` (Migraciones)

```
supabase/
+---.temp/
|       cli-latest
|
\---migrations/
        001_fase5_6_schema_maestro.sql
        buscar_conferencias.sql
        taxonomia_migracion.sql
```

**3 migraciones SQL:** Schema maestro (Fase 5.6), RPC de búsqueda FTS, y sistema de taxonomía.

---

## 10. Carpeta `scripts/` (Pipeline de Datos)

| Archivo | Propósito |
|---|---|
| `auditoria_r1.mjs` | Auditoría forense R-1 |
| `auditoria_r1_string.mjs` | Variante string de auditoría R-1 |
| `purga_r2.mjs` | Script de purga R-2 |
| `purga_r2_bc.mjs` | Script de purga R-2 (backup/variante) |
| `consulta_fk.mjs` | Consulta de foreign keys |
| `preparar_catalogo.mjs` | Pipeline R-4: limpieza y normalización del catálogo |
| `cargar_produccion.mjs` | Script de carga a producción |
| `carga_piloto.mjs` | Carga piloto (prueba) |
| `validar_produccion.mjs` | Validación post-carga |
| `catalogo_limpio.json` | Output: catálogo limpio (R-4) |
| `catalogo_cuarentena.json` | Output: registros en cuarentena (R-4) |
| `catalogo_maestro_dryrun.json` | Output: dry-run del catálogo maestro |
| `reporte_r4.txt` | Reporte final de R-4 |

---

## 11. Carpeta `docs/`

```
docs/
    MASTER_PLAN.md
```

Un único archivo: el plan maestro del proyecto.

---

## 12. Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| **Framework** | Next.js 16.1.6 (App Router, dentro de `src/`) |
| **Lenguaje** | TypeScript 5 + React 19.2.3 |
| **CSS** | Tailwind CSS v4 |
| **Backend** | Supabase (Auth + DB + Storage) |
| **Estado global** | Zustand 5 |
| **Rutas totales** | 14 (10 páginas + 2 dinámicas + 2 API) |
| **Componentes reutilizables** | 7 |
| **Archivos en `src/`** | ~52 |
| **Migraciones SQL** | 3 |
| **Scripts de datos** | 9 ejecutables + 4 outputs |
| **¿Proyecto base/starter?** | **NO.** Proyecto con arquitectura sustancial implementada |

> [!NOTE]
> Este proyecto tiene funcionalidad real construida: autenticación con roles, CRUD administrativo, archivo público con búsqueda FTS, reproductor persistente, y un pipeline completo de gestión de datos. No es un scaffold vacío.
