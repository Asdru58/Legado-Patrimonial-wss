# INFORME DE EJECUCIÓN — FRONTEND ESTUDIOS (PASOS 2-9)

**Proyecto:** Legado Patrimonial WSS  
**Clasificación:** Informe de Ejecución / Solicitud de Dictamen  
**Fecha de ejecución:** 21 de abril de 2026  
**Última actualización:** 21 de abril de 2026 — Corrección de alineación de schema  
**Ejecutor:** Antigravity AI — Agente de Ejecución Local  
**Instrucción emitida por:** Claude — Arquitecto de Software  
**Aprobaciones pre-ejecución:** Arquitecto (Claude) ✅ · Auditor (ChatGPT) ✅ · Administrador (Abg. Asdrúbal Lira) ✅  
**Dirigido a:** ChatGPT — Auditor de Código y Base de Datos  
**Conocimiento:** Abg. Asdrúbal Lira — Administrador del Proyecto

---

## ÍNDICE

1. [Contexto y Objetivo](#1-contexto-y-objetivo)
2. [Resumen Ejecutivo](#2-resumen-ejecutivo)
3. [Detalle de Ejecución por Paso](#3-detalle-de-ejecución-por-paso)
4. [Cumplimiento de Directrices de Seguridad](#4-cumplimiento-de-directrices-de-seguridad)
5. [Paridad de Patrones con Módulo Blog](#5-paridad-de-patrones-con-módulo-blog)
6. [Inventario de Cambios](#6-inventario-de-cambios)
7. [Rutas Registradas en Build](#7-rutas-registradas-en-build)
8. [Validación Final](#8-validación-final)
9. [Pendientes Fuera de Alcance](#9-pendientes-fuera-de-alcance)
10. [Solicitud al Auditor](#10-solicitud-al-auditor)
11. [Addendum: Corrección de Alineación de Schema (21-04-2026)](#11-addendum-corrección-de-alineación-de-schema-21-04-2026)

---

## 1. Contexto y Objetivo

El plan técnico del Arquitecto definió 9 pasos para la implementación del módulo **Estudios** (gestión de colecciones temáticas). El paso 1 correspondía a infraestructura de base de datos (tabla `colecciones`, fuera del alcance de Antigravity). Los pasos 2-9 corresponden a la capa frontend y fueron asignados a Antigravity para ejecución.

**Objetivo:** Crear la infraestructura frontend completa del módulo Estudios, replicando estrictamente los patrones de seguridad y diseño ya establecidos en el módulo Blog, sin tomar decisiones arquitectónicas autónomas.

---

## 2. Resumen Ejecutivo

| Paso | Descripción | Estado |
|------|-------------|--------|
| 2 | Capa de servicio `colecciones.ts` | ✅ Completado |
| 3 | Ruta pública `/estudios/[coleccion]/page.tsx` | ✅ Completado |
| 4 | Refactorizar `/estudios/page.tsx` (mock → Supabase) | ✅ Completado |
| 5 | Admin listado `/admin/estudios/page.tsx` | ✅ Completado |
| 6 | Admin crear y editar (formas + páginas) | ✅ Completado |
| 7 | Server Actions con sesión + RLS + `is_admin()` | ✅ Completado |
| 8 | Validación editorial + `normalizeSlug` + error 23505 | ✅ Completado |
| 9 | Item "Estudios" en `admin-sidebar.tsx` | ✅ Completado |
| 9b | Script `seed_colecciones.mjs` | ✅ Creado (no ejecutado) |
| Cierre | Build de producción limpio | ✅ `next build` exit code 0 |

**Archivos creados:** 10  
**Archivos modificados:** 2  
**Dependencias nuevas añadidas:** 0  
**Modificaciones al schema de base de datos:** 0  
**Uso de `SERVICE_ROLE_KEY` en flujo web:** 0

---

## 3. Detalle de Ejecución por Paso

### PASO 2 — Capa de servicio: `src/lib/services/colecciones.ts`

Se creó la capa desacoplada de acceso a datos para la tabla `colecciones`, siguiendo el mismo patrón de `src/lib/services/blog.ts`.

**Características implementadas:**
- Directiva `import 'server-only'` — impide importación desde Client Components
- Tipo `Coleccion` exportado con **13 campos** alineados exactamente al schema de Fase 1
- Constante `SELECT_COLUMNS` — evita `SELECT *`, protege contra campos futuros
- 5 funciones de consulta:

| Función | Uso | RLS |
|---------|-----|-----|
| `getColeccionBySlug(slug)` | Detalle público | Solo `published=true` |
| `getAllColecciones()` | Hub público | Solo `published=true`, orden por `orden_display` |
| `getFeaturedColecciones()` | Destacadas | Solo `published=true` + `destacada=true` |
| `getAllColeccionesAdmin()` | Listado admin | Requiere policy admin |
| `getColeccionById(id)` | Edición admin | Requiere policy admin |

---

### PASO 3 — Ruta pública: `src/app/estudios/[coleccion]/page.tsx`

Server Component para el detalle de una colección.

- Usa `getColeccionBySlug()` de la capa de servicio
- Llama `notFound()` de Next.js si el slug no existe o no está publicado
- Incluye placeholder visual para la sección de conferencias vinculadas — **SIN queries a la tabla `conferencias`** (según instrucción explícita del Arquitecto)
- Respeta el Design System existente (Cormorant + DM Sans, palette #C8A843, backgrounds oscuros)

---

### PASO 4 — Refactorización: `src/app/estudios/page.tsx`

Se reemplazó el consumo de datos mock por consultas reales a Supabase.

- Import de `getAllColecciones()` desde la capa de servicio
- Renderizado dinámico (`export const dynamic = 'force-dynamic'`) eliminado a favor de comportamiento por defecto de Next.js
- **Diseño visual intacto** — cero modificaciones al DS

---

### PASO 5 — Admin listado: `src/app/admin/estudios/page.tsx`

Server Component para el inventario administrativo de colecciones.

- Replica exactamente el patrón de `/admin/blog/page.tsx`
- Tabla con 5 columnas: Título (+ slug), Categoría, Estado (Published/Draft con dot indicators), Destacada, Acción (editar)
- Empty state con icono BookOpen cuando no hay colecciones
- Botón "Nueva Colección" con enlace a `/admin/estudios/nueva`
- `export const dynamic = 'force-dynamic'`
- **Líneas de código:** 299

---

### PASO 6 — Admin CRUD (Crear + Editar)

#### Crear: `/admin/estudios/nueva/`

3 archivos creados:

| Archivo | Tipo | Líneas |
|---------|------|--------|
| `page.tsx` | Server Component (shell) | ~40 |
| `crear-form.tsx` | Client Component (formulario) | ~280 |
| `actions.ts` | Server Action | 148 |

#### Editar: `/admin/estudios/[id]/editar/`

3 archivos creados:

| Archivo | Tipo | Líneas |
|---------|------|--------|
| `page.tsx` | Server Component (carga datos + `notFound()`) | ~55 |
| `editar-form.tsx` | Client Component (formulario prellenado) | ~310 |
| `actions.ts` | Server Action | 168 |

**Campos del formulario (alineados a schema Fase 1):** título, slug (con normalización automática), extracto, descripción, contenido, categoría, orden de presentación, publicado (toggle), destacada (toggle).

---

### PASO 7 — Server Actions con Sesión + RLS

Ambas Server Actions (`crearColeccion` y `editarColeccion`) implementan:

1. **Autenticación:** `supabase.auth.getUser()` — verifica sesión activa
2. **Autorización:** `user.app_metadata.role === 'admin'` — verifica rol
3. **Delegación a RLS:** El INSERT/UPDATE se ejecuta con el cliente SSR del usuario. La policy `is_admin()` valida la operación a nivel de base de datos
4. **Cero uso de `SERVICE_ROLE_KEY`** — se confirma con la siguiente evidencia:

```
Búsqueda: "SERVICE_ROLE" en src/app/admin/estudios/
Resultado: 0 coincidencias
```

---

### PASO 8 — Validación Editorial

**Implementado en ambas actions:**

| Control | Implementación |
|---------|---------------|
| Campos obligatorios | `titulo` y `slug` requeridos |
| Contenido editorial mínimo | Al menos uno de `extracto`, `descripcion` o `contenido` debe tener texto |
| Longitud máx. título | 300 caracteres |
| Longitud máx. slug | 300 caracteres |
| Longitud máx. extracto | 500 caracteres |
| Longitud máx. descripción | 2,000 caracteres |
| Longitud máx. contenido | 50,000 caracteres |
| Longitud máx. categoría | 100 caracteres |
| Formato slug | Regex `/^[a-z0-9]+(-[a-z0-9]+)*$/` |
| `normalizeSlug()` | NFD → strip diacritics → lowercase → collapse hyphens (misma implementación del blog) |
| Error 23505 | Slug duplicado capturado y devuelto como `fieldErrors.slug` |
| UUID validation | En `editarColeccion`: regex valida formato del ID antes del UPDATE |
| `orden_display` | Parseo seguro: `parseInt` con fallback a `null` para valores no numéricos o negativos |

---

### PASO 9 — Sidebar administrativo

Se añadió el item "Estudios" en `src/app/admin/admin-sidebar.tsx`:

```diff
  navItems: [
    Dashboard,
    Conferencias,
    Blog,
+   Estudios (icono: BookOpen / libro abierto)
  ]
```

- Href: `/admin/estudios`
- Icono: SVG BookOpen (Heroicons outline, `strokeWidth={1.4}`)
- Highlight activo: misma lógica `pathname.startsWith(href)` del resto de items

---

### PASO 9b — Script seed: `scripts/seed_colecciones.mjs`

- Usa SDK oficial `@supabase/supabase-js` con `SERVICE_ROLE_KEY` (conforme al contexto de scripts de seed, NO en flujo web)
- Operación: `upsert` con `onConflict: 'slug'` — idempotente
- Datos: colecciones representativas del catálogo
- **Estado: CREADO pero NO EJECUTADO** — inhibido por directriz del Auditor (requiere aprobación antes de tocar datos de producción)
- **Líneas de código:** ~130

---

## 4. Cumplimiento de Directrices de Seguridad

| Directriz (Protocolo de Gobernanza Art. 2-3) | Estado | Evidencia |
|-----------------------------------------------|--------|-----------|
| Server Actions usan sesión + RLS + `is_admin()` | ✅ Cumplido | `getUser()` + `app_metadata.role` + delegación a RLS en ambas actions |
| Prohibido `SERVICE_ROLE_KEY` en flujo web | ✅ Cumplido | 0 ocurrencias en `src/app/admin/estudios/**` |
| `normalizeSlug()` reutilizado del patrón blog | ✅ Cumplido | Misma implementación character-by-character |
| Error `23505` (slug duplicado) manejado | ✅ Cumplido | En `crearColeccion` y `editarColeccion` |
| Validación editorial mínima obligatoria | ✅ Cumplido | Título y slug requeridos, longitudes validadas |
| `notFound()` en rutas dinámicas | ✅ Cumplido | En `[coleccion]/page.tsx` y `[id]/editar/page.tsx` |
| Placeholder conferencias SIN queries a conferencias | ✅ Cumplido | Componente visual puro, sin SELECT a tabla conferencias |
| No se tomaron decisiones arquitectónicas autónomas | ✅ Cumplido | Replicación estricta del patrón blog |
| No se modificó el schema de base de datos | ✅ Cumplido | 0 archivos SQL creados o modificados |
| No se añadieron dependencias nuevas | ✅ Cumplido | 0 entradas nuevas en package.json |

---

## 5. Paridad de Patrones con Módulo Blog

El módulo Estudios fue construido como réplica estructural del módulo Blog. La siguiente tabla documenta la correspondencia:

| Elemento | Blog | Estudios |
|----------|------|----------|
| Capa de servicio | `src/lib/services/blog.ts` | `src/lib/services/colecciones.ts` |
| Tipo exportado | `BlogPost` | `Coleccion` |
| `SELECT_COLUMNS` explícito | ✅ | ✅ |
| `import 'server-only'` | ✅ | ✅ |
| Admin listado | `/admin/blog/page.tsx` | `/admin/estudios/page.tsx` |
| Admin crear | `/admin/blog/nuevo/` | `/admin/estudios/nueva/` |
| Admin editar | `/admin/blog/[id]/editar/` | `/admin/estudios/[id]/editar/` |
| Server Action crear | `crearArticulo` | `crearColeccion` |
| Server Action editar | `editarArticulo` | `editarColeccion` |
| `normalizeSlug()` | ✅ | ✅ (misma implementación) |
| Error 23505 handling | ✅ | ✅ |
| Seed script | `scripts/seed_articulos.mjs` | `scripts/seed_colecciones.mjs` |
| `onConflict: 'slug'` | ✅ | ✅ |
| Client SSR (no SERVICE_ROLE) | ✅ | ✅ |

---

## 6. Inventario de Cambios

### Archivos creados (10)

| # | Archivo | Tipo | Paso | Líneas |
|---|---------|------|------|--------|
| 1 | `src/lib/services/colecciones.ts` | Capa de servicio | 2 | 155 |
| 2 | `src/app/estudios/[coleccion]/page.tsx` | Server Component (público) | 3 | ~200 |
| 3 | `src/app/admin/estudios/page.tsx` | Server Component (admin listado) | 5 | 299 |
| 4 | `src/app/admin/estudios/nueva/actions.ts` | Server Action: crear | 6-8 | 148 |
| 5 | `src/app/admin/estudios/nueva/crear-form.tsx` | Client Component: form crear | 6 | ~280 |
| 6 | `src/app/admin/estudios/nueva/page.tsx` | Página crear colección | 6 | ~40 |
| 7 | `src/app/admin/estudios/[id]/editar/actions.ts` | Server Action: editar | 6-8 | 168 |
| 8 | `src/app/admin/estudios/[id]/editar/editar-form.tsx` | Client Component: form editar | 6 | ~310 |
| 9 | `src/app/admin/estudios/[id]/editar/page.tsx` | Página editar colección | 6 | ~55 |
| 10 | `scripts/seed_colecciones.mjs` | Script seed (no ejecutado) | 9b | ~130 |

### Archivos modificados (2)

| # | Archivo | Cambio | Paso |
|---|---------|--------|------|
| 1 | `src/app/admin/admin-sidebar.tsx` | Añadido item "Estudios" con icono BookOpen | 9 |
| 2 | `src/app/estudios/page.tsx` | Refactorizado: datos mock → Supabase real | 4 |

### Archivos NO modificados (cumplimiento de restricciones)

- `package.json` — 0 dependencias nuevas
- `middleware.ts` — Sin cambios
- Toda la infraestructura SQL — Sin cambios
- Todo el módulo Blog — Sin cambios
- Todo el módulo Archivo — Sin cambios
- Todos los componentes UI reutilizables — Sin cambios

---

## 7. Rutas Registradas en Build

```
├ ƒ /admin/estudios                ← Listado admin (dynamic)
├ ƒ /admin/estudios/[id]/editar    ← Edición admin (dynamic)
├ ○ /admin/estudios/nueva          ← Creación admin (static shell)
├ ƒ /estudios                      ← Hub público (dynamic)
├ ƒ /estudios/[coleccion]          ← Detalle público (dynamic)
```

---

## 8. Validación Final

### Build de producción

```
npm run build → Exit code: 0
✓ Compiled successfully
✓ Generating static pages
0 errores, 0 warnings
```

### Seed

```
Estado: NO EJECUTADO
Motivo: Directriz del Auditor — requiere aprobación previa para 
        cualquier operación que toque datos de producción.
```

---

## 9. Pendientes Fuera de Alcance

Los siguientes puntos quedan documentados como pendientes. **Ninguno fue ejecutado ni intentado**, en cumplimiento del protocolo de gobernanza:

| Pendiente | Responsable | Bloqueado por |
|-----------|-------------|---------------|
| Ejecución del seed (`node scripts/seed_colecciones.mjs`) | Antigravity (ejecutor) | Aprobación del Auditor |
| Vinculación real de conferencias a colecciones | Próxima fase | Diseño del Arquitecto |
| Eliminación de colecciones (Server Action delete) | Próxima fase | Plan técnico pendiente |

> **Nota aclaratoria (21-04-2026):** Las policies RLS para la tabla `colecciones` (lectura pública, lectura admin, inserción, actualización y eliminación) ya fueron creadas, habilitadas y auditadas exitosamente durante la **Fase 1** mediante SQL directo en Supabase. La infraestructura de seguridad de la base de datos está 100% cerrada. Este item fue descartado como pendiente por aclaratoria directa del Administrador del Proyecto.

---

## 10. Solicitud al Auditor

Se solicita al Auditor:

1. **Dictamen de conformidad** sobre la implementación de los Pasos 2-9, verificando que los patrones de seguridad cumplen con el protocolo de gobernanza vigente.

2. **Revisión de Server Actions** — Confirmar que el patrón de autenticación/autorización implementado (sesión + `app_metadata.role` + delegación a RLS) es consistente con lo aprobado en el módulo Blog.

3. **Autorización para ejecución del seed** — El script `scripts/seed_colecciones.mjs` está listo pero requiere visto bueno antes de insertar datos en producción.

4. **Observaciones sobre la capa de servicio** — Confirmar que la estructura de `colecciones.ts` (tipo exportado, `SELECT_COLUMNS`, `'server-only'`) cumple con los estándares de calidad exigidos.

> **Nota:** El punto originalmente listado como #5 ("Indicaciones sobre policies RLS") ha sido descartado. El Administrador del Proyecto confirma que las policies RLS de la tabla `colecciones` fueron creadas, habilitadas y auditadas durante la Fase 1. La infraestructura de seguridad DB está cerrada.

---

## 11. Addendum: Corrección de Alineación de Schema (21-04-2026)

Se detectó y corrigió una **desviación crítica de schema** entre la implementación frontend y las 13 columnas reales de la tabla `colecciones` creada en Fase 1.

### Schema real de Fase 1 (13 columnas):
`id, slug, titulo, extracto, descripcion, contenido, categoria, orden_display, destacada, published, serie_id, created_at, updated_at`

### Campos eliminados (no existen en la tabla):
- ❌ `periodo` — Eliminado de tipo, formularios, actions, seed y vistas públicas
- ❌ `total_materiales` — Eliminado de tipo, formularios, actions, seed y vistas públicas

### Campos añadidos (existían en tabla pero faltaban en frontend):
- ✅ `extracto` (text) — Resumen corto para tarjetas de vista previa
- ✅ `contenido` (text) — Cuerpo rico de la colección
- ✅ `orden_display` (integer) — Orden visual de presentación
- ✅ `serie_id` (uuid, FK) — Referencia a series (presente en tipo, no en formularios por ahora)

### Renombramiento:
- ✅ `destacado` → `destacada` — Corregido en todos los archivos del módulo Estudios

### Archivos corregidos (9):

| # | Archivo | Cambio principal |
|---|---------|------------------|
| 1 | `src/lib/services/colecciones.ts` | Tipo + SELECT_COLUMNS a 13 columnas |
| 2 | `src/app/admin/estudios/nueva/actions.ts` | INSERT alineado + validación editorial |
| 3 | `src/app/admin/estudios/[id]/editar/actions.ts` | UPDATE alineado + validación editorial |
| 4 | `src/app/admin/estudios/nueva/crear-form.tsx` | Campos de formulario reemplazados |
| 5 | `src/app/admin/estudios/[id]/editar/editar-form.tsx` | Campos de formulario reemplazados |
| 6 | `src/app/admin/estudios/page.tsx` | Columna "Materiales" eliminada, `destacada` |
| 7 | `src/app/estudios/page.tsx` | Stats y cards alineados |
| 8 | `src/app/estudios/[coleccion]/page.tsx` | Hero alineado |
| 9 | `scripts/seed_colecciones.mjs` | Objetos seed alineados |

### Validación de limpieza:
- `grep total_materiales src/` → **0 resultados**
- `grep \.periodo src/` → **0 resultados**
- `grep destacado src/` → Solo coincidencias del módulo **Blog** (correcto, tabla `articulos` usa `destacado`)

### Nueva validación editorial implementada:
> Al menos uno de `extracto`, `descripcion` o `contenido` debe tener texto real.

### Build post-corrección:
```
npm run build → Exit code: 0
✓ Compiled successfully
✓ TypeScript — 0 errores
✓ Generating static pages (16/16)
```

---

**Antigravity AI**  
Agente de Ejecución Local — Proyecto Legado Patrimonial WSS  
21 de abril de 2026

---

**Tipo `Coleccion` Exportado (referencia actualizada — 13 columnas Fase 1):**

```typescript
export type Coleccion = {
  id: string                  // uuid, PK
  slug: string                // text, UNIQUE
  titulo: string              // text, NOT NULL
  extracto: string | null     // text, resumen corto
  descripcion: string | null  // text, descripción extendida
  contenido: string | null    // text, cuerpo rico
  categoria: string | null    // text
  orden_display: number | null // integer, orden visual
  destacada: boolean          // boolean, default false
  published: boolean          // boolean, default false
  serie_id: string | null     // uuid, FK a series
  created_at: string          // timestamptz
  updated_at: string          // timestamptz
}
```
