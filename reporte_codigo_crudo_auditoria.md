# REPORTE DE CÓDIGO CRUDO — CORRECCIÓN DE SCHEMA ESTUDIOS

**Generado para:** Arquitecto (Claude) — Auditoría de fragmentos  
**Fecha:** 21 de abril de 2026  
**Origen:** `src/lib/services/colecciones.ts`, Server Actions, formularios, seed  
**Contexto:** Corrección de desviación crítica de schema (13 columnas Fase 1)

---

## 1. Tipo `Coleccion` — Código completo

> **Archivo:** `src/lib/services/colecciones.ts` — Líneas 21-35

```typescript
export type Coleccion = {
  id: string                  // uuid, PK
  slug: string                // text, UNIQUE
  titulo: string              // text, NOT NULL
  extracto: string | null     // text, resumen corto
  descripcion: string | null  // text, descripción extendida
  contenido: string | null    // text, cuerpo rico (markdown/HTML)
  categoria: string | null    // text
  orden_display: number | null // integer, orden visual
  destacada: boolean          // boolean, default false
  published: boolean          // boolean, default false
  serie_id: string | null     // uuid, FK a series
  created_at: string          // timestamptz
  updated_at: string          // timestamptz
}
```

---

## 2. `SELECT_COLUMNS` — Constante exacta

> **Archivo:** `src/lib/services/colecciones.ts` — Líneas 38-52

```typescript
const SELECT_COLUMNS = `
  id,
  slug,
  titulo,
  extracto,
  descripcion,
  contenido,
  categoria,
  orden_display,
  destacada,
  published,
  serie_id,
  created_at,
  updated_at
`
```

---

## 3. Formularios — Campos eliminados y campos nuevos

### Campos eliminados

| Campo eliminado | Tipo HTML | Motivo |
|-----------------|-----------|--------|
| `periodo` | `<input type="text">` | No existe en tabla `colecciones` |
| `total_materiales` | `<input type="number">` | No existe en tabla `colecciones` |
| `destacado` (name) | `<input type="checkbox">` | Renombrado a `destacada` |

### Campos nuevos — Fragmento de renderizado (`crear-form.tsx`, líneas 180-245)

```tsx
<div>
  <label htmlFor="orden_display" className={labelClass}>
    Orden de presentación
  </label>
  <input
    id="orden_display"
    name="orden_display"
    type="number"
    min="0"
    placeholder="Ej. 1 (menor = primero)"
    disabled={isPending}
    className={inputClass}
  />
  <FieldError message={state?.fieldErrors?.orden_display} />
</div>

{/* ─── Sección "Contenido editorial" ─── */}

<SectionLabel>Contenido editorial</SectionLabel>
<p className="font-[family-name:var(--font-dm-sans)] text-xs text-white/40 mb-5 -mt-2">
  Al menos uno de los siguientes campos debe contener texto.
</p>

<div>
  <label htmlFor="extracto" className={labelClass}>
    Extracto
  </label>
  <textarea
    id="extracto"
    name="extracto"
    maxLength={LIMITS.extracto}
    placeholder="Resumen corto que aparece en tarjetas de vista previa (máx. 500 caracteres)"
    disabled={isPending}
    className={textareaClass}
  />
  <FieldError message={state?.fieldErrors?.extracto} />
</div>

<div>
  <label htmlFor="descripcion" className={labelClass}>
    Descripción
  </label>
  <textarea
    id="descripcion"
    name="descripcion"
    maxLength={LIMITS.descripcion}
    placeholder="Descripción extendida de la colección (aparece en la página de detalle)"
    disabled={isPending}
    className={textareaClass}
  />
  <FieldError message={state?.fieldErrors?.descripcion} />
</div>

<div>
  <label htmlFor="contenido" className={labelClass}>
    Contenido
  </label>
  <textarea
    id="contenido"
    name="contenido"
    maxLength={LIMITS.contenido}
    placeholder="Cuerpo completo de la colección (soporta formato enriquecido)"
    disabled={isPending}
    className={textareaLargeClass}
  />
  <FieldError message={state?.fieldErrors?.contenido} />
</div>
```

### Checkbox renombrado (`crear-form.tsx`, `editar-form.tsx`)

```tsx
<input
  type="checkbox"
  name="destacada"       {/* ← antes: name="destacado" */}
  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#C8A843] focus:ring-[#C8A843]/30"
/>
```

### Constante LIMITS actualizada

```typescript
const LIMITS = {
  titulo: 300,
  slug: 300,
  extracto: 500,        // NUEVO
  descripcion: 2000,
  contenido: 50000,     // NUEVO
  categoria: 100,
  // ELIMINADO: periodo: 200
} as const
```

---

## 4. Server Actions — Validación editorial y objetos de datos

### 4a. Validación editorial mínima (idéntica en ambas actions)

> **Archivo:** `nueva/actions.ts` — Líneas 113-116  
> **Archivo:** `[id]/editar/actions.ts` — Líneas 118-121

```typescript
// Validación editorial: al menos un campo de contenido
if (!extracto && !descripcion && !contenido) {
  fieldErrors.extracto = 'Al menos uno de Extracto, Descripción o Contenido debe tener texto.'
}
```

### 4b. Objeto exacto pasado a `.insert()` — `crearColeccion`

> **Archivo:** `nueva/actions.ts` — Líneas 130-142

```typescript
const { error: insertError } = await supabase
  .from('colecciones')
  .insert({
    titulo,
    slug,
    extracto: extracto || null,
    descripcion: descripcion || null,
    contenido: contenido || null,
    categoria: categoria || null,
    orden_display,
    published,
    destacada,
  })
```

### 4c. Objeto exacto pasado a `.update()` — `editarColeccion`

> **Archivo:** `[id]/editar/actions.ts` — Líneas 134-148

```typescript
const { error: updateError, count } = await supabase
  .from('colecciones')
  .update({
    titulo,
    slug,
    extracto: extracto || null,
    descripcion: descripcion || null,
    contenido: contenido || null,
    categoria: categoria || null,
    orden_display,
    published,
    destacada,
  })
  .eq('id', id)
```

### 4d. Extracción de campos del FormData (ambas actions)

```typescript
const titulo = getString(formData, 'titulo')
const rawSlug = getString(formData, 'slug')
const extracto = getString(formData, 'extracto')
const descripcion = getString(formData, 'descripcion')
const contenido = getString(formData, 'contenido')
const categoria = getString(formData, 'categoria')
const orden_display = getIntOrNull(formData, 'orden_display')
const published = getBoolean(formData, 'published')
const destacada = getBoolean(formData, 'destacada')
```

---

## 5. Seed — Objeto literal de ejemplo completo

> **Archivo:** `scripts/seed_colecciones.mjs` — Líneas 43-55

```javascript
{
  slug: 'las-siete-edades',
  titulo: 'Las Siete Edades',
  extracto:
    'Recorrido temático por las edades de la Iglesia con enfoque histórico, profético y doctrinal.',
  descripcion:
    'Serie que examina las siete edades de la Iglesia según la revelación bíblica, trazando la línea profética desde Efeso hasta Laodicea.',
  contenido: null,
  categoria: 'Escatología',
  orden_display: 1,
  destacada: true,
  published: true,
},
```

### Campos que NO aparecen en el seed (eliminados):
- ~~`periodo`~~ — No existe en tabla
- ~~`total_materiales`~~ — No existe en tabla
- ~~`destacado`~~ — Renombrado a `destacada`

---

## 6. Build — Confirmación

```
▲ Next.js 16.1.6 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 5.0s
  Running TypeScript ...
  Collecting page data using 5 workers ...
  Generating static pages using 5 workers (16/16) in 526.6ms
  Finalizing page optimization ...

Route (app)
├ ƒ /admin/estudios
├ ƒ /admin/estudios/[id]/editar
├ ○ /admin/estudios/nueva
├ ƒ /estudios
├ ƒ /estudios/[coleccion]

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

Exit code: 0
```

**TypeScript:** 0 errores  
**Warnings:** 0  
**Estado del build:** ✅ Limpio

---

**Antigravity AI**  
Agente de Ejecución Local — Proyecto Legado Patrimonial WSS  
21 de abril de 2026
