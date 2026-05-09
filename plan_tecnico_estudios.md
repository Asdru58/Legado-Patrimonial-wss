# PLAN TÉCNICO — SISTEMA DE ESTUDIOS

**Clasificación:** Plan de Implementación / Sometido a Auditoría  
**Fecha:** 15 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. OBJETIVO

Convertir el hub de estudios de una portada con 6 colecciones mockeadas a un sistema editorial completo, operado desde el panel admin, con colecciones almacenadas en Supabase y una ruta dinámica `/estudios/[coleccion]` para su visualización pública.

**Opción C confirmada:** Tabla nueva `colecciones` con contenido editorial completo, campo `serie_id` opcional para integración futura con la tabla `series` existente. No se modifica `series` ni se asignan conferencias en esta fase.

---

## 2. FASE 1 — TABLA `colecciones` EN SUPABASE

### Schema

```sql
CREATE TABLE public.colecciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    extracto TEXT,
    descripcion TEXT,
    contenido TEXT,
    categoria TEXT,
    orden_display INTEGER DEFAULT 0 NOT NULL,
    destacada BOOLEAN DEFAULT false NOT NULL,
    published BOOLEAN DEFAULT false NOT NULL,
    serie_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice único en slug
CREATE UNIQUE INDEX colecciones_slug_key
    ON public.colecciones (slug);

-- Índice para listados públicos
CREATE INDEX colecciones_published_orden_idx
    ON public.colecciones (published, orden_display, titulo)
    WHERE published = true;

-- Índice para futura integración relacional
CREATE INDEX colecciones_serie_id_idx
    ON public.colecciones (serie_id)
    WHERE serie_id IS NOT NULL;

-- Formato de slug validado
ALTER TABLE public.colecciones
ADD CONSTRAINT colecciones_slug_format
CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
```

### Diseño de columnas

| Columna | Tipo | Nullable | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `slug` | text | NO | — | URL amigable, único |
| `titulo` | text | NO | — | Nombre de la colección |
| `extracto` | text | SÍ | — | Resumen corto para tarjetas |
| `descripcion` | text | SÍ | — | Texto introductorio expandido |
| `contenido` | text | SÍ | — | Cuerpo editorial markdown de la colección |
| `categoria` | text | SÍ | — | Clasificación temática (ej: "Escatología") |
| `orden_display` | integer | NO | `0` | Control de orden en portada |
| `destacada` | boolean | NO | `false` | Aparece en sección destacada |
| `published` | boolean | NO | `false` | Visibilidad pública |
| `serie_id` | uuid | SÍ | — | FK opcional a `series` para integración futura |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última modificación |

### Trigger de `updated_at`

```sql
-- Reutiliza la función set_updated_at() que ya existe del sistema de blog
CREATE TRIGGER colecciones_set_updated_at
    BEFORE UPDATE ON public.colecciones
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
```

### Políticas RLS

```sql
ALTER TABLE public.colecciones ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo publicadas
CREATE POLICY "colecciones_select_published"
    ON public.colecciones FOR SELECT
    USING (published = true);

-- Lectura admin: todas, incluyendo borradores
CREATE POLICY "colecciones_select_admin"
    ON public.colecciones FOR SELECT
    USING (is_admin());

-- CRUD admin
CREATE POLICY "colecciones_insert_admin"
    ON public.colecciones FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "colecciones_update_admin"
    ON public.colecciones FOR UPDATE
    USING (is_admin());

CREATE POLICY "colecciones_delete_admin"
    ON public.colecciones FOR DELETE
    USING (is_admin());
```

### Notas de diseño

- **`serie_id` como FK nullable con ON DELETE SET NULL:** Si en el futuro se elimina una serie de la tabla `series`, la colección no se rompe — simplemente pierde el vínculo opcional.
- **No se modifica `series`:** En esta fase la tabla `series` queda intacta. Se limita a existir para futura integración.
- **`orden_display` como INTEGER:** Permite reordenar colecciones en portada sin depender de fechas. Valores por defecto de 0; se pueden editar desde el admin.
- **`destacada` independiente de `orden_display`:** Una colección puede estar destacada pero no ser la primera en orden.
- **`contenido` como markdown:** Mismo patrón que artículos del blog. Se renderiza con la función conservadora ya existente.

---

## 3. FASE 2 — RUTA PÚBLICA `/estudios/[coleccion]`

### Estructura de archivos

```
src/app/estudios/
├── page.tsx                    # Portada (se refactoriza para leer de Supabase)
└── [coleccion]/
    ├── page.tsx                # Detalle de colección
    ├── loading.tsx             # Skeleton de carga
    └── not-found.tsx           # Colección no encontrada
```

### Capa de datos desacoplada

Crear `src/lib/services/colecciones.ts` siguiendo el patrón de `blog.ts`:

```typescript
import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Coleccion = {
    id: string;
    slug: string;
    titulo: string;
    extracto: string | null;
    descripcion: string | null;
    contenido: string | null;
    categoria: string | null;
    orden_display: number;
    destacada: boolean;
    published: boolean;
    serie_id: string | null;
    created_at: string;
    updated_at: string;
};

/** Obtiene una colección publicada por su slug */
export async function getColeccionBySlug(slug: string): Promise<Coleccion | null>

/** Obtiene todas las colecciones publicadas, ordenadas */
export async function getAllColecciones(): Promise<Coleccion[]>

/** Obtiene colecciones destacadas */
export async function getColeccionesDestacadas(): Promise<Coleccion[]>

/** Obtiene todas las colecciones (admin, incluye borradores) */
export async function getAllColeccionesAdmin(): Promise<Coleccion[]>

/** Obtiene colección por id para edición admin */
export async function getColeccionById(id: string): Promise<Coleccion | null>
```

### `/estudios/[coleccion]/page.tsx`

- Server Component puro.
- Consume `getColeccionBySlug(coleccion)`.
- `notFound()` si la colección no existe o no está publicada.
- Metadata dinámica con `generateMetadata`.
- Renderiza el contenido markdown con la función `renderMarkdownToHtml` existente.
- Breadcrumbs: `Estudios > [Título de la colección]`.
- Secciones del detalle:
  - Hero con categoría, título, extracto
  - Contenido principal (descripción + contenido markdown)
  - Bloque "Conferencias relacionadas" **preparado pero deshabilitado en esta fase** (muestra mensaje "Próximamente" si `serie_id` existe; oculto si no)
  - CTA de retorno a Estudios

### Refactorización de `/estudios/page.tsx`

- Consumir `getAllColecciones()` y `getColeccionesDestacadas()` desde Supabase.
- Eliminar las constantes `STUDY_COLLECTIONS` mockeadas.
- Mantener la estructura visual exacta de la portada actual.

---

## 4. FASE 3 — CRUD ADMIN `/admin/estudios`

### Estructura de archivos

```
src/app/admin/estudios/
├── page.tsx                    # Listado de colecciones
├── nueva/
│   ├── page.tsx                # Formulario de creación
│   ├── crear-form.tsx          # Client Component
│   └── actions.ts              # Server Action crear
└── [id]/
    └── editar/
        ├── page.tsx            # Formulario de edición
        ├── editar-form.tsx     # Client Component
        └── actions.ts          # Server Action editar
```

### Funcionalidades del CRUD

**Listado (`/admin/estudios`):**
- Muestra todas las colecciones (publicadas y borradores).
- Columnas: título, categoría, estado (publicada/borrador), destacada, orden_display.
- Enlace a editar cada una.
- Botón "Nueva colección".

**Crear (`/admin/estudios/nueva`):**
- Campos: título, slug (autogenerado desde título, editable), extracto, descripción, contenido (markdown), categoría, orden_display.
- Checkboxes: publicada, destacada.
- Server Action usa cliente server + sesión + RLS + `is_admin()` (NO `SERVICE_ROLE_KEY`).

**Editar (`/admin/estudios/[id]/editar`):**
- Mismos campos precargados.
- Campo `serie_id` opcional oculto en esta fase (se activará cuando se aborde la integración con series).

### Actualización del sidebar admin

Añadir item "Estudios" al array `navItems` en `src/app/admin/admin-sidebar.tsx`. Ícono apropiado (book, library o similar de Heroicons).

### Patrón de referencia

Replicar exactamente la estructura de `/admin/blog`:
- Mismo `normalizeSlug`
- Mismas validaciones
- Mismo manejo de errores (código 23505 para slug duplicado)
- Mismas Server Actions con autenticación

---

## 5. FASE 4 — MIGRACIÓN DE MOCKS

Las 6 colecciones que hoy viven como constantes en `/estudios/page.tsx` se migran como registros reales en la tabla `colecciones`.

Script `scripts/seed_colecciones.mjs`:

1. Lee las 6 colecciones del mock original.
2. Las inserta en Supabase vía SDK con `SERVICE_ROLE_KEY`.
3. Las marca como `published = true`.
4. Marca las 2 primeras (`Las Siete Edades`, `Los Sellos`) como `destacada = true` (conservando el estado visual del mock).
5. Asigna `orden_display` secuencial (0, 1, 2, 3, 4, 5).

**Contenido inicial:** Como los mocks solo tenían `description` y no contenido expandido, el seed incluirá un contenido markdown mínimo por cada colección. Tú podrás editarlo desde el admin cuando tengas tiempo editorial.

**Idempotencia:** `upsert` con `onConflict: 'slug'` para que el script se pueda ejecutar múltiples veces sin crear duplicados.

---

## 6. ROL DE ANTIGRAVITY

### Autorizado
- Crear `src/lib/services/colecciones.ts`.
- Crear `/estudios/[coleccion]/page.tsx` con loading y not-found.
- Refactorizar `/estudios/page.tsx` para consumir Supabase.
- Crear `/admin/estudios/` completo (listado, crear, editar).
- Modificar `admin-sidebar.tsx` para añadir el item "Estudios" (modificación mínima).
- Crear `scripts/seed_colecciones.mjs`.

### No autorizado
- Modificar la tabla `series` existente.
- Asignar `serie_id` en conferencias existentes.
- Alterar lógica del Archivo, PersistentPlayer, Blog o conferencias.
- Agregar dependencias nuevas.

### Prohibido
- Usar `SERVICE_ROLE_KEY` en Server Actions web (solo autorizado en el seed).
- Hacer `SELECT *` fuera de la capa de servicios canónica.

---

## 7. SECUENCIA DE IMPLEMENTACIÓN

| Paso | Acción | Ejecutor |
|---|---|---|
| 1 | Crear tabla `colecciones` + trigger + RLS | Administrador (Asdrúbal) en SQL Editor |
| 2 | Crear `src/lib/services/colecciones.ts` | Antigravity |
| 3 | Crear `/estudios/[coleccion]/` (page + loading + not-found) | Antigravity |
| 4 | Refactorizar `/estudios/page.tsx` para consumir Supabase | Antigravity |
| 5 | Crear `/admin/estudios/` (listado) | Antigravity |
| 6 | Crear `/admin/estudios/nueva/` (crear) | Antigravity |
| 7 | Crear `/admin/estudios/[id]/editar/` (editar) | Antigravity |
| 8 | Modificar `admin-sidebar.tsx` (+item "Estudios") | Antigravity |
| 9 | Crear y ejecutar `scripts/seed_colecciones.mjs` | Antigravity (archivo) + Administrador (ejecución) |
| 10 | Pruebas manuales de las 4 rutas | Administrador |
| 11 | `npm run build` limpio | Antigravity |

---

## 8. CRITERIOS DE ÉXITO

| Criterio | Verificación |
|---|---|
| Tabla `colecciones` existe con RLS activo y trigger | SQL Editor |
| `/estudios` muestra las 6 colecciones desde Supabase | Inspección visual |
| `/estudios/las-siete-edades` renderiza contenido completo | Navegación |
| `/estudios/coleccion-inexistente` devuelve 404 | Prueba manual |
| `/admin/estudios` lista colecciones (publicadas y borradores) | Login + navegación |
| Crear colección desde admin y verla en `/estudios` | Flujo completo |
| Editar colección desde admin | Flujo completo |
| Colección con `published=false` no aparece en `/estudios` | Verificación |
| Design System respetado | Inspección visual |
| `npm run build` limpio | Terminal |
| Sidebar admin muestra "Estudios" | Inspección visual |

---

## 9. PUERTA ABIERTA A FUTURO

El campo `serie_id` en la tabla `colecciones` queda listo pero inactivo. Cuando el proyecto decida abordar la integración relacional con `series` y conferencias, la implementación será:

1. Poblar la tabla `series` con las 6 series editoriales (o equivalentes).
2. En `colecciones`, asignar `serie_id` correspondiente a cada una vía panel admin.
3. Asignar `serie_id` en conferencias (proyecto editorial separado).
4. Activar el bloque "Conferencias relacionadas" en `/estudios/[coleccion]/page.tsx` para mostrar conferencias de la serie vinculada.

Esa integración no forma parte de esta fase. Queda como proyecto editorial de continuidad.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
