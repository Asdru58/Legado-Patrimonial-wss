# PLAN TÉCNICO — FASE 5.8: OPTIMIZACIÓN Y PRUEBAS FINALES

**Clasificación:** Plan de Implementación / Sometido a Auditoría  
**Fecha:** 9 de mayo de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Alcance aprobado por:** Kimi 2.6 — Auditor Senior  
**Triple Firma activada por:** Abg. Asdrúbal Lira — Administrador  
**Estado:** Pendiente de auditoría final del Auditor

---

## 1. OBJETIVO

Cerrar el ciclo de desarrollo del portal Legado Patrimonial WSS resolviendo la deuda técnica acumulada durante las fases 5.1–5.7 y la Fase 5.5 completa. Esta fase NO añade funcionalidad nueva — solo limpia, asegura y verifica lo existente.

---

## 2. ALCANCE APROBADO

| Bloque | Contenido | Estado |
|---|---|---|
| **1** | Limpieza de repositorio | ✅ Aprobado |
| **2** | Seguridad de producción (headers HTTP) | ✅ Aprobado |
| **3** | Auditoría de SEO y metadata | ✅ Aprobado |
| **4** | Reemplazo de `.range(0, 9999)` | ❌ Excluido — diferido a fase posterior con Triple Firma para schema |
| **5** | Accesibilidad y calidad final | ✅ Aprobado |

**Hallazgos adicionales incorporados:**
- H-011: Prohibición formal de carpetas de backup manuales.
- H-012: Verificar y eliminar `pg` de devDependencies si no se usa.

---

## 3. BLOQUE 1 — LIMPIEZA DE REPOSITORIO

### Paso 1.1 — Eliminar carpetas de backup

**Acción:** Eliminar físicamente las siguientes carpetas de la raíz del proyecto:

```
files/
files corregidos/
files database/
files legibilidad/
files reg conference (1)/
layout files/
Nueva/
```

**Comando:**

```powershell
Remove-Item -Recurse -Force "files", "files corregidos", "files database", "files legibilidad", "files reg conference (1)", "layout files", "Nueva"
```

**Verificación:**

```powershell
Get-ChildItem -Path "." -Directory | Where-Object { $_.Name -match "^files|^Nueva|^layout" }
```

Resultado esperado: 0 coincidencias (solo deben quedar `src/`, `public/`, `node_modules/`, `.next/`, `.git/`, `scripts/`).

---

### Paso 1.2 — Eliminar archivos sueltos en la raíz

**Acción:** Verificar si existen `page.tsx` y `conferences.ts` en la raíz del proyecto (fuera de `src/`).

```powershell
Get-ChildItem -Path "." -File -Name | Where-Object { $_ -match "^page\.tsx$|^conferences\.ts$" }
```

Si existen, eliminarlos:

```powershell
Remove-Item -Force "page.tsx", "conferences.ts"
```

---

### Paso 1.3 — Limpiar `tsconfig.json`

**Acción:** Remover las exclusiones que ya no serán necesarias tras la eliminación de los archivos y carpetas:

**Exclusiones a ELIMINAR del array `exclude`:**

```json
"files",
"files database",
"files corregidos",
"files legibilidad",
"files reg conference (1)",
"layout files",
"Nueva",
"page.tsx",
"conferences.ts"
```

**Exclusiones a MANTENER:**

```json
"node_modules",
"scripts"
```

**`exclude` final esperado:**

```json
"exclude": [
    "node_modules",
    "scripts"
]
```

---

### Paso 1.4 — Actualizar `.gitignore`

**Acción:** Añadir reglas preventivas para evitar recontaminación:

```gitignore
# === Prevención de recontaminación (Fase 5.8) ===
# Prohibido crear carpetas de backup manuales en el repo.
# Git es el único sistema de backup. Usar git commit o git stash.
files/
files */
layout files/
Nueva/
backup/
backups/
*.bak
*.backup
*.msi
*.exe
*.dmg
```

---

### Paso 1.5 — Verificar `pg` en devDependencies (H-012)

**Acción:** Buscar si `pg` se importa en algún archivo del proyecto:

```powershell
Select-String -Path "scripts/*.mjs","scripts/*.js","src/**/*.ts","src/**/*.tsx" -Pattern "from 'pg'|require\('pg'\)" -Recurse
```

Si resultado es 0 coincidencias → eliminar `pg` de `devDependencies` en `package.json` y ejecutar `npm install` para actualizar `package-lock.json`.

Si hay coincidencias → reportar en qué archivo y mantener `pg`.

---

### Paso 1.6 — Evaluar tamaño post-limpieza

**Acción:** Tras los pasos 1.1-1.5, medir el tamaño:

```powershell
# Tamaño del working tree (sin .git, node_modules, .next)
Get-ChildItem -Recurse -File -Exclude ".git","node_modules",".next" | Measure-Object -Property Length -Sum | Select-Object Count, @{Name="SizeMB";Expression={[math]::Round($_.Sum/1MB,2)}}

# Tamaño de .git/
Get-ChildItem -Path ".git" -Recurse -File | Measure-Object -Property Length -Sum | Select-Object @{Name="GitSizeMB";Expression={[math]::Round($_.Sum/1MB,2)}}
```

Si `.git/` supera 50 MB, el Administrador evaluará si ejecutar `git filter-repo` para limpiar la historia. Esta decisión la toma el Administrador, no Antigravity.

---

### Paso 1.7 — Directriz formal H-011

**Acción:** Registrar en el informe de cierre la siguiente directriz permanente:

> **DIRECTRIZ H-011 — Prohibición de carpetas de backup manuales**
>
> A partir de la Fase 5.8, queda formalmente prohibido para Antigravity y cualquier agente de ejecución futuro crear carpetas de tipo `files/`, `backup/`, `Nueva/`, `layout files/` o similares en el working tree del repositorio.
>
> Git es el único sistema de backup autorizado. Cualquier operación de respaldo debe hacerse via `git commit`, `git stash` o `git branch`. La creación de carpetas de backup manuales se considerará violación de gobernanza.

---

## 4. BLOQUE 2 — SEGURIDAD DE PRODUCCIÓN

### Paso 2.1 — Headers de seguridad HTTP

**Decisión arquitectónica:** Los headers globales van en `next.config.ts` porque aplican a TODAS las rutas sin excepción. El `middleware.ts` existente se mantiene para lógica condicional por ruta (auth, redirects).

**Acción:** Configurar `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const securityHeaders = [
    {
        key: 'X-Frame-Options',
        value: 'DENY',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
    },
    {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
    },
];

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
```

**Notas:**
- `X-Frame-Options: DENY` → Previene clickjacking (complementa la defensa H-001 del podcast).
- `X-Content-Type-Options: nosniff` → Previene MIME-type sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` → Controla qué información se envía al navegar a sitios externos.
- `Permissions-Policy` → Deshabilita cámara, micrófono, geolocalización y topics de navegación.
- `X-DNS-Prefetch-Control: on` → Mejora rendimiento de resolución DNS.
- **NO se incluye `Strict-Transport-Security`** todavía porque el proyecto opera en `localhost`. Se añadirá cuando se despliegue en HTTPS con dominio real.

---

### Paso 2.2 — Dominios de imágenes

**Acción:** Verificar si algún componente del proyecto usa `<Image>` de `next/image` con URLs externas:

```powershell
Select-String -Path "src/**/*.tsx" -Pattern "from 'next/image'|from \"next/image\"" -Recurse
```

Si resultado es 0 → no se necesita configuración de `images.remotePatterns`. Documentar y cerrar.

Si hay resultados → añadir los dominios correspondientes a `nextConfig.images.remotePatterns`.

---

## 5. BLOQUE 3 — AUDITORÍA DE SEO Y METADATA

### Paso 3.1 — Inventario de metadata por ruta

**Acción:** Antigravity revisa manualmente cada archivo `page.tsx` de rutas públicas y reporta:

| Ruta | Archivo | ¿Tiene metadata? | Tipo | Título | Description |
|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | ¿? | `export const metadata` o `generateMetadata` | ¿? | ¿? |
| `/el-legado` | `src/app/el-legado/page.tsx` | ¿? | — | ¿? | ¿? |
| `/archivo` | `src/app/archivo/page.tsx` | ¿? | — | ¿? | ¿? |
| `/archivo/[year]` | `src/app/archivo/[year]/page.tsx` | ¿? | — | ¿? | ¿? |
| `/archivo/[year]/[month]` | `src/app/archivo/[year]/[month]/page.tsx` | ¿? | — | ¿? | ¿? |
| `/archivo/sin-fecha` | `src/app/archivo/sin-fecha/page.tsx` | ¿? | — | ¿? | ¿? |
| `/archivo/busqueda` | `src/app/archivo/busqueda/page.tsx` | ¿? | — | ¿? | ¿? |
| `/blog` | `src/app/blog/page.tsx` | ¿? | — | ¿? | ¿? |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | ¿? | — | ¿? | ¿? |
| `/estudios` | `src/app/estudios/page.tsx` | ¿? | — | ¿? | ¿? |
| `/estudios/[coleccion]` | `src/app/estudios/[coleccion]/page.tsx` | ¿? | — | ¿? | ¿? |
| `/podcast` | `src/app/podcast/page.tsx` | ¿? | — | ¿? | ¿? |
| `/podcast/[episodio]` | `src/app/podcast/[episodio]/page.tsx` | ¿? | — | ¿? | ¿? |
| `/conferencia/[slug]` | `src/app/conferencia/[slug]/page.tsx` | ¿? | — | ¿? | ¿? |
| `/login` | `src/app/login/page.tsx` | ¿? | — | ¿? | ¿? |

**Entregable:** Tabla completada con los datos reales.

---

### Paso 3.2 — Corregir metadata faltante

Si alguna ruta pública no tiene metadata:

- **Rutas estáticas** (`/`, `/el-legado`, `/archivo`, `/blog`, `/estudios`, `/podcast`): Añadir `export const metadata: Metadata = { title: "...", description: "..." }`.
- **Rutas dinámicas** (`/blog/[slug]`, `/estudios/[coleccion]`, `/podcast/[episodio]`, `/conferencia/[slug]`): Verificar que usen `generateMetadata` con título y description dinámicos.
- **Rutas internas** (`/login`, `/admin/*`): Añadir `robots: { index: false, follow: false }` si no lo tienen.

---

### Paso 3.3 — Layout root metadata

**Acción:** Verificar que `src/app/layout.tsx` tenga metadata base con:

```typescript
export const metadata: Metadata = {
    title: {
        default: 'Legado Patrimonial WSS',
        template: '%s | Legado Patrimonial WSS',
    },
    description: 'Plataforma documental para custodiar, ordenar y transmitir el archivo histórico espiritual de la obra.',
    // ... Open Graph básico si aplica
};
```

El `template` permite que cada página defina solo su título propio y Next.js lo combine automáticamente.

---

## 6. BLOQUE 5 — ACCESIBILIDAD Y CALIDAD FINAL

### Paso 5.1 — Verificar aria-labels en elementos interactivos sin texto

**Acción:** Antigravity revisa manualmente los siguientes componentes y reporta si tienen `aria-label` o texto visible:

| Componente | Elementos a verificar |
|---|---|
| Navbar | Links de navegación, botón de menú móvil |
| PersistentPlayer | Botones play/pause, cerrar, reiniciar, control de progreso |
| SearchBar | Input de búsqueda, botón limpiar |
| ConferenceCard | Botones de acción (audio, detalle) |
| Formularios admin | Todos los inputs con label asociado |
| Paginación | Botones anterior/siguiente/números |

**Entregable:** Lista de elementos sin `aria-label` ni texto visible (si los hay).

---

### Paso 5.2 — Verificación de contraste

**Acción:** Verificar que los colores principales del Design System cumplan ratio mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande):

| Combinación | Foreground | Background | Ratio esperado |
|---|---|---|---|
| Texto primario sobre fondo | `rgba(255,255,255,0.95)` | `#050505` | ~19:1 (excelente) |
| Texto muted sobre fondo | `rgba(255,255,255,0.5)` | `#050505` | ~10:1 (bueno) |
| Dorado sobre fondo | `#D4AF37` | `#050505` | Verificar |
| Texto sobre tarjeta glass | `rgba(255,255,255,0.9)` | `rgba(255,255,255,0.03)` sobre `#050505` | Verificar |

**Herramienta sugerida:** https://webaim.org/resources/contrastchecker/ (verificación manual rápida).

---

### Paso 5.3 — Build final

**Acción:** Tras todos los bloques, ejecutar:

```powershell
npm run build
```

Debe completar con exit code 0, sin errores TypeScript, sin warnings críticos.

---

## 7. ROL DE ANTIGRAVITY

### Autorizado
- Eliminar carpetas de backup y archivos sueltos.
- Limpiar `tsconfig.json` y `.gitignore`.
- Configurar `next.config.ts` con headers de seguridad.
- Auditar metadata y accesibilidad.
- Corregir metadata faltante.
- Verificar y eliminar `pg` de devDependencies si no se usa.
- Ejecutar build final.

### No autorizado
- Modificar base de datos, credenciales, schema o RLS.
- Alterar lógica funcional de ningún módulo (Archivo, Blog, Estudios, Podcast, Conferencias, PersistentPlayer).
- Tocar `.range(0, 9999)` en `conferences.ts` (Bloque 4 excluido).
- Crear carpetas de backup manuales (H-011 vigente).
- Agregar dependencias nuevas.
- Ejecutar `git filter-repo` (decisión del Administrador).

---

## 8. SECUENCIA DE IMPLEMENTACIÓN

| Paso | Acción | Ejecutor |
|---|---|---|
| 1 | Auditoría del plan | Auditor (Kimi 2.6) |
| 2 | Autorización de ejecución | Administrador |
| 3 | Bloque 1: Limpieza de repo (1.1–1.7) | Antigravity |
| 4 | Bloque 2: Headers de seguridad (2.1–2.2) | Antigravity |
| 5 | Bloque 3: Auditoría SEO (3.1–3.3) | Antigravity |
| 6 | Bloque 5: Accesibilidad (5.1–5.2) | Antigravity |
| 7 | Build final (5.3) | Antigravity |
| 8 | Commit + push | Administrador |
| 9 | Evaluación de `.git/` size | Administrador |
| 10 | Informe de cierre de Fase 5.8 | Antigravity |
| 11 | Dictamen de cierre | Auditor |

---

## 9. CRITERIOS DE ÉXITO

| Criterio | Verificación |
|---|---|
| 0 carpetas de backup en el repo | `Get-ChildItem` |
| 0 archivos sueltos en la raíz | `Get-ChildItem` |
| `tsconfig.json` sin exclusiones de backup | Inspección del archivo |
| `.gitignore` con reglas preventivas | Inspección del archivo |
| `pg` eliminado de devDependencies (si no se usa) | `package.json` |
| Headers de seguridad en `next.config.ts` | Inspección del archivo |
| Metadata en todas las rutas públicas | Tabla 3.1 completada |
| `npm run build` exit code 0 | Terminal |
| Directriz H-011 registrada formalmente | Informe de cierre |

---

## 10. EFECTO SOBRE EL PROYECTO

Al completar la Fase 5.8, el proyecto queda en estado **listo para producción**:

- Repositorio limpio (~10 MB working tree estimado post-limpieza).
- Headers de seguridad HTTP configurados.
- Metadata SEO verificada en todas las rutas.
- Accesibilidad básica auditada.
- Build limpio y estable.
- Cero deuda técnica crítica activa (solo `.range(0, 9999)` diferido y documentado).

La única deuda técnica remanente será el Bloque 4 (`.range(0, 9999)`), que queda registrado como tarea para una fase posterior con su propio ciclo de Triple Firma.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
