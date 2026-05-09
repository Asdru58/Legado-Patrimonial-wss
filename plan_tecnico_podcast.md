# PLAN TÉCNICO — SISTEMA DE PODCAST

**Clasificación:** Plan de Implementación / Sometido a Auditoría  
**Fecha:** 24 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. DEFINICIÓN EDITORIAL (FIJADA POR EL AUDITOR)

**Podcast = estudio doctrinal pregrabado, en formato conversación guiada, entre 2 o 3 participantes, centrado en un tema bíblico-profético derivado de las conferencias del Dr. William Soto Santiago, con apoyo de extractos audiovisuales del propio Dr. William.**

Características del módulo:
- Contenido pregrabado, no en vivo.
- Máximo 3 participantes con roles definidos.
- 1 extracto del Dr. William por episodio (máximo 2).
- Duración estándar: 18–28 minutos. Especial: 30–40 minutos.
- Tono: reverente, claro, didáctico.
- No compite con Blog ni con Estudios: es diálogo doctrinal guiado.

---

## 2. DECISIONES ARQUITECTÓNICAS FIJADAS

| Decisión | Resolución |
|---|---|
| Almacenamiento de audio/video | Opción C — URLs de texto libre (YouTube, Spotify, iVoox, etc.) |
| Uploader en admin | ❌ No se construye. Solo campos de texto para pegar URL |
| Costo Supabase Storage | $0 — sin archivos propios en Supabase |
| Patrón de referencia | Tabla `conferencias` (audio_url, video_provider_id como texto) |

---

## 3. FASE 1 — TABLA `episodios` EN SUPABASE

### Schema

```sql
-- ============================================================
-- TABLA episodios — Fase 5.5 Podcast
-- Proyecto: Legado Patrimonial WSS
-- ============================================================

CREATE TABLE public.episodios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tema_doctrinal TEXT,
    texto_biblico_base TEXT,
    participantes TEXT,
    audio_url TEXT,
    video_url TEXT,
    conferencia_fuente TEXT,
    extracto_referenciado TEXT,
    duracion_minutos INTEGER,
    numero_episodio INTEGER,
    temporada INTEGER DEFAULT 1 NOT NULL,
    published BOOLEAN DEFAULT false NOT NULL,
    destacado BOOLEAN DEFAULT false NOT NULL,
    fecha_publicacion DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice único en slug
CREATE UNIQUE INDEX episodios_slug_key
    ON public.episodios (slug);

-- Índice para listados públicos
CREATE INDEX episodios_published_numero_idx
    ON public.episodios (published, temporada DESC, numero_episodio DESC)
    WHERE published = true;

-- Formato de slug validado
ALTER TABLE public.episodios
ADD CONSTRAINT episodios_slug_format
CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Validación de duración positiva
ALTER TABLE public.episodios
ADD CONSTRAINT episodios_duracion_positiva
CHECK (duracion_minutos IS NULL OR duracion_minutos > 0);

-- Validación de número de episodio positivo
ALTER TABLE public.episodios
ADD CONSTRAINT episodios_numero_positivo
CHECK (numero_episodio IS NULL OR numero_episodio > 0);
```

### Función y Trigger de `updated_at`

```sql
-- Reutiliza la función set_updated_at() que ya existe
-- CREATE OR REPLACE garantiza autosuficiencia
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER episodios_set_updated_at
    BEFORE UPDATE ON public.episodios
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
```

### Políticas RLS

```sql
ALTER TABLE public.episodios ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo episodios publicados
CREATE POLICY "episodios_select_published"
    ON public.episodios FOR SELECT
    USING (published = true);

-- Lectura admin: todos, incluidos borradores
CREATE POLICY "episodios_select_admin"
    ON public.episodios FOR SELECT
    USING (is_admin());

-- CRUD admin
CREATE POLICY "episodios_insert_admin"
    ON public.episodios FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "episodios_update_admin"
    ON public.episodios FOR UPDATE
    USING (is_admin());

CREATE POLICY "episodios_delete_admin"
    ON public.episodios FOR DELETE
    USING (is_admin());
```

### Diseño de columnas

| Columna | Tipo | Nullable | Default | Propósito |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `slug` | text | NO | — | URL amigable, único |
| `titulo` | text | NO | — | Título del episodio |
| `descripcion` | text | SÍ | — | Resumen editorial del episodio |
| `tema_doctrinal` | text | SÍ | — | Tema bíblico-profético central |
| `texto_biblico_base` | text | SÍ | — | Texto de referencia (ej: "Apocalipsis 10:7") |
| `participantes` | text | SÍ | — | Nombres y roles (texto libre, ej: "Conductor: X, Expositor: Y") |
| `audio_url` | text | SÍ | — | URL de audio en plataforma externa |
| `video_url` | text | SÍ | — | URL de video en plataforma externa (opcional) |
| `conferencia_fuente` | text | SÍ | — | Conferencia del Dr. William de referencia |
| `extracto_referenciado` | text | SÍ | — | Descripción del extracto usado |
| `duracion_minutos` | integer | SÍ | — | Duración en minutos (solo positivos) |
| `numero_episodio` | integer | SÍ | — | Número de episodio en la temporada |
| `temporada` | integer | NO | `1` | Número de temporada |
| `published` | boolean | NO | `false` | Visibilidad pública |
| `destacado` | boolean | NO | `false` | Episodio destacado en portada |
| `fecha_publicacion` | date | SÍ | — | Fecha editorial de publicación |
| `created_at` | timestamptz | NO | `now()` | Creación del registro |
| `updated_at` | timestamptz | NO | `now()` | Última modificación |

### Notas de diseño

- **Sin relación FK a `conferencias`:** `conferencia_fuente` es campo de texto libre. Evita complejidad de integridad referencial para una referencia editorial, no técnica.
- **`temporada` con default 1:** Permite organización futura por temporadas sin romper episodios actuales.
- **`numero_episodio` nullable:** Los primeros episodios pueden no tener numeración formal definida.
- **`audio_url` y `video_url` como texto libre:** Opción C — pegar URLs de YouTube, Spotify, iVoox, etc.
- **Sin `uploader`:** El formulario admin tiene solo campos `<input type="text">` para estas URLs.

---

## 4. FASE 2 — RUTA PÚBLICA `/podcast/[episodio]`

### Estructura de archivos

```
src/app/podcast/
├── page.tsx                    # Portada (refactorizar para leer de Supabase)
└── [episodio]/
    ├── page.tsx                # Detalle del episodio
    ├── loading.tsx             # Skeleton de carga
    └── not-found.tsx           # Episodio no encontrado
```

### Capa de datos desacoplada

Crear `src/lib/services/podcast.ts`:

```typescript
import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Episodio = {
    id: string;
    slug: string;
    titulo: string;
    descripcion: string | null;
    tema_doctrinal: string | null;
    texto_biblico_base: string | null;
    participantes: string | null;
    audio_url: string | null;
    video_url: string | null;
    conferencia_fuente: string | null;
    extracto_referenciado: string | null;
    duracion_minutos: number | null;
    numero_episodio: number | null;
    temporada: number;
    published: boolean;
    destacado: boolean;
    fecha_publicacion: string | null;
    created_at: string;
    updated_at: string;
};

/** Obtiene un episodio publicado por su slug */
export async function getEpisodioBySlug(slug: string): Promise<Episodio | null>

/** Obtiene todos los episodios publicados, ordenados por temporada y número DESC */
export async function getAllEpisodios(): Promise<Episodio[]>

/** Obtiene el episodio destacado */
export async function getEpisodioDestacado(): Promise<Episodio | null>

/** Obtiene todos los episodios (admin, incluye borradores) */
export async function getAllEpisodiosAdmin(): Promise<Episodio[]>

/** Obtiene episodio por id para edición admin */
export async function getEpisodioById(id: string): Promise<Episodio | null>
```

### `/podcast/[episodio]/page.tsx`

- Server Component puro.
- Consume `getEpisodioBySlug(episodio)`.
- `notFound()` si no existe o no está publicado.
- `generateMetadata` dinámica.
- Breadcrumbs: `Podcast > [Título del episodio]`.
- Secciones del detalle:
  - Hero con número de episodio, temporada, título, descripción.
  - Metadatos: tema doctrinal, texto bíblico, participantes, duración, conferencia fuente.
  - Reproductor embebido: si `video_url` existe, iframe embebido (YouTube/Vimeo). Si solo `audio_url`, enlace a plataforma externa.
  - Bloque "Extracto referenciado" si el campo tiene contenido.
  - CTA "Ver la conferencia completa en el Archivo" si `conferencia_fuente` está lleno.
  - Enlace "Volver al Podcast".

### Refactorización de `/podcast/page.tsx`

- Consumir `getAllEpisodios()` y `getEpisodioDestacado()` desde Supabase.
- Eliminar constantes mockeadas `PODCAST_EPISODES`, `PODCAST_SERIES`, `PODCAST_METRICS`.
- Mantener estructura visual exacta.

---

## 5. FASE 3 — CRUD ADMIN `/admin/podcast`

### Estructura de archivos

```
src/app/admin/podcast/
├── page.tsx                    # Listado de episodios
├── nuevo/
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

**Listado (`/admin/podcast`):**
- Todas las columnas: título, temporada/episodio, estado, destacado, duración.
- Botón "Nuevo episodio".
- Enlace editar cada uno.

**Crear / Editar:**
- Sección 1 — Identificación: título, slug (autogenerado, editable), número de episodio, temporada, fecha de publicación.
- Sección 2 — Contenido doctrinal: tema doctrinal, texto bíblico base, participantes, conferencia fuente, extracto referenciado, descripción.
- Sección 3 — Media (URLs): `audio_url` (input texto), `video_url` (input texto). Sin uploader. Con texto de ayuda: *"Pega la URL completa de YouTube, Spotify, iVoox o la plataforma donde esté alojado."*
- Sección 4 — Opciones: published, destacado, duración en minutos.

**Server Actions:**
- Autenticación: cliente server + sesión + RLS + `is_admin()`.
- **NO `SERVICE_ROLE_KEY`** en flujo web.
- `normalizeSlug` (mismo patrón de Blog y Estudios).
- Validación mínima: `titulo` no vacío, `slug` normalizado válido, y al menos `descripcion` o `tema_doctrinal` con contenido.
- Manejo de error 23505 para slug duplicado.

### Actualización del sidebar admin

Añadir item "Podcast" al array `navItems` en `src/app/admin/admin-sidebar.tsx`. Ícono apropiado (Mic, Radio o similar).

---

## 6. FASE 4 — MIGRACIÓN DE MOCKS

Script `scripts/seed_episodios.mjs`:

- Migra los 6 episodios mockeados de `podcast/page.tsx` como registros reales.
- Upsert con `onConflict: 'slug'` (idempotente).
- `published = true`, `temporada = 1`.
- Primer episodio con `destacado = true`.
- `numero_episodio` secuencial (1-6).
- `audio_url` y `video_url` nulos en seed inicial (las URLs reales se añaden desde el admin).
- `duracion_minutos` con los valores aproximados del mock (42, 36, 31, 28, 39, 34).
- Usa `SERVICE_ROLE_KEY` (excepción autorizada solo para seed local).

---

## 7. VALIDACIÓN EDITORIAL MÍNIMA (DIRECTRIZ DEL AUDITOR)

En ambas Server Actions (crear y editar):

```typescript
// Al menos titulo + (descripcion o tema_doctrinal)
if (!titulo) {
    fieldErrors.titulo = 'El título es obligatorio.'
}
if (!descripcion && !tema_doctrinal) {
    fieldErrors.descripcion = 'Al menos Descripción o Tema Doctrinal debe tener contenido.'
}
```

Esto evita episodios completamente vacíos aunque el schema sea flexible.

---

## 8. ROL DE ANTIGRAVITY

### Autorizado
- Crear `src/lib/services/podcast.ts`.
- Crear `/podcast/[episodio]/` (page + loading + not-found).
- Refactorizar `/podcast/page.tsx` para consumir Supabase.
- Crear `/admin/podcast/` completo (listado, crear, editar).
- Modificar `admin-sidebar.tsx` (+item "Podcast").
- Crear `scripts/seed_episodios.mjs`.

### No autorizado
- Tocar base de datos, credenciales, configuración Supabase.
- Alterar lógica de Archivo, Blog, Estudios, Conferencias, PersistentPlayer.
- Agregar dependencias nuevas.
- Construir uploader de archivos.

### Prohibido
- `SERVICE_ROLE_KEY` en Server Actions web.
- `SELECT *` fuera de la capa de servicios.

---

## 9. SECUENCIA DE IMPLEMENTACIÓN

| Paso | Acción | Ejecutor |
|---|---|---|
| 1 | Auditoría del plan | Auditor (ChatGPT) |
| 2 | Preparar y auditar SQL de `episodios` | Claude + ChatGPT |
| 3 | Ejecutar SQL en Supabase | Administrador (SQL Editor) |
| 4 | Crear `src/lib/services/podcast.ts` | Antigravity |
| 5 | Crear `/podcast/[episodio]/` (3 archivos) | Antigravity |
| 6 | Refactorizar `/podcast/page.tsx` | Antigravity |
| 7 | Crear `/admin/podcast/page.tsx` | Antigravity |
| 8 | Crear `/admin/podcast/nuevo/` (3 archivos) | Antigravity |
| 9 | Crear `/admin/podcast/[id]/editar/` (3 archivos) | Antigravity |
| 10 | Modificar `admin-sidebar.tsx` | Antigravity |
| 11 | Crear `scripts/seed_episodios.mjs` | Antigravity |
| 12 | Ejecutar seed | Administrador (terminal) |
| 13 | Pruebas manuales 4 rutas | Administrador |
| 14 | `npm run build` limpio | Antigravity |

---

## 10. CRITERIOS DE ÉXITO

| Criterio | Verificación |
|---|---|
| Tabla `episodios` existe con RLS activo y trigger | SQL Editor |
| `/podcast` muestra episodios desde Supabase | Inspección visual |
| `/podcast/[slug]` renderiza detalle completo | Navegación |
| `/podcast/slug-inexistente` devuelve 404 | Prueba manual |
| `/admin/podcast` lista episodios (publicados y borradores) | Login + navegación |
| Crear episodio desde admin | Flujo completo |
| Editar episodio desde admin | Flujo completo |
| Episodio `published=false` no visible en `/podcast` | Verificación |
| Design System respetado | Inspección visual |
| `npm run build` limpio | Terminal |
| Sidebar admin muestra "Podcast" | Inspección visual |
| Campos `audio_url` / `video_url` son inputs de texto (sin uploader) | Inspección formulario |

---

## 11. DOCUMENTO SQL SEPARADO

El SQL de creación de la tabla `episodios` se emitirá como documento separado para auditoría específica del Auditor, igual que se hizo con `articulos` y `colecciones`. Ese documento incluirá `CREATE OR REPLACE FUNCTION set_updated_at()` de forma autosuficiente.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
