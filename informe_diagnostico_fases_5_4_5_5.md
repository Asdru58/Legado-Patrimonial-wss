# INFORME DE DIAGNÓSTICO — FASES 5.4 Y 5.5 + PROPUESTA DE SANEAMIENTO

**Clasificación:** Informe Técnico / Solicitud de Directriz  
**Fecha:** 10 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Dirigido a:** ChatGPT — Auditor de Código y Base de Datos  
**Conocimiento:** Abg. Asdrúbal Lira — Administrador del Proyecto

---

## 1. DIAGNÓSTICO DE LA FASE 5.4 — PersistentPlayer

**Estado: IMPLEMENTADA AL 100%**

Tras revisión línea por línea de `PersistentPlayer.tsx` (390+ líneas), `playerStore.ts` (580+ líneas) y `storage.ts` (230+ líneas), se confirma que el reproductor persistente cumple todas las especificaciones del Master Plan:

| Requisito del Master Plan | Estado |
|---|---|
| Persistencia con localStorage (4 claves: `lp_current_track`, `lp_playback_position`, `lp_playback_updated`, `lp_history`) | ✅ Implementado |
| Guardar posición al pausar o cerrar pestaña | ✅ Implementado (`beforeunload`, `pagehide`, `visibilitychange`) |
| Restaurar posición al recargar | ✅ Implementado (seek en `handleLoadedMetadata`) |
| Historial Espiritual: últimos 20 mensajes, FIFO, umbral de 30 segundos | ✅ Implementado |
| Zustand como estado global | ✅ Implementado con persist middleware |

**Deuda técnica identificada:** El archivo `src/lib/storage.ts` duplica funcionalidad que el store ya internalizó. Es código legacy que puede causar inconsistencias si es importado por error.

**Dictamen:** Fase 5.4 cerrada. No requiere intervención funcional.

---

## 2. DIAGNÓSTICO DE LA FASE 5.5 — Páginas de Contenido

**Estado: PORTADAS EDITORIALES COMPLETAS — RUTAS DE DETALLE PENDIENTES**

| Página | Contenido | Datos | Enlaces rotos |
|---|---|---|---|
| `/el-legado` | Institucional completo: pilares, misión, principios, trayectoria | Estáticos (contenido real, no lorem ipsum) | Ninguno |
| `/estudios` | Hub con 6 colecciones temáticas | Mockeados (declarados como "contrato provisional") | `/estudios/[coleccion]` no existe |
| `/alabanza` | Hub musical con 6 colecciones + 3 pistas destacadas | Mockeados | `/alabanza/[slug]` no existe. Botones de reproducción deshabilitados |
| `/podcast` | Hub editorial con 6 episodios + 3 series | Mockeados | Botones de reproducción deshabilitados |
| `/blog` | Sala de lectura con 6 artículos | Mockeados | `/blog/[slug]` no existe |

**Observaciones:**

- Todas las páginas respetan el Design System (dark mode, glassmorphism, dorado #D4AF37).
- El código es limpio, con metadata SEO, aria-labels, y secciones semánticas.
- Los datos mockeados están estructurados fuera de los componentes, lo que facilita la futura migración a datos dinámicos.
- Los enlaces a rutas de detalle (`/estudios/[coleccion]`, `/blog/[slug]`, etc.) son callejones sin salida que devuelven 404.

**Dictamen:** Las portadas están completas como landing pages estáticas. Lo pendiente es el tejido conectivo: rutas dinámicas de detalle y conexión con datos reales.

---

## 3. DEUDA TÉCNICA CONFIRMADA

| Elemento | Riesgo | Prioridad |
|---|---|---|
| `src/lib/storage.ts` | Duplica funcionalidad del store. Puede causar desincronización si se importa por error | Alta — eliminar |
| `src/lib/supabase-client.ts` vs `src/lib/supabase/client.ts` | Dos clientes browser coexistiendo. No está claro cuál es el canónico | Alta — consolidar |
| `src/lib/supabase-server.ts` vs `src/lib/supabase/server.ts` | Dos clientes server coexistiendo | Alta — consolidar |
| `src/services/conferences.ts` vs `src/lib/services/conferences.ts` | Dos servicios de conferencias. El de `lib/` es el activo post-refactorización | Alta — eliminar el legacy |
| `src/types/database.ts` | Probablemente no refleja el schema post-R-3 (normalize_slug, fecha_rango, defaults) | Media — actualizar |
| `pg` en `package.json` | Dependencia de scripts de datos que no debe ser accesible al runtime del frontend | Media — mover a devDependencies o eliminar |

---

## 4. PROPUESTA: SANEAMIENTO DE NÚCLEO ANTES DE NUEVAS FUNCIONALIDADES

### Justificación

Construir rutas dinámicas nuevas (`/estudios/[coleccion]`, `/blog/[slug]`) sobre un codebase con archivos legacy duplicados, tipos desactualizados y dependencias innecesarias aumenta el riesgo de bugs silenciosos y dificulta la auditoría de código futuro.

### Plan de saneamiento en 3 pasos

**Paso 1 — Eliminación de código legacy**

Archivos a eliminar:

- `src/lib/storage.ts` — Duplicado del store.
- `src/lib/supabase-client.ts` — Reemplazado por `src/lib/supabase/client.ts`.
- `src/lib/supabase-server.ts` — Reemplazado por `src/lib/supabase/server.ts`.
- `src/services/conferences.ts` — Reemplazado por `src/lib/services/conferences.ts`.

Antes de eliminar, verificar que ningún archivo activo los importe. Si hay imports, redirigirlos al archivo canónico.

**Paso 2 — Actualización de tipos**

Regenerar o actualizar manualmente `src/types/database.ts` para reflejar:

- Las 21 columnas actuales de `conferencias`.
- Los constraints añadidos en R-3 (relevantes para validación de tipos).
- Los defaults de `video_provider` y `video_status`.
- La relación con `series` y `conferencia_tematicas`.

**Paso 3 — Limpieza de dependencias**

- Mover `pg` a `devDependencies` en `package.json` (los scripts de datos lo necesitan pero el frontend no debe accederlo en runtime).
- Verificar que no haya imports de `pg` desde `src/`.

### Rol de Antigravity

**Autorizado:** Eliminar archivos legacy, redirigir imports, actualizar `database.ts`, modificar `package.json`.

**No autorizado:** Alterar schema, modificar lógica de componentes funcionales, agregar dependencias.

### Criterios de éxito

| Criterio | Verificación |
|---|---|
| 0 archivos legacy en `src/lib/` o `src/services/` | Revisión de directorio |
| 0 imports a archivos eliminados | Búsqueda global |
| `types/database.ts` refleja schema post-R-3 | Revisión manual |
| `pg` fuera de `dependencies` | Inspección de `package.json` |
| `npm run build` pasa sin errores | Ejecución en terminal |
| `npm run dev` + las 5 rutas del archivo siguen funcionando | Prueba manual |

---

## 5. SOLICITUD AL AUDITOR

1. **Dictamen de cierre** sobre la Fase 5.4 (PersistentPlayer).
2. **Evaluación** del estado de la Fase 5.5 (portadas completas, rutas de detalle pendientes).
3. **Aprobación o ajuste** del plan de saneamiento de núcleo como paso previo a cualquier nueva funcionalidad.
4. **Definición de prioridades:** ¿Saneamiento primero, o rutas dinámicas de contenido primero?

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
