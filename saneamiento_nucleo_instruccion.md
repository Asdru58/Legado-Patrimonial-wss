# INSTRUCCIÓN OPERATIVA — SANEAMIENTO DE NÚCLEO

**Clasificación:** Orden de Ejecución  
**Fecha:** 10 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Dirigido a:** Antigravity AI — Agente de Ejecución Local

---

## CONTEXTO

Antes de construir nuevas rutas dinámicas, el codebase necesita limpieza de archivos legacy duplicados, actualización de tipos y reubicación de dependencias. Este saneamiento fue aprobado por Arquitecto, Auditor y Administrador.

---

## PASO 1 — ELIMINACIÓN DE CÓDIGO LEGACY

### Archivos a eliminar

| Archivo legacy | Reemplazado por |
|---|---|
| `src/lib/storage.ts` | Funcionalidad internalizada en `src/store/playerStore.ts` |
| `src/lib/supabase-client.ts` | `src/lib/supabase/client.ts` |
| `src/lib/supabase-server.ts` | `src/lib/supabase/server.ts` |
| `src/services/conferences.ts` | `src/lib/services/conferences.ts` |

### Procedimiento obligatorio ANTES de eliminar

1. Ejecutar búsqueda global en todo el proyecto por cada archivo legacy:
   - Buscar `from '@/lib/storage'` o `from '../lib/storage'`
   - Buscar `from '@/lib/supabase-client'` o `from '../lib/supabase-client'`
   - Buscar `from '@/lib/supabase-server'` o `from '../lib/supabase-server'`
   - Buscar `from '@/services/conferences'` o `from '../services/conferences'`

2. Si algún archivo activo importa desde un legacy:
   - Redirigir el import al archivo canónico correspondiente.
   - Verificar que la API exportada sea compatible (mismos nombres de funciones/tipos).
   - Si hay diferencia de API, documentar y reportar antes de proceder.

3. Solo después de confirmar 0 imports activos al legacy, eliminar el archivo.

### Entregable del Paso 1

- Lista de imports encontrados y redirigidos (si los hubo).
- Confirmación de archivos eliminados.
- Resultado de `npm run build` tras la eliminación.

---

## PASO 2 — ACTUALIZACIÓN DE TIPOS

### Archivo a actualizar

`src/types/database.ts`

### Qué debe reflejar

El archivo debe contener los tipos TypeScript que correspondan al schema actual de `public.conferencias` post-R-3:

```typescript
export type Conferencia = {
    id: string;                          // uuid, PK
    slug: string;                        // text, NOT NULL, UNIQUE
    titulo: string;                      // text, NOT NULL
    extracto: string | null;             // text
    descripcion: string | null;          // text
    fecha_impartida: string | null;      // date (como ISO string)
    ponente_nombre: string | null;       // text
    ponente_rol: string | null;          // text
    audio_url: string | null;            // text
    audio_duracion: number | null;       // integer (>= 0)
    pdf_url: string | null;             // text
    video_provider: string;              // text, NOT NULL, default 'none'
    video_provider_id: string | null;    // text
    video_fallback_provider: string | null; // text ('r2' | 's3' | null)
    video_fallback_url: string | null;   // text
    video_status: string;                // text, NOT NULL, default 'pending'
    video_checked_at: string | null;     // timestamptz
    fts: unknown | null;                 // tsvector (no se usa directamente en frontend)
    created_at: string;                  // timestamptz, NOT NULL
    updated_at: string;                  // timestamptz, NOT NULL
    serie_id: string | null;             // uuid, FK a series
};
```

### Consideraciones

- Si `database.ts` contiene otros tipos además de `Conferencia` (por ejemplo tipos para `series`, `conferencia_tematicas`, o tipos de Supabase Auth), conservarlos y solo actualizar lo que corresponda a `conferencias`.
- Si el archivo usa el generador de tipos de Supabase (`supabase gen types`), documentar que la generación automática no está disponible sin Docker y que la actualización fue manual.
- Verificar que los tipos exportados coincidan con lo que consumen los componentes existentes. Si algún componente usa un campo que no existe en el tipo actualizado, reportar.

### Entregable del Paso 2

- Archivo `database.ts` actualizado.
- Lista de cambios respecto a la versión anterior.
- Resultado de `npm run build` tras la actualización (para verificar compatibilidad de tipos).

---

## PASO 3 — LIMPIEZA DE DEPENDENCIAS

### Acción principal

Mover `pg` de `dependencies` a `devDependencies` en `package.json`.

```json
// ANTES (en dependencies):
"pg": "^8.20.0"

// DESPUÉS (en devDependencies):
"pg": "^8.20.0"
```

### Verificación obligatoria

Buscar en todo `src/` cualquier import de `pg`:
- Buscar `from 'pg'`
- Buscar `require('pg')`

Si existe algún import de `pg` dentro de `src/`, reportar sin eliminar. El frontend no debe importar `pg` en runtime, pero los scripts en `scripts/` sí pueden hacerlo.

### Entregable del Paso 3

- `package.json` con `pg` movido.
- Resultado de búsqueda de imports de `pg` en `src/`.
- Resultado de `npm run build` final.

---

## VALIDACIÓN FINAL

Después de completar los 3 pasos, ejecutar:

1. `npm run build` — Debe completar sin errores.
2. `npm run dev` — Levantar el servidor.
3. Verificar estas 5 rutas en el navegador:
   - `/archivo` — Debe mostrar décadas/años con conteo.
   - `/archivo/2010` — Debe mostrar meses de 2010.
   - `/archivo/2010/08` — Debe mostrar conferencias de agosto 2010.
   - `/archivo/sin-fecha` — Debe listar 20 de 22.
   - `/archivo/busqueda?query=truenos` — Debe devolver resultados FTS.

Si alguna ruta falla tras el saneamiento, reportar sin intentar arreglar.

---

## QUÉ NO DEBES HACER

- No modificar el schema de la base de datos.
- No alterar lógica funcional de componentes que ya funcionan.
- No agregar dependencias nuevas.
- No crear archivos nuevos (excepto si se requiere un barrel export de reemplazo).
- No modificar `conferences.ts` (ya fue limpiado en pasos 8-9 de la refactorización).
- No interpretar resultados ni emitir veredictos.

---

## FORMATO DE ENTREGA

```
SANEAMIENTO DE NÚCLEO — REPORTE
================================
PASO 1 — Eliminación de legacy
  Imports encontrados y redirigidos: [lista o "ninguno"]
  Archivos eliminados: [lista]
  npm run build: [PASS/FAIL]

PASO 2 — Actualización de tipos
  Cambios en database.ts: [resumen]
  npm run build: [PASS/FAIL]

PASO 3 — Limpieza de dependencias
  pg movido a devDependencies: [SÍ/NO]
  Imports de pg en src/: [lista o "ninguno"]
  npm run build: [PASS/FAIL]

VALIDACIÓN FINAL
  npm run build: [PASS/FAIL]
  /archivo: [OK/FAIL]
  /archivo/2010: [OK/FAIL]
  /archivo/2010/08: [OK/FAIL]
  /archivo/sin-fecha: [OK/FAIL]
  /archivo/busqueda?query=truenos: [OK/FAIL]
================================
```

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS

**Aprobaciones:**  
- Arquitecto (Claude): ✅  
- Auditor (ChatGPT): ✅  
- Administrador (Abg. Asdrúbal Lira): ✅
