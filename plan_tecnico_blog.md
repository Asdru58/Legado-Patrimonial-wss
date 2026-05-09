# PLAN TÉCNICO — SISTEMA DE BLOG

**Clasificación:** Plan de Implementación / Sometido a Auditoría  
**Fecha:** 14 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. OBJETIVO

Convertir el blog de una portada con datos mockeados a un sistema editorial completo, operado desde el panel admin, con artículos almacenados en Supabase y una ruta dinámica `/blog/[slug]` para su visualización pública.

---

## 2. FASE 1 — TABLA `articulos` EN SUPABASE

### Schema

```sql
CREATE TABLE public.articulos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    extracto TEXT,
    contenido TEXT NOT NULL,
    categoria TEXT,
    autor TEXT DEFAULT 'Legado Patrimonial WSS',
    fecha_publicacion DATE,
    tiempo_lectura TEXT,
    destacado BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice único en slug
CREATE UNIQUE INDEX articulos_slug_key ON public.articulos (slug);

-- Índice para listados públicos (solo publicados, más recientes primero)
CREATE INDEX articulos_published_fecha_idx
    ON public.articulos (published, fecha_publicacion DESC)
    WHERE published = true;

-- Formato de slug validado
ALTER TABLE public.articulos
ADD CONSTRAINT articulos_slug_format
CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
```

### Políticas RLS

Alineadas con el patrón existente en `conferencias`:

```sql
-- Lectura pública: solo artículos publicados
CREATE POLICY "articulos_select_published"
    ON public.articulos
    FOR SELECT
    USING (published = true);

-- CRUD completo para admin
CREATE POLICY "articulos_insert_admin"
    ON public.articulos
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "articulos_update_admin"
    ON public.articulos
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "articulos_delete_admin"
    ON public.articulos
    FOR DELETE
    USING (is_admin());

-- Habilitar RLS
ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;
```

### Diseño de columnas

| Columna | Tipo | Nullable | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `slug` | text | NO | — | URL amigable, único |
| `titulo` | text | NO | — | Título del artículo |
| `extracto` | text | SÍ | — | Resumen corto para tarjetas |
| `contenido` | text | NO | — | Cuerpo completo del artículo (markdown o HTML) |
| `categoria` | text | SÍ | — | Clasificación editorial libre |
| `autor` | text | SÍ | `'Legado Patrimonial WSS'` | Nombre del autor |
| `fecha_publicacion` | date | SÍ | — | Fecha editorial (puede diferir de created_at) |
| `tiempo_lectura` | text | SÍ | — | Estimado: "~5 min de lectura" |
| `destacado` | boolean | NO | `false` | Aparece en sección destacada |
| `published` | boolean | NO | `false` | Solo los publicados son visibles al público |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación del registro |
| `updated_at` | timestamptz | NO | `now()` | Última modificación |

### Notas de diseño

- **Sin sobreingeniería:** No se crean tablas de categorías, tags ni relaciones complejas. La categoría es un campo de texto libre.
- **`published` como puerta de control:** Permite redactar borradores sin que sean visibles al público.
- **`contenido` como texto:** Se almacena markdown. El frontend lo renderiza. Esto mantiene la edición simple desde el admin.
- **Sin FTS por ahora:** Si en el futuro se necesita búsqueda en artículos, se puede añadir una columna `fts tsvector` igual que en `conferencias`. No se implementa en esta fase.

---

## 3. FASE 2 — RUTA PÚBLICA `/blog/[slug]`

### Estructura de archivos

```
src/app/blog/
├── page.tsx                    # Portada del blog (se refactoriza para leer de Supabase)
└── [slug]/
    ├── page.tsx                # Detalle del artículo
    ├── loading.tsx             # Skeleton de carga
    └── not-found.tsx           # Artículo no encontrado
```

### Capa de datos desacoplada

Crear `src/lib/services/blog.ts`:

```typescript
import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type BlogPost = {
    id: string;
    slug: string;
    titulo: string;
    extracto: string | null;
    contenido: string;
    categoria: string | null;
    autor: string | null;
    fecha_publicacion: string | null;
    tiempo_lectura: string | null;
    destacado: boolean;
    published: boolean;
    created_at: string;
    updated_at: string;
};

/** Obtiene un artículo publicado por su slug */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null>

/** Obtiene todos los artículos publicados, ordenados por fecha */
export async function getAllBlogPosts(): Promise<BlogPost[]>

/** Obtiene el artículo destacado (el más reciente con destacado=true) */
export async function getFeaturedBlogPost(): Promise<BlogPost | null>

/** Obtiene artículos publicados por categoría */
export async function getBlogPostsByCategory(categoria: string): Promise<BlogPost[]>
```

### `/blog/[slug]/page.tsx`

- Server Component puro.
- Consume `getBlogPostBySlug(slug)`.
- Llama a `notFound()` si el artículo no existe o no está publicado.
- Genera metadata dinámica con `generateMetadata`.
- Renderiza el contenido markdown como HTML (usando una función de conversión simple o una librería ligera).
- Breadcrumbs: `Blog > [Título del artículo]`.
- Enlace "Volver al blog" al inicio.
- Design System respetado (dark, glass, dorado).

### Refactorización de `/blog/page.tsx`

La portada actual tiene los artículos mockeados como constantes. Se refactoriza para:

- Consumir `getAllBlogPosts()` y `getFeaturedBlogPost()` desde Supabase.
- Eliminar las constantes `BLOG_ARTICLES` del componente.
- Mantener la estructura visual exacta (no se rediseña la portada).

---

## 4. FASE 3 — CRUD ADMIN `/admin/blog`

### Estructura de archivos

```
src/app/admin/blog/
├── page.tsx                    # Listado de artículos (todos, incluidos borradores)
├── nuevo/
│   ├── page.tsx                # Formulario de creación
│   └── actions.ts              # Server Action para crear
└── [id]/
    └── editar/
        ├── page.tsx            # Formulario de edición
        └── actions.ts          # Server Action para editar
```

### Funcionalidades del CRUD

**Listado (`/admin/blog`):**
- Muestra todos los artículos (publicados y borradores).
- Columnas: título, categoría, fecha, estado (publicado/borrador), destacado.
- Enlace a editar cada uno.
- Botón "Nuevo artículo".

**Crear (`/admin/blog/nuevo`):**
- Formulario con campos: título, slug (autogenerado desde título, editable), extracto, contenido (textarea para markdown), categoría, autor, fecha de publicación, tiempo de lectura.
- Checkboxes: publicado, destacado.
- Server Action que inserta en Supabase usando `SERVICE_ROLE_KEY`.

**Editar (`/admin/blog/[id]/editar`):**
- Mismos campos que crear, precargados.
- Server Action que actualiza en Supabase.

### Patrón de referencia

La estructura replica exactamente el patrón ya existente en `/admin/conferencias`:
- `conferencias/page.tsx` → listado
- `conferencias/nueva/page.tsx` + `actions.ts` → crear
- `conferencias/[id]/editar/page.tsx` + `actions.ts` → editar

Esto garantiza consistencia y reduce riesgo de errores.

---

## 5. FASE 4 — MIGRACIÓN DE MOCKS

Los 6 artículos que hoy viven como constantes en `/blog/page.tsx` se migran como registros reales en la tabla `articulos`. Se crea un script simple `scripts/seed_articulos.mjs` que:

1. Lee los 6 artículos del mock.
2. Los inserta en Supabase vía SDK con `SERVICE_ROLE_KEY`.
3. Los marca como `published = true`.
4. Marca el primero como `destacado = true`.

Para el campo `contenido`, dado que los mocks solo tienen `excerpt` (extracto), se generará un contenido mínimo expandido o se dejará el extracto como contenido provisional hasta que se redacten los artículos completos.

---

## 6. ACTUALIZACIÓN DE TIPOS

Añadir el tipo `BlogPost` a `src/types/database.ts` o exportarlo desde `src/lib/services/blog.ts`. La segunda opción es preferible para mantener la consistencia con el patrón de `Conferencia` que se exporta desde `conferences.ts`.

---

## 7. ROL DE ANTIGRAVITY

### Autorizado
- Crear la tabla `articulos` en el SQL Editor de Supabase (o el Administrador la ejecuta directamente, como en R-3).
- Crear `src/lib/services/blog.ts` con las funciones de acceso.
- Crear `/blog/[slug]/page.tsx` con loading y not-found.
- Refactorizar `/blog/page.tsx` para consumir Supabase.
- Crear `/admin/blog/` con listado, crear y editar.
- Crear el script de seed.

### No autorizado
- Modificar la tabla `conferencias` ni ninguna tabla existente.
- Alterar la lógica del Archivo, PersistentPlayer o conferencias.
- Agregar dependencias al proyecto.
- Tomar decisiones de diseño fuera del Design System.

---

## 8. SECUENCIA DE IMPLEMENTACIÓN

| Paso | Acción | Ejecutor |
|---|---|---|
| 1 | Crear tabla `articulos` + RLS en SQL Editor | Administrador (Asdrúbal) en SQL Editor de Supabase |
| 2 | Crear `src/lib/services/blog.ts` | Antigravity |
| 3 | Crear `/blog/[slug]/page.tsx` + loading + not-found | Antigravity |
| 4 | Refactorizar `/blog/page.tsx` para consumir Supabase | Antigravity |
| 5 | Crear `/admin/blog/page.tsx` (listado) | Antigravity |
| 6 | Crear `/admin/blog/nuevo/` (crear) | Antigravity |
| 7 | Crear `/admin/blog/[id]/editar/` (editar) | Antigravity |
| 8 | Crear y ejecutar `scripts/seed_articulos.mjs` | Antigravity (solo archivos locales) + Administrador (ejecución) |
| 9 | Pruebas manuales: portada, detalle, admin, seed | Administrador |
| 10 | `npm run build` limpio | Antigravity |

---

## 9. CRITERIOS DE ÉXITO

| Criterio | Verificación |
|---|---|
| Tabla `articulos` existe con RLS activo | SQL Editor de Supabase |
| `/blog` muestra artículos desde Supabase (no mocks) | Inspección visual |
| `/blog/[slug]` renderiza artículo completo | Navegación funcional |
| `/blog/slug-inexistente` devuelve 404 | Prueba manual |
| `/admin/blog` lista artículos (publicados y borradores) | Login + navegación |
| Crear artículo desde admin y verlo en `/blog` | Flujo completo |
| Editar artículo desde admin | Flujo completo |
| Artículo con `published=false` no aparece en `/blog` | Verificación |
| Design System respetado | Inspección visual |
| `npm run build` limpio | Terminal |

---

## 10. EJECUCIÓN DE LA TABLA

El Paso 1 (crear tabla) lo ejecuta el Administrador en el SQL Editor de Supabase, igual que las intervenciones de R-3. El script SQL completo está en la Sección 2 de este documento. Se ejecuta en 3 bloques: tabla + índices, constraints, y políticas RLS.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
