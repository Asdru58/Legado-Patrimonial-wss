# INFORME TÉCNICO — PODCAST: FASES 2, 3 Y 4

**Proyecto:** Legado Patrimonial WSS  
**Fecha de ejecución:** 6 de mayo de 2026  
**Ejecutado por:** Antigravity — Agente de Ejecución Local  
**Autorización:** Administrador (Abg. Asdrúbal Lira)  
**Estado:** ✅ Build limpio — 0 errores TypeScript — Exit code 0

---

## 1. CONTEXTO Y ALCANCE

La tabla `episodios` fue inyectada y validada en producción con RLS activo. Esta sesión ejecutó las **Fases 2, 3 y 4** del `plan_tecnico_podcast.md`:

- **Fase 2:** Creación de rutas públicas `/podcast/[episodio]/`
- **Fase 3:** Capa de servicios `podcast.ts`
- **Fase 4:** Refactorización de `/podcast/page.tsx` (eliminación de mocks)
- **Enmienda H-001:** Utilidad de sanitización de embeds

### Restricciones cumplidas

| Restricción | Estado |
|---|---|
| Sin `SERVICE_ROLE_KEY` en Server Actions web | ✅ |
| Sin modificación de base de datos | ✅ |
| Sin uploader de archivos | ✅ |
| Sin `SELECT *` — columnas explícitas | ✅ |
| URLs nunca inyectadas directamente en iframes | ✅ |

---

## 2. ARCHIVOS CREADOS Y MODIFICADOS

| # | Archivo | Acción | Propósito |
|---|---------|--------|-----------|
| 1 | `src/lib/services/podcast.ts` | NUEVO | Capa de servicios — tipo Episodio + 5 funciones |
| 2 | `src/lib/utils/embed.ts` | NUEVO | Enmienda H-001 — sanitizador de embeds |
| 3 | `src/app/podcast/[episodio]/page.tsx` | NUEVO | Detalle del episodio (Server Component) |
| 4 | `src/app/podcast/[episodio]/loading.tsx` | NUEVO | Skeleton de carga animado |
| 5 | `src/app/podcast/[episodio]/not-found.tsx` | NUEVO | Página 404 de episodio |
| 6 | `src/app/podcast/page.tsx` | REFACTORIZADO | Portada — mocks eliminados, consume Supabase |

---

## 3. CAPA DE SERVICIOS — `podcast.ts`

**Ruta:** `src/lib/services/podcast.ts`  
**Patrón seguido:** Idéntico a `blog.ts` y `colecciones.ts`

### Tipo Episodio (19 columnas explícitas)

```typescript
export type Episodio = {
  id: string                          // uuid, PK
  slug: string                        // text, NOT NULL, UNIQUE
  titulo: string                      // text, NOT NULL
  descripcion: string | null          // text
  tema_doctrinal: string | null       // text
  texto_biblico_base: string | null   // text
  participantes: string | null        // text
  audio_url: string | null            // text
  video_url: string | null            // text
  conferencia_fuente: string | null   // text
  extracto_referenciado: string | null // text
  duracion_minutos: number | null     // integer (> 0)
  numero_episodio: number | null      // integer (> 0)
  temporada: number                   // integer, NOT NULL, default 1
  published: boolean                  // boolean, NOT NULL, default false
  destacado: boolean                  // boolean, NOT NULL, default false
  fecha_publicacion: string | null    // date (como ISO string)
  created_at: string                  // timestamptz, NOT NULL
  updated_at: string                  // timestamptz, NOT NULL
}
```

### SELECT_COLUMNS (prohibido SELECT *)

```typescript
const SELECT_COLUMNS = `
  id, slug, titulo, descripcion, tema_doctrinal,
  texto_biblico_base, participantes, audio_url, video_url,
  conferencia_fuente, extracto_referenciado, duracion_minutos,
  numero_episodio, temporada, published, destacado,
  fecha_publicacion, created_at, updated_at
`
```

### Funciones implementadas

| Función | Tipo | Uso |
|---------|------|-----|
| `getEpisodioBySlug(slug)` | Pública | Detalle de episodio |
| `getAllEpisodios()` | Pública | Portada del podcast |
| `getEpisodioDestacado()` | Pública | Episodio destacado |
| `getAllEpisodiosAdmin()` | Admin (RLS) | Listado admin |
| `getEpisodioById(id)` | Admin (RLS) | Edición admin |

---

## 4. ENMIENDA DE SEGURIDAD H-001 — `embed.ts`

**Ruta:** `src/lib/utils/embed.ts`  
**Propósito:** Prevenir inyección de URLs maliciosas en iframes.

### Whitelist de proveedores

| Proveedor | Dominio de embed | Privacidad |
|-----------|-----------------|------------|
| YouTube | `youtube-nocookie.com` | ✅ Sin cookies de rastreo |
| Vimeo | `player.vimeo.com` | ✅ `dnt=1` |
| Spotify | `open.spotify.com/embed` | ✅ `theme=0` |
| iVoox | `ivoox.com/player_ej_` | Estándar |

### Flujo de sanitización

```
URL cruda → Validar contra regex → Extraer ID → Construir URL segura → Devolver EmbedResult
```

### Función principal

```typescript
export function sanitizeEmbedUrl(rawUrl: string | null | undefined): EmbedResult {
  // 1. Rechazar null/undefined/vacío
  // 2. Probar contra patrones YouTube (4 variantes)
  // 3. Probar contra patrones Vimeo (2 variantes)
  // 4. Probar contra patrones Spotify (2 variantes)
  // 5. Probar contra patrones iVoox (2 variantes)
  // 6. Si no coincide → { valid: false }
}
```

### Tipo de retorno

```typescript
export type EmbedResult = {
  valid: true
  provider: 'youtube' | 'vimeo' | 'spotify' | 'ivoox'
  embedUrl: string
} | {
  valid: false
  provider: null
  embedUrl: null
}
```

**Regla inquebrantable:** El componente `EmbedPlayer` en la página de detalle SOLO usa `result.embedUrl` (generado por la utilidad), NUNCA `ep.video_url` o `ep.audio_url` directamente.

---

## 5. RUTA PÚBLICA — `/podcast/[episodio]/`

### Estructura creada

```
src/app/podcast/[episodio]/
├── page.tsx       (Server Component — detalle del episodio)
├── loading.tsx    (Skeleton de carga animado)
└── not-found.tsx  (Página 404)
```

### Funcionalidades del detalle (`page.tsx`)

- **generateMetadata** dinámica con título y descripción del episodio.
- **Breadcrumbs:** `Podcast > [Título del episodio]`
- **Hero:** Temporada/episodio, tema doctrinal, título, descripción, metadatos (fecha, duración, participantes), texto bíblico base.
- **EmbedPlayer seguro:** Reproduce video (YouTube/Vimeo) o audio (Spotify/iVoox) usando `sanitizeEmbedUrl()`. Si ambos existen, muestra los dos.
- **Fallback:** Si las URLs no son embebibles pero existen, ofrece enlace externo.
- **Extracto referenciado:** Bloque visual si el campo tiene contenido.
- **Conferencia fuente:** Bloque con enlace al Archivo.
- **CTAs:** "Volver al Podcast" y "Explorar Archivo".

### Componente EmbedPlayer (código clave de seguridad)

```tsx
function EmbedPlayer({ url, titulo }: { url: string; titulo: string }) {
  const result = sanitizeEmbedUrl(url)  // ← H-001

  if (!result.valid) {
    return null  // NUNCA renderizar iframe si la URL no es válida
  }

  const iframeProps = getEmbedIframeProps(result.provider)

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ...`}>
      <iframe
        src={result.embedUrl}  // ← URL SEGURA, no la original
        title={`Reproductor: ${titulo}`}
        {...iframeProps}
      />
    </div>
  )
}
```

---

## 6. REFACTORIZACIÓN — `/podcast/page.tsx`

### Elementos eliminados

| Constante eliminada | Tipo | Líneas |
|---|---|---|
| `PODCAST_EPISODES` | Array mock de 6 episodios | ~60 líneas |
| `PODCAST_SERIES` | Array mock de 3 series | ~25 líneas |
| `PODCAST_METRICS` | Array mock de 3 métricas | ~15 líneas |
| `PodcastEpisode` | Tipo local | 8 líneas |
| `PodcastSeries` | Tipo local | 6 líneas |
| `PodcastMetric` | Tipo local | 5 líneas |

### Elementos añadidos

- Import de `getAllEpisodios` y `getEpisodioDestacado` desde `@/lib/services/podcast`.
- Conversión a `async function` Server Component.
- Métricas calculadas dinámicamente (`totalEpisodios`, `temporadas`).
- Links funcionales a `/podcast/[slug]` con botón "Escuchar episodio".
- Estado vacío ("Próximamente") si no hay episodios en la base de datos.

### Cambio clave (portada → datos reales)

```typescript
// ANTES (mock):
const featuredEpisode = PODCAST_EPISODES.find((item) => item.featured)

// DESPUÉS (Supabase):
const [allEpisodios, destacado] = await Promise.all([
  getAllEpisodios(),
  getEpisodioDestacado(),
])
const featuredEpisode = destacado ?? allEpisodios[0] ?? null
```

---

## 7. VERIFICACIÓN DE BUILD

```
▲ Next.js 16.1.6 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 7.0s
  Running TypeScript ...
  Collecting page data using 5 workers ...
✓ Generating static pages using 5 workers (15/15) in 505.0ms
  Finalizing page optimization ...

Route (app)
├ ƒ /podcast              ← REFACTORIZADO (datos Supabase)
└ ƒ /podcast/[episodio]   ← NUEVO (detalle con embed seguro)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

Exit code: 0
```

**TypeScript:** 0 errores  
**Warnings:** 0  
**Estado del build:** ✅ Limpio

---

## 8. RUTAS COMPLETAS DEL PROYECTO POST-EJECUCIÓN

```
Route (app)
├ ○ /
├ ○ /_not-found
├ ƒ /admin
├ ƒ /admin/blog
├ ƒ /admin/blog/[id]/editar
├ ○ /admin/blog/nuevo
├ ƒ /admin/conferencias
├ ƒ /admin/conferencias/[id]/editar
├ ○ /admin/conferencias/nueva
├ ƒ /admin/estudios
├ ƒ /admin/estudios/[id]/editar
├ ○ /admin/estudios/nueva
├ ƒ /api/health
├ ƒ /api/test-connection
├ ƒ /archivo
├ ƒ /archivo/[year]
├ ƒ /archivo/[year]/[month]
├ ƒ /archivo/busqueda
├ ƒ /archivo/sin-fecha
├ ƒ /blog
├ ƒ /blog/[slug]
├ ƒ /conferencia/[slug]
├ ○ /el-legado
├ ƒ /estudios
├ ƒ /estudios/[coleccion]
├ ƒ /login
├ ƒ /podcast              ← Refactorizado
└ ƒ /podcast/[episodio]   ← Nuevo
```

---

## 9. PENDIENTE (FASE 3 — CRUD ADMIN)

Los siguientes pasos del `plan_tecnico_podcast.md` quedan pendientes:

| Paso | Acción | Estado |
|---|---|---|
| 7 | Crear `/admin/podcast/page.tsx` | ⏳ Pendiente |
| 8 | Crear `/admin/podcast/nuevo/` (3 archivos) | ⏳ Pendiente |
| 9 | Crear `/admin/podcast/[id]/editar/` (3 archivos) | ⏳ Pendiente |
| 10 | Modificar `admin-sidebar.tsx` (+item "Podcast") | ⏳ Pendiente |
| 11 | Crear `scripts/seed_episodios.mjs` | ⏳ Pendiente |
| 12 | Ejecutar seed | ⏳ Pendiente |
| 13 | Pruebas manuales 4 rutas | ⏳ Pendiente |
| 14 | Build limpio final | ⏳ Pendiente |

---

## 10. DECLARACIÓN FORMAL

Se certifica que los 6 archivos creados/modificados en esta sesión cumplen con:

1. El `plan_tecnico_podcast.md` aprobado.
2. La Enmienda de Seguridad H-001.
3. Las restricciones de gobernanza del proyecto.
4. El Design System establecido (colores dorados, glassmorphism, tipografía Inter).
5. Los patrones de código de `blog.ts` y `colecciones.ts`.

**Antigravity AI**  
Agente de Ejecución Local — Proyecto Legado Patrimonial WSS  
6 de mayo de 2026
