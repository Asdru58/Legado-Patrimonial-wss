# INFORME DE DEUDA TÉCNICA ACUMULADA

**Clasificación:** Diagnóstico previo a Fase 5.8  
**Fecha:** 9 de mayo de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Autorización de inventario:** Abg. Asdrúbal Lira (sin modificación de código)  
**Estado:** Sometido a Triple Firma para planificación de Fase 5.8

---

## 1. RESUMEN EJECUTIVO

El inventario revela **3 problemas críticos, 2 problemas altos y 3 observaciones menores**. El proyecto funciona correctamente en runtime pero arrastra deuda técnica que afecta el peso del repositorio, la seguridad de headers HTTP, y la mantenibilidad del código.

---

## 2. HALLAZGOS CRÍTICOS

### C-001 — Repositorio contaminado con carpetas de backup (1.2 GB)

**Evidencia D1 + D2:**

El repositorio pesa **1,195 MB** (1.2 GB) con **26,448 archivos**. Un proyecto Next.js típico de este tamaño (sin `node_modules` ni `.next`) debería pesar 5-15 MB.

La causa principal son las carpetas de backup que nunca fueron eliminadas físicamente:

```
files/
files corregidos/
files database/
files legibilidad/
files reg conference (1)/
layout files/
Nueva/
  └── files/
      └── files/
          └── files (1)/ ... files (4)/
              └── mnt/user-data/outputs/...
```

Estas carpetas están excluidas del build TypeScript vía `tsconfig.json`, pero **siguen en el repositorio Git**. Esto significa:
- Cada `git clone` descarga 1.2 GB en vez de ~10 MB.
- GitHub puede rechazar pushes si algún archivo individual supera 100 MB.
- La historia de Git contiene estos archivos, inflando el `.git/` incluso si se borran.

**Severidad:** 🔴 CRÍTICA  
**Acción requerida:** Eliminación física de las 7 carpetas + limpieza de la historia de Git con `git filter-repo` si el tamaño post-borrado sigue siendo excesivo.

---

### C-002 — `tsconfig.json` excluye archivos sueltos sospechosos

**Evidencia:** El `tsconfig.json` tiene dos exclusiones inusuales:

```json
"exclude": [
    ...
    "page.tsx",
    "conferences.ts"
]
```

Esto implica que existen archivos `page.tsx` y `conferences.ts` **sueltos en la raíz del proyecto** (fuera de `src/`). Son probablemente archivos legacy que se copiaron durante alguna fase y nunca se eliminaron. El `tsconfig.json` los excluye para que no rompan el build, pero no deberían existir.

**Severidad:** 🔴 CRÍTICA (riesgo de confusión y conflictos)  
**Acción requerida:** Verificar si existen en la raíz. Si sí, eliminarlos. Luego remover las exclusiones del `tsconfig.json`.

---

### C-003 — `next.config.ts` completamente vacío

**Evidencia:**

```typescript
const nextConfig: NextConfig = {
  /* config options here */
};
```

No tiene configuración alguna. Esto significa:
- **Sin headers de seguridad HTTP** (no X-Frame-Options, no Content-Security-Policy, no Strict-Transport-Security).
- **Sin configuración de imágenes** (si alguna página usa `next/image` con URLs externas, fallará).
- **Sin redirects ni rewrites** configurados.
- **Sin compresión ni optimización de output** explícita.

Para un portal que va a producción, la ausencia de headers de seguridad es una exposición real.

**Severidad:** 🔴 CRÍTICA para producción  
**Acción requerida:** Configurar headers de seguridad mínimos, dominios de imágenes si aplica, y opciones de output.

---

## 3. HALLAZGOS ALTOS

### A-001 — `.range(0, 9999)` como parche de paginación

**Evidencia D3, línea 303:**

```typescript
.range(0, 9999)
```

Este parche se aplicó durante la refactorización del Archivo para superar el límite de 1,000 filas del SDK de Supabase en `getConferenciasPorAnio()`. Funciona, pero:
- Asume que nunca habrá más de 10,000 conferencias con fecha.
- Es un hack de fuerza bruta, no paginación real.
- Contradice el principio de carga jerárquica del Master Plan.

**Severidad:** 🟠 ALTA (funcional hoy, frágil mañana)  
**Acción requerida:** Evaluar si reemplazar por un RPC `conteo_por_anio()` en PostgreSQL (como se propuso en el informe de Antigravity sobre la agregación en Node.js). Esto ya estaba documentado como deuda técnica deliberada.

---

### A-002 — Metadata SEO: resultado vacío en búsqueda

**Evidencia D4:** La búsqueda de `export const metadata` y `generateMetadata` devolvió vacío.

**Análisis:** Esto probablemente es un falso negativo del comando PowerShell (el flag `-SimpleMatch` con el patrón puede no haber capturado las variantes reales). Las páginas SÍ tienen metadata — lo vimos en las revisiones de código del blog, estudios y podcast. Sin embargo, conviene verificar:
- Que TODAS las rutas públicas tengan metadata (título + description como mínimo).
- Que las rutas dinámicas usen `generateMetadata` correctamente.
- Que la homepage (`/`) tenga metadata institucional.

**Severidad:** 🟠 ALTA (impacta SEO y compartición social)  
**Acción requerida:** Auditoría manual de metadata en todas las rutas públicas.

---

## 4. OBSERVACIONES MENORES

### M-001 — Accesibilidad: 33 aria-labels

**Evidencia D5:** Se encontraron 33 instancias de `aria-label` en el proyecto.

**Análisis:** Sin un conteo de elementos interactivos totales no puedo determinar si la cobertura es suficiente. Los componentes que revisamos durante las fases (SearchBar, PersistentPlayer, formularios admin) sí tenían aria-labels. Pero conviene verificar:
- Que todos los botones de icono (sin texto visible) tengan `aria-label`.
- Que los formularios tengan labels asociados o `aria-label`.
- Que la navegación principal tenga `aria-label="Navegación principal"` o similar.

**Severidad:** 🟢 MENOR  
**Acción requerida:** Auditoría rápida de accesibilidad en componentes interactivos sin texto visible.

---

### M-002 — Sin `console.log` residuales

**Evidencia D6:** Cero coincidencias en todo `src/`.

**Severidad:** ✅ LIMPIO — Sin acción requerida.

---

### M-003 — Build limpio con rutas correctas

**Evidencia D7:** 31 rutas compiladas, exit code 0. Todas las rutas esperadas presentes. Sin rutas fantasma. `/alabanza` ausente (confirmación del descope).

**Severidad:** ✅ LIMPIO — Sin acción requerida.

---

## 5. ESTADO DE `package.json`

**Dependencias de producción (7):**

| Dependencia | Versión | Estado |
|---|---|---|
| `@supabase/ssr` | ^0.8.0 | ✅ Correcta |
| `@supabase/supabase-js` | ^2.98.0 | ✅ Correcta |
| `lucide-react` | ^1.0.1 | ✅ Correcta |
| `next` | 16.1.6 | ✅ Correcta |
| `react` | 19.2.3 | ✅ Correcta |
| `react-dom` | 19.2.3 | ✅ Correcta |
| `zustand` | ^5.0.11 | ✅ Correcta |

**Dependencias de desarrollo (8):**

| Dependencia | Versión | Estado |
|---|---|---|
| `@tailwindcss/postcss` | ^4 | ✅ Correcta |
| `@types/node` | ^20 | ✅ Correcta |
| `@types/react` | ^19 | ✅ Correcta |
| `@types/react-dom` | ^19 | ✅ Correcta |
| `eslint` | ^9 | ✅ Correcta |
| `eslint-config-next` | 16.1.6 | ✅ Correcta |
| `pg` | ^8.20.0 | ✅ En devDependencies (correcto post-saneamiento) |
| `tailwindcss` | ^4 | ✅ Correcta |

**Veredicto:** Sin dependencias innecesarias, sin duplicados, `pg` correctamente en devDependencies.

---

## 6. PROPUESTA DE ALCANCE PARA FASE 5.8

Basado en los hallazgos, propongo organizar la Fase 5.8 en 5 bloques de trabajo:

### Bloque 1 — Limpieza de repositorio (C-001, C-002)
- Eliminar las 7+ carpetas de backup físicamente.
- Eliminar archivos sueltos de la raíz (`page.tsx`, `conferences.ts`) si existen.
- Limpiar las exclusiones del `tsconfig.json`.
- Evaluar `git filter-repo` si el `.git/` sigue pesado.
- Actualizar `.gitignore` para prevenir recontaminación.

### Bloque 2 — Seguridad de producción (C-003)
- Configurar `next.config.ts` con headers de seguridad HTTP mínimos:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restrictiva
  - `Strict-Transport-Security` (cuando se despliegue en HTTPS)
- Configurar dominios de imágenes si `next/image` los necesita.

### Bloque 3 — Auditoría de SEO y metadata (A-002)
- Verificar metadata en TODAS las rutas públicas.
- Asegurar que rutas dinámicas usen `generateMetadata`.
- Verificar Open Graph tags para compartición en redes sociales.

### Bloque 4 — Evaluación de `.range(0, 9999)` (A-001)
- Decidir si se reemplaza por RPC `conteo_por_anio()` o se documenta como limitación aceptada.
- Si se reemplaza, requiere modificación de schema (RPC nueva) → Triple Firma obligatoria.

### Bloque 5 — Accesibilidad y calidad final (M-001)
- Auditoría rápida de aria-labels en componentes interactivos.
- Verificación de contraste de colores del Design System.
- Prueba de navegación por teclado en rutas críticas.

---

## 7. SOLICITUD A LOS AUDITORES Y AL ADMINISTRADOR

1. **Validar** este informe como diagnóstico completo y preciso.
2. **Aprobar o ajustar** el alcance propuesto para la Fase 5.8 (5 bloques).
3. **Definir prioridades:** ¿Se ejecutan los 5 bloques? ¿Se descartan algunos? ¿Se añaden otros?
4. **Activar Triple Firma** para la Fase 5.8 con el alcance aprobado.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
