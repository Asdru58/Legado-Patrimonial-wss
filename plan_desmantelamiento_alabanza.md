# PLAN TÉCNICO — DESMANTELAMIENTO DEL MÓDULO ALABANZA

**Clasificación:** Plan de Desmantelamiento Controlado / Sometido a Auditoría  
**Fecha:** 22 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Origen:** Directriz formal de descope del Administrador (Abg. Asdrúbal Lira)  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. CONTEXTO

El Administrador ha emitido directriz formal de descope definitivo del módulo `/alabanza` del proyecto Legado Patrimonial WSS. La ruta sale del alcance activo y de la Fase 5.5. Política de retirada: **Opción 1 — Eliminación pura, sin redirección.**

Este plan traduce esa directriz a tres fases técnicas ejecutables por Antigravity bajo las restricciones de gobernanza vigentes.

---

## 2. FASE 1 — INVENTARIO EXHAUSTIVO DE REFERENCIAS

### Objetivo

Localizar con precisión todas las referencias activas al módulo Alabanza en el codebase antes de tocar nada. Sin inventario completo no hay eliminación segura.

### Acciones de diagnóstico

Antigravity debe ejecutar las siguientes búsquedas y reportar resultados crudos:

**A. Inventario de archivos de la ruta**

```powershell
Get-ChildItem -Path "src/app/alabanza" -Recurse -Name
```

Resultado esperado: listado de todos los archivos `.tsx`, `.ts`, `.css` dentro de `src/app/alabanza/`.

**B. Inventario de referencias en imports**

Buscar en todo `src/`:

```
from '@/app/alabanza'
from '../alabanza'
import.*alabanza
```

**C. Inventario de enlaces a la ruta**

Buscar en todo `src/`:

```
href="/alabanza
href={`/alabanza
router.push.*alabanza
Link.*alabanza
```

**D. Inventario de menciones textuales**

Buscar en todo `src/` (case-insensitive):

```
alabanza
Alabanza
ALABANZA
```

Esto captura textos de UI, comentarios, metadata, labels de navegación.

**E. Inventario en archivos de configuración**

Revisar específicamente:
- `src/components/layout/navbar.tsx` (o donde esté el navbar principal)
- `src/app/layout.tsx`
- `src/app/sitemap.ts` si existe
- `next.config.js` / `next.config.ts`
- Cualquier archivo de metadata global

**F. Inventario de referencias desde otras portadas**

Revisar específicamente las portadas que pueden tener CTAs o enlaces cruzados a alabanza:
- `src/app/estudios/page.tsx`
- `src/app/podcast/page.tsx`
- `src/app/el-legado/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/page.tsx` (home si existe)

### Entregable de Fase 1

Antigravity entrega un informe crudo con:
- Lista de archivos de `src/app/alabanza/` (con conteo de líneas por archivo).
- Resultados de las búsquedas A-F, archivo por archivo, línea por línea.
- Clasificación de cada referencia como:
  - **Ruta del módulo** (dentro de `src/app/alabanza/`)
  - **Navegación** (item de navbar, sidebar, enlace activo)
  - **Enlace cruzado** (CTA desde otra portada)
  - **Metadata** (título, description, keywords)
  - **Huérfano** (mención residual sin uso real)

**Restricción:** En esta fase Antigravity NO elimina ni modifica nada. Solo diagnostica y reporta.

---

## 3. FASE 2 — ELIMINACIÓN CONTROLADA

### Objetivo

Eliminar todo rastro funcional activo del módulo Alabanza con cirugía precisa, sin dañar el resto del sistema.

### Acciones de ejecución

**Acción 1 — Eliminar la carpeta de la ruta**

```powershell
Remove-Item -Recurse -Force "src/app/alabanza"
```

Esto elimina `src/app/alabanza/page.tsx` y cualquier otro archivo dentro (si existieran subrutas, loading, not-found, etc.).

**Acción 2 — Remover item del navbar/sidebar**

Localizar el archivo de navegación principal y eliminar el item de "Alabanza". Debe ser una eliminación mínima: solo el objeto/entry correspondiente, sin tocar los demás items (Inicio, El Legado, Archivo, Estudios, Podcast).

**Acción 3 — Limpiar enlaces cruzados**

En cada portada identificada en la Fase 1 como poseedora de enlace a `/alabanza`:
- Eliminar el CTA completo si el enlace era el elemento principal del componente.
- Reemplazar el enlace por uno a `/archivo` o `/el-legado` si el CTA tenía valor visual pero el destino debe cambiar.
- **Criterio:** Preservar la estructura visual de cada portada. No se rediseña, solo se corrige el destino o se elimina el item.

**Acción 4 — Eliminar metadata residual**

Si existe metadata global que referencia `/alabanza` (en sitemap, robots, open graph global), removerla.

**Acción 5 — Limpiar menciones textuales huérfanas**

Eliminar comentarios, labels, descripciones o textos que mencionen "Alabanza" si quedan como residuo tras las acciones anteriores.

### Restricciones estrictas para Antigravity

- **NO modificar** la lógica de Archivo, Blog, Estudios, Podcast, Conferencias o PersistentPlayer más allá de retirar referencias directas a Alabanza.
- **NO tocar** base de datos, credenciales, configuración de Supabase.
- **NO agregar** dependencias nuevas.
- **NO rediseñar** portadas. Solo cirugía de extracción.
- **NO reinterpretar** alcance. Si encuentra ambigüedad, reporta y espera instrucción.

### Entregable de Fase 2

Antigravity entrega informe con:
- Lista de archivos eliminados.
- Lista de archivos modificados con diff de cada cambio.
- Confirmación de que cada acción del 1 al 5 fue ejecutada.

---

## 4. FASE 3 — VERIFICACIÓN

### Objetivo

Confirmar que la eliminación fue quirúrgica y no dejó huérfanos ni rompió el sistema.

### Acciones de verificación

**V1 — Build limpio**

```powershell
npm run build
```

Debe completar con exit code 0, sin errores TypeScript ni warnings críticos.

**V2 — Cero referencias residuales**

Re-ejecutar las búsquedas D de la Fase 1:

```
grep -r "alabanza" src/
grep -r "Alabanza" src/
grep -r "ALABANZA" src/
```

Resultado esperado: **0 coincidencias** en todo `src/`.

**V3 — Rutas esperadas en build**

Verificar que las rutas siguientes SIGUEN presentes en el output del build:
- `/` (home)
- `/archivo` y subrutas
- `/blog` y subrutas
- `/estudios` y subrutas
- `/podcast`
- `/el-legado`
- `/admin/*` completo
- `/login`
- `/conferencia/[slug]`

Verificar que la siguiente ruta **NO** aparece:
- `/alabanza` ❌

**V4 — Navegación estable**

Levantar `npm run dev` y verificar:
- El navbar muestra todos los items excepto Alabanza.
- No hay enlaces rotos desde ninguna portada.
- Las 5 rutas del Archivo siguen operativas (revalidación defensiva post-cambio).
- `/blog` y `/estudios` siguen operativas.

### Entregable de Fase 3

Antigravity entrega informe final con:
- Resultado de `npm run build` (exit code y listado de rutas).
- Resultados crudos de las búsquedas V2.
- Confirmación visual o en log de V3 y V4.
- Declaración formal de cierre del desmantelamiento.

---

## 5. CRITERIOS DE ÉXITO

| Criterio | Verificación |
|---|---|
| Carpeta `src/app/alabanza/` no existe | V1 + V3 |
| 0 referencias a "alabanza" en `src/` | V2 |
| Navbar sin item Alabanza | V4 (inspección visual) |
| Ninguna portada enlaza a `/alabanza` | V4 |
| `npm run build` exit code 0 | V1 |
| Rutas activas del resto del sistema intactas | V3 + V4 |
| Fase 5.5 actualizada: queda solo `/podcast/[episodio]` pendiente | Conclusión documental |

---

## 6. ROL DE ANTIGRAVITY

### Autorizado
- Ejecutar las búsquedas de diagnóstico de Fase 1.
- Eliminar la carpeta `src/app/alabanza/` y sus archivos.
- Remover el item "Alabanza" del navbar/sidebar de navegación.
- Limpiar enlaces cruzados desde otras portadas (siguiendo los criterios definidos).
- Eliminar metadata y menciones textuales residuales.
- Ejecutar `npm run build` y búsquedas de verificación.

### No autorizado
- Reinterpretar el alcance del descope.
- Tocar base de datos, credenciales o configuración de Supabase.
- Modificar lógica funcional de módulos activos (Archivo, Blog, Estudios, Podcast, Conferencias, PersistentPlayer) más allá de retirar referencias a Alabanza.
- Rediseñar portadas existentes.
- Agregar dependencias nuevas.
- Continuar en caso de ambigüedad — debe reportar y esperar instrucción.

### Obligatorio
- Ejecutar las tres fases en orden estricto.
- No saltar de Fase 1 a Fase 2 sin entregar el inventario.
- Reportar incidencias o hallazgos inesperados durante la ejecución.

---

## 7. SECUENCIA DE IMPLEMENTACIÓN

| Paso | Acción | Ejecutor |
|---|---|---|
| 1 | Auditoría del presente plan | Auditor (ChatGPT) |
| 2 | Fase 1: Inventario | Antigravity |
| 3 | Revisión del inventario + autorización Fase 2 | Arquitecto + Auditor |
| 4 | Fase 2: Eliminación controlada | Antigravity |
| 5 | Fase 3: Verificación | Antigravity |
| 6 | Revisión del informe final | Arquitecto + Auditor |
| 7 | Dictamen de cierre del descope | Auditor |

---

## 8. EFECTO SOBRE LA FASE 5.5

Al completarse este desmantelamiento:

| Submódulo | Estado |
|---|---|
| Blog | ✅ Cerrado |
| Estudios | ✅ Cerrado |
| **Alabanza** | ❌ **Descopeado — fuera del proyecto** |
| Podcast | ⬜ Pendiente |

La Fase 5.5 queda reducida a un único pendiente dinámico: `/podcast/[episodio]`. Cuando ese submódulo se cierre, la Fase 5.5 completa quedará técnicamente cerrada.

---

## 9. CONSIDERACIONES POSTERIORES AL DESCOPE

No forman parte de este plan, pero quedan como pendientes documentales para el Administrador:

- **Actualización del Master Plan:** El documento original incluía `/alabanza` como hub musical. Debe reflejar el descope.
- **Actualización del informe consolidado de estado del proyecto:** Reflejar que Alabanza queda fuera del alcance.
- **Decisión futura sobre Podcast:** Cuando se aborde, decidir si se mantiene como "estudios doctrinales en diálogo" o también se descopea. Esa decisión es independiente de Alabanza.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS

**Pendiente:** Dictamen del Auditor (ChatGPT) antes de que Antigravity inicie la Fase 1.
