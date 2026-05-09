# ORDEN DE EJECUCIÓN — PODCAST: FASE FINAL (CRUD ADMIN + SEED + CORRECCIONES)

**Proyecto:** Legado Patrimonial WSS  
**Fecha:** 7 de mayo de 2026  
**Emitida por:** Claude — Arquitecto de Software  
**Hallazgos incorporados:** Kimi 2.6 — Auditor Senior (H-004, H-005, OBS-005, H-001 en admin)  
**Dirigida a:** Antigravity — Agente de Ejecución Local  
**Autorización:** ✅ Aprobada por Administrador, Arquitecto y Auditor Senior

---

## CONTEXTO

El dictamen de Kimi 2.6 detectó 4 hallazgos que deben corregirse obligatoriamente junto con la fase final del CRUD admin. Esta orden unifica ambos frentes: correcciones de código existente + pasos 7-11 del plan técnico.

---

## PARTE A — CORRECCIONES OBLIGATORIAS (antes de construir el CRUD)

### CORRECCIÓN 1 — H-004: Regex de iVoox en `embed.ts`

**Archivo:** `src/lib/utils/embed.ts`

**Problema:** El patrón de iVoox puede estar truncado o incompleto. Las URLs reales de embed de iVoox usan formatos como:
- `https://www.ivoox.com/player_ej_12345678_2.html`
- `https://go.ivoox.com/rf/12345678`

**Acción obligatoria:**

1. Verificar que el regex capture correctamente el ID numérico de iVoox en todas sus variantes conocidas.
2. El regex debe extraer el ID numérico y construir la URL de embed completa con el sufijo correcto (ej: `_2.html`).
3. Probar mentalmente con al menos 3 URLs de ejemplo:
   - `https://www.ivoox.com/player_ej_12345678_2.html` → debe extraer `12345678`
   - `https://go.ivoox.com/rf/12345678` → debe extraer `12345678`
   - `https://www.ivoox.com/algun-podcast-s1234567.html` → debe extraer el ID si es embebible
4. Si el patrón actual solo usa `player_ej_` como cadena literal sin captura de ID, **eso es un bug**. Corregir el regex para que capture `(\d+)` y construya `https://www.ivoox.com/player_ej_${id}_2.html`.

**Entregable:** Mostrar el regex corregido y las URLs de prueba contra las que se validó.

---

### CORRECCIÓN 2 — H-005: Comentario incorrecto sobre Spotify en `embed.ts`

**Archivo:** `src/lib/utils/embed.ts`

**Problema:** El código o comentario clasifica `theme=0` de Spotify como medida de "Privacidad". Esto es técnicamente incorrecto. El parámetro `theme` de Spotify controla la apariencia visual (tema oscuro = 0, tema claro = 1), no la privacidad ni el rastreo.

**Acción obligatoria:**

1. Localizar el comentario o la tabla que menciona "Privacidad" en relación con Spotify `theme=0`.
2. Corregir la clasificación. Opciones aceptables:
   - Cambiar "Privacidad" a "Apariencia" o "Tema visual".
   - Si hay una tabla de proveedores con columna "Privacidad", cambiar el valor de Spotify a "Estándar" (como iVoox) y reservar "✅" solo para YouTube (`youtube-nocookie.com`) y Vimeo (`dnt=1`), que sí son medidas de privacidad reales.
3. Si `theme=0` se usa como query param en la URL de embed, puede mantenerse por coherencia visual con el Design System (dark mode). Solo se corrige la documentación, no la funcionalidad.

**Entregable:** Mostrar el comentario/tabla antes y después de la corrección.

---

### CORRECCIÓN 3 — OBS-005: Semántica de `getEpisodioDestacado()`

**Archivo:** `src/lib/services/podcast.ts`

**Problema:** Si múltiples episodios tienen `destacado = true`, la función retorna el primero que encuentre según el orden de la query, que puede ser impredecible o depender del orden de inserción.

**Acción obligatoria:**

1. Modificar `getEpisodioDestacado()` para que, ante múltiples episodios destacados, retorne el de `fecha_publicacion` más reciente.
2. Si `fecha_publicacion` es null en alguno, ese episodio queda último en prioridad.
3. El ORDER BY de la query debe ser explícito:

```typescript
// Semántica definida: el destacado más reciente por fecha de publicación
const { data } = await supabase
    .from('episodios')
    .select(SELECT_COLUMNS)
    .eq('published', true)
    .eq('destacado', true)
    .order('fecha_publicacion', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
```

4. Añadir JSDoc que documente la semántica:

```typescript
/**
 * Obtiene el episodio destacado más reciente por fecha de publicación.
 * Si hay múltiples destacados, retorna el de fecha_publicacion más reciente.
 * Si ninguno tiene fecha, retorna el primero por orden de inserción.
 */
```

**Entregable:** Mostrar la función corregida completa con JSDoc.

---

## PARTE B — CRUD ADMIN (Pasos 7-11 del plan técnico)

### PASO 7 — Crear `/admin/podcast/page.tsx`

Listado de todos los episodios (publicados + borradores).

**Columnas de la tabla:**
- Título (con slug debajo)
- Temporada / Episodio (ej: "T1 · E03")
- Tema doctrinal
- Estado (Publicado / Borrador)
- Destacado (⭐ Sí / —)
- Duración
- Acción (botón editar)

**Botón:** "+ NUEVO EPISODIO" → enlaza a `/admin/podcast/nuevo`.

**Patrón a replicar:** `/admin/blog/page.tsx` y `/admin/estudios/page.tsx`.

**Directiva:** `export const dynamic = 'force-dynamic'`.

---

### PASO 8 — Crear `/admin/podcast/nuevo/` (3 archivos)

**Estructura:**
```
src/app/admin/podcast/nuevo/
├── page.tsx           # Wrapper Server Component
├── crear-form.tsx     # Client Component con formulario
└── actions.ts         # Server Action para crear
```

**Secciones del formulario:**

**Sección 1 — Identificación:**
- Título* (input texto)
- Slug* (autogenerado desde título, editable manualmente)
- Número de episodio (input numérico, min=1)
- Temporada (input numérico, min=1, default=1)
- Fecha de publicación (input date)

**Sección 2 — Contenido doctrinal:**
- Tema doctrinal (input texto)
- Texto bíblico base (input texto, ej: "Apocalipsis 10:7")
- Participantes (textarea, ej: "Conductor: X · Expositor: Y")
- Conferencia fuente (input texto)
- Extracto referenciado (textarea)
- Descripción (textarea)

**Sección 3 — Media (URLs):**
- Audio URL (input texto)
- Video URL (input texto)
- Texto de ayuda debajo de cada campo: *"Pega la URL completa de YouTube, Vimeo, Spotify o iVoox. Solo se aceptan URLs de proveedores autorizados."*

**Sección 4 — Opciones:**
- Duración en minutos (input numérico, min=1)
- Publicar episodio (checkbox)
- Marcar como destacado (checkbox)

**Server Action `crearEpisodio()` en `actions.ts`:**

- Autenticación: `createClient()` del servidor + `getUser()` + verificar `app_metadata.role === 'admin'`.
- **NO `SERVICE_ROLE_KEY`.**
- `normalizeSlug()` (mismo patrón de Blog y Estudios).
- Validación obligatoria:
  - `titulo` no vacío (máx 300).
  - `slug` normalizado válido (regex `^[a-z0-9]+(-[a-z0-9]+)*$`).
  - Al menos `descripcion` o `tema_doctrinal` con contenido real.
  - `duracion_minutos` > 0 si se proporciona.
  - `numero_episodio` > 0 si se proporciona.
  - `temporada` >= 1.

**⚠️ CONDICIÓN H-001 OBLIGATORIA — Validación de URLs en Server Action:**

```typescript
import { validateMediaUrl } from '@/lib/utils/embed';

// Dentro de la validación de campos:
const videoUrlError = validateMediaUrl(video_url, 'video');
if (videoUrlError) {
    fieldErrors.video_url = videoUrlError;
}

const audioUrlError = validateMediaUrl(audio_url, 'audio');
if (audioUrlError) {
    fieldErrors.audio_url = audioUrlError;
}
```

Si `embed.ts` no exporta `validateMediaUrl`, crear la función equivalente que verifique la URL contra la whitelist y retorne un mensaje de error o null.

- Manejo de error 23505 para slug duplicado.
- Redirect a `/admin/podcast` tras éxito.

---

### PASO 9 — Crear `/admin/podcast/[id]/editar/` (3 archivos)

**Estructura:**
```
src/app/admin/podcast/[id]/editar/
├── page.tsx           # Wrapper con data loading
├── editar-form.tsx    # Client Component precargado
└── actions.ts         # Server Action para editar
```

- Misma estructura de formulario que crear, pero con `defaultValue` precargados.
- `params` como `Promise<{ id: string }>` (Next.js 16).
- `notFound()` si el episodio no existe.
- Server Action `editarEpisodio()` con UPDATE + `revalidatePath`.
- **⚠️ Misma validación H-001 de URLs que en crear.**

---

### PASO 10 — Modificar `admin-sidebar.tsx`

Añadir item "Podcast" al array `navItems`:

```typescript
{
    label: 'Podcast',
    href: '/admin/podcast',
    icon: (/* Ícono SVG de micrófono, radio o similar */),
}
```

Modificación mínima (+9-12 líneas). No tocar los demás items (Panel, Conferencias, Blog, Estudios).

---

### PASO 11 — Crear `scripts/seed_episodios.mjs`

- Migra los 6 episodios del mock original de `/podcast/page.tsx`.
- `upsert` con `onConflict: 'slug'` (idempotente).
- Todos con `published = true`, `temporada = 1`.
- Primer episodio con `destacado = true`.
- `numero_episodio` secuencial (1-6).
- `duracion_minutos` con valores del mock (42, 36, 31, 28, 39, 34).
- `audio_url` y `video_url` nulos en seed (se añadirán desde admin).
- Usa `SERVICE_ROLE_KEY` (excepción autorizada solo para seed local).

**El Administrador ejecutará el seed, no Antigravity.**

---

## PARTE C — VERIFICACIÓN FINAL

Tras completar las Partes A y B:

**V1 — Build limpio:**
```
npm run build
```
Exit code 0 obligatorio.

**V2 — Verificación de correcciones:**
- Mostrar regex corregido de iVoox (H-004).
- Mostrar comentario corregido de Spotify (H-005).
- Mostrar función `getEpisodioDestacado()` con ORDER BY explícito (OBS-005).
- Confirmar que ambas Server Actions (`nuevo/actions.ts` y `[id]/editar/actions.ts`) incluyen `validateMediaUrl` (H-001).

**V3 — Grep de seguridad:**
```
grep -rn "src={.*video_url\|src={.*audio_url" src/
```
Resultado esperado: **0 coincidencias**. Ningún componente debe usar URLs crudas en atributos `src`.

---

## ENTREGABLE FINAL

Antigravity entrega informe consolidado con:

1. **Parte A:** Correcciones H-004, H-005, OBS-005 con código antes/después.
2. **Parte B:** Archivos creados/modificados del CRUD admin con estructura y líneas.
3. **Parte C:** Resultados de V1, V2, V3.
4. Declaración formal: "Fase final completada. Correcciones de Kimi 2.6 aplicadas. Build limpio."

---

## RESTRICCIONES REITERADAS

- **NO** usar `SERVICE_ROLE_KEY` en Server Actions web.
- **NO** tocar base de datos, credenciales, configuración de Supabase.
- **NO** modificar Archivo, Blog, Estudios, Conferencias, PersistentPlayer.
- **NO** agregar dependencias nuevas.
- **NO** construir uploader de archivos.
- **NO** renderizar `video_url` ni `audio_url` crudos en atributos `src` de iframe.
- **NO** ejecutar el seed.
- **NO** reinterpretar alcance. Si hay ambigüedad, reportar y esperar.

---

**Aprobaciones:**

- Arquitecto (Claude): ✅
- Auditor Senior (Kimi 2.6): ✅ (condicionado a las 4 correcciones)
- Administrador (Abg. Asdrúbal Lira): ✅

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
